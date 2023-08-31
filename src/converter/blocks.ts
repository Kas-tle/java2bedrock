import AdmZip from "adm-zip";
import * as archives from '../util/archives';
import * as files from '../util/files';
import * as models from './models';
import { Mappings, MovedTexture } from "../types/mappings";
import { Config } from "../util/config";
import minecraftData from "minecraft-data";
import { BlockState } from "../types/java/blockstate";
import path from "path";
import { BlockStateCondition, BlockStateWithPath, InterimBlockModelMap, InterimStateMaps, McDataState, StateModel, VariantGroup, VariantGroups } from "../types/converter/blocks";
import { BlockBuilder, GeyserMappings, MaterialInstanceBuilder, RootBlockBuilder } from "../types/converter/mappings";
import { TerrainAtlas } from "../types/bedrock/texture";
import { BlockModel } from "../types/java/model";
import { MessageType, statusMessage } from "../util/console";

export async function convertBlocks(inputAssets: AdmZip, convertedAssets: AdmZip, defaultAssets: AdmZip, mergeAssets: AdmZip | null, movedTextures: MovedTexture[], config: Config) {
    const inputVanillaBlockStates = await scanInputVanillaBlockStates(inputAssets, defaultAssets);

    const variantGroups = await groupVariants(inputVanillaBlockStates, config);
    files.writeJsonFile(path.join(process.cwd(), 'target', 'variant_groups.json'), variantGroups);

    await writeBlocks(variantGroups, inputAssets, defaultAssets, convertedAssets, mergeAssets, movedTextures);
}

async function scanInputVanillaBlockStates(inputAssets: AdmZip, defaultAssets: AdmZip): Promise<InterimStateMaps> {
    const vanillaBlockStatePaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/blockstates', '.json');
    const inputBlockStatePaths = archives.listFilePathsInZip(inputAssets, 'assets/minecraft/blockstates', '.json');
    const validBlockStatePaths = inputBlockStatePaths.filter(p => vanillaBlockStatePaths.includes(p));

    const vanillaBlockPaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/models/block', '.json');
    const inputBlockPaths = archives.listFilePathsInZip(inputAssets, 'assets/minecraft/models/block', '.json');
    const validBlockPaths = inputBlockPaths.filter(p => vanillaBlockPaths.includes(p));
    const namespacedBlockEntries = validBlockPaths.map(p => files.modelEntryFromPath(p));

    const noOverrideBlockStatePaths = vanillaBlockStatePaths.filter(p => !validBlockStatePaths.includes(p));
    const noOverrideBlockStates = await Promise.all(noOverrideBlockStatePaths.map(async p => (
        { path: p, state: await archives.parseJsonFromZip<BlockState>(defaultAssets, p) }
    )))

    const vanillaModelAssociations = findModelAssociations(noOverrideBlockStates, namespacedBlockEntries);

    const blockStateOverrides = await Promise.all(validBlockStatePaths.map(async p => (
        { path: p, state: await archives.parseJsonFromZip<BlockState>(inputAssets, p) }
    )))

    return { overrides: blockStateOverrides, vanilla: vanillaModelAssociations};
}

export function findModelAssociations(states: BlockStateWithPath[], modelStrings: string[]): Map<string, BlockStateCondition[]> {
    const associations = new Map<string, BlockStateCondition[]>();

    states.forEach(({ state, path: p }) => {
        // If the blockstate is of Variants type
        if ('variants' in state) {
            Object.entries(state.variants).forEach(([key, stateOrArray]) => {
                modelStrings.forEach(model => {
                    const stateArray = Array.isArray(stateOrArray) ? stateOrArray : [stateOrArray];
                    if (stateArray.some(s => s.model === model)) {
                        const entry: BlockStateCondition = {
                            condition: key,
                            state: stateOrArray,
                            path: p
                        };
                        if (!associations.has(model)) {
                            associations.set(model, []);
                        }
                        associations.get(model)!.push(entry);
                    }
                });
            });
        }

        // If the blockstate is of Multipart type
        if ('multipart' in state) {
            state.multipart.forEach(({ when, apply }) => {
                modelStrings.forEach(model => {
                    const stateArray = Array.isArray(apply) ? apply : [apply];
                    if (stateArray.some(s => s.model === model)) {
                        const entry: BlockStateCondition = {
                            condition: when || {},
                            state: apply,
                            path: p
                        };
                        if (!associations.has(model)) {
                            associations.set(model, []);
                        }
                        associations.get(model)!.push(entry);
                    }
                });
            });
        }
    });

    // Filter out entries with empty BlockStateCondition arrays
    modelStrings.forEach(model => {
        const conditions = associations.get(model);
        if (conditions && conditions.length === 0) {
            associations.delete(model);
        }
    });

    return associations;
}

async function groupVariants(vanillaBlockStates: InterimStateMaps, config: Config): Promise<VariantGroups> {
    const variantGroups: VariantGroups = {};
    const mcData = minecraftData(config.defaultAssetVersion!);

    for (const [_key, value] of vanillaBlockStates.vanilla) {
        const blockNames = value.map(v => path.basename(v.path, '.json'));
        nextVanillaBlock: for (const blockName of blockNames) {
            const blockData = mcData.blocksByName[blockName];
            if (blockData == null) {
                continue;
            }
            const vanillaStatesData = blockData.states;
    
            if (vanillaStatesData != null) {
                const vanillaStates = generateAllStates(vanillaStatesData);
    
                const usedStateStrings: string[] = [];
                variantGroups[blockName] = [];
    
                for (const condition of value) {
                    if (condition.condition instanceof Object) {
                        const part = { when: condition.condition, apply: condition.state };
                        const shouldContinue = processMultiPartState(blockName, part, variantGroups, vanillaStates, usedStateStrings);
                        if (!shouldContinue) {
                            continue nextVanillaBlock;
                        }
                    } else if (typeof condition.condition === "string") {
                        const shouldContinue = processVariantState(blockName, condition.condition, condition.state, variantGroups, vanillaStates, usedStateStrings);
                        if (!shouldContinue) {
                            continue nextVanillaBlock;
                        }
                    }
                }
            }
        }
    }

    nextOverrideBlock: for (const entry of vanillaBlockStates.overrides) {
        const state = entry.state;
        const blockName = path.basename(entry.path, '.json');
        const blockData = mcData.blocksByName[blockName];
        if (blockData == null) {
            continue;
        }
        const vanillaStatesData = blockData.states;

        if (vanillaStatesData != null) {
            const vanillaStates = generateAllStates(vanillaStatesData);

            const usedStateStrings: string[] = [];
            variantGroups[blockName] = [];
            if ("multipart" in state) {
                // Construct corresponding standard state strings from multipart entries
                // const part of state.multipart
                for (const part of state.multipart) {
                    const shouldContinue = processMultiPartState(blockName, part, variantGroups, vanillaStates, usedStateStrings);
                    if (!shouldContinue) {
                        continue nextOverrideBlock;
                    }
                }
            } else if ("variants" in state) {
                for (const [key, value] of Object.entries(state.variants)) {
                    const shouldContinue = processVariantState(blockName, key, value, variantGroups, vanillaStates, usedStateStrings);
                    if (!shouldContinue) {
                        continue nextOverrideBlock;
                    }
                }
            }
        }
    }

    return variantGroups;
}

function processVariantState(blockName: string, key: string, value: BlockState.State | BlockState.State[],  variantGroups: VariantGroups, vanillaStates: Record<string, string>[], usedStateStrings: string[]): boolean {
    if (key === "") {
        const variantGroup = getVariantGroup(value, true);
        variantGroups[blockName].push(variantGroup);
        return false;
    }
    const possibleState = getPossibleVariantState(key);
    const filteredStates = vanillaStates.filter(vanillaState => matchesPossibleState(vanillaState, possibleState));
    const stateStrings = statesToStrings(filteredStates);
    stateStrings.filter(s => !usedStateStrings.includes(s));
    if (stateStrings.length === 0) {
        return true;
    }
    usedStateStrings.push(...stateStrings);
    const variantGroup = getVariantGroup(value, stateStrings);
    variantGroups[blockName].push(variantGroup);
    return true;
}

function processMultiPartState(blockName: string, part: BlockState.Part, variantGroups: VariantGroups, vanillaStates: Record<string, string>[], usedStateStrings: string[]): boolean {
    const when = part.when;
    const apply = part.apply;

    if (when == null || Object.keys(when).length === 0) {
        const variantGroup = getVariantGroup(apply, true);
        variantGroups[blockName].push(variantGroup);
        return false;
    } else if ("OR" in when && when.OR instanceof Array) {
        // Find all vanilla states that match the OR condition
        const possibleStates = getPossibleMultiStates(when.OR);
        const orFilteredStates = vanillaStates.filter(vanillaState => matchesAny(vanillaState, possibleStates));
        const stateStrings = statesToStrings(orFilteredStates);
        stateStrings.filter(s => !usedStateStrings.includes(s));
        if (stateStrings.length === 0) {
            return true;
        }
        usedStateStrings.push(...stateStrings);
        const variantGroup = getVariantGroup(apply, stateStrings);
        variantGroups[blockName].push(variantGroup);
    } else if ("AND" in when && when.AND instanceof Array) {
        // Find all vanilla states that match the AND condition
        const possibleStates = getPossibleMultiStates(when.AND);
        const andFilteredStates = vanillaStates.filter(vanillaState => matchesAll(vanillaState, possibleStates));
        const stateStrings = statesToStrings(andFilteredStates);
        stateStrings.filter(s => !usedStateStrings.includes(s));
        if (stateStrings.length === 0) {
            return true;
        }
        usedStateStrings.push(...stateStrings);
        const variantGroup = getVariantGroup(apply, stateStrings);
        variantGroups[blockName].push(variantGroup);
    } else if (!("OR" in when || "AND" in when)) {
        const possibleState = getPossibleMultiState(when);
        const filteredStates = vanillaStates.filter(vanillaState => matchesPossibleState(vanillaState, possibleState));
        const stateStrings = statesToStrings(filteredStates);
        stateStrings.filter(s => !usedStateStrings.includes(s));
        if (stateStrings.length === 0) {
            return true;
        }
        usedStateStrings.push(...stateStrings);
        const variantGroup = getVariantGroup(apply, stateStrings);
        variantGroups[blockName].push(variantGroup);
    }
    return true;
}

function generateStateValues(state: McDataState): string[] {
    switch (state.type) {
        case "bool":
            return ["true", "false"];
        case "enum":
        case "direction":
            return (state.values as string[]).map(v => v.toLowerCase()) || [];
        case "int":
            return state.num_values ? Array.from({ length: state.num_values }, (_, i) => i.toString()) : [];
    }
}

function generateAllStates(states: McDataState[], currentIndex = 0, currentCombo: Record<string, string> = {}): Record<string, string>[] {
    if (currentIndex === states.length) {
        return [currentCombo];
    }

    const current = states[currentIndex];
    const values = generateStateValues(current);
    let result: Record<string, string>[] = [];

    for (const value of values) {
        const newCombo = { ...currentCombo, [current.name]: value };
        result = result.concat(generateAllStates(states, currentIndex + 1, newCombo));
    }

    return result;
}

function statesToStrings(states: Record<string, string>[]): string[] {
    return states.map(stateToString);
}

function stateToString(state: Record<string, string>): string {
    return Object.entries(files.sortedObject(state)).map(([key, value]) => `${key}=${value}`).join(",");
}

function getVariantGroup(apply: BlockState.State | BlockState.State[], stateStrings: string[] | true): VariantGroup {
    const model = apply instanceof Array ? apply.map(s => {
        return { model: files.namespaceEntry(s.model), x: s.x, y: s.y, uvlock: s.uvlock, weight: s.weight };
    }) : apply;

    return { stateStrings, model };
}

function getPossibleMultiStates(complexWhen: Record<string, string>[]): Record<string, string[]>[] {
    const conditions: Record<string, string[]>[] = [];

    for (const condition of complexWhen) {
        const innerConditions = getPossibleMultiState(condition);
        conditions.push(innerConditions);
    }

    return conditions;
}

function getPossibleMultiState(condition: Record<string, string>): Record<string, string[]> {
    const innerConditions: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(condition)) {
        innerConditions[key] = value.split("|");
    }
    return innerConditions;
}

function getPossibleVariantState(variant: string): Record<string, string[]> {
    const conditions: Record<string, string[]> = {};
    for (const condition of variant.split(",")) {
        const [key, value] = condition.split("=");
        conditions[key] = [value]
    }
    return conditions;
}

function matchesPossibleState(vanillaState: Record<string, string>, possibleState: Record<string, string[]>): boolean {
    return Object.keys(possibleState).every(key => {
        const possibleValues = possibleState[key];
        return possibleValues.includes(vanillaState[key]);
    });
}

function matchesAny(vanillaState: Record<string, string>, possibleStates: Record<string, string[]>[]): boolean {
    return possibleStates.some(possibleState => matchesPossibleState(vanillaState, possibleState));
}

function matchesAll(vanillaState: Record<string, string>, possibleStates: Record<string, string[]>[]): boolean {
    return possibleStates.every(possibleState => matchesPossibleState(vanillaState, possibleState));
}

async function writeBlocks(variantGroups: VariantGroups, inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip, mergeAssets: AdmZip | null, movedTextures: MovedTexture[]) {
    const movedTexturesArr = movedTextures.map(t => t.file);
    const modelPaths = Object.values(variantGroups)
        .flat()
        .map(variantGroup => variantGroup.model)
        .flat()
        .map(model => files.pathFromModelEntry((model as StateModel).model))
        .filter((value, index, self) => self.indexOf(value) === index);

    const blockTextures: TerrainAtlas = {
        resource_pack_name: "vanilla",
        texture_name: "atlas.terrain",
        texture_data: {}
    };

    const interimBlockModelMap: InterimBlockModelMap = {};
    
    // First move all textures and convert geometries
    for (const modelPath of modelPaths) {
        const hash = files.stringHash(modelPath);
        try {
            const model = await archives.parseJsonFromZip<BlockModel>(inputAssets, modelPath);
            const builder = new BlockBuilder()

            if (model.parent != null) {
                exit:
                while ((model.elements == null || model.textures == null) && model.parent != null) {
                    // Special parent handling
                    // Material instances must be mapped to different UV keys per model
                    // Then skip geometry conversion
                    switch(files.namespaceEntry(model.parent)) {
                        case 'block/cube':
                        case 'minecraft:block/cube':
                            // 
                        case 'block/cube_all':
                        case 'minecraft:block/cube_all':
                            //
                        case 'block/cube_bottom_top':
                        case 'minecraft:block/cube_bottom_top':
                            //
                        case 'block/cube_column':
                        case 'minecraft:block/cube_column':
                            //
                        case 'block/cube_column_horizontal':
                        case 'minecraft:block/cube_column_horizontal':
                            //
                        case 'block/cube_column_mirrored':
                        case 'minecraft:block/cube_column_mirrored':
                            //
                        case 'block/cube_column_uv_locked_x':
                        case 'minecraft:block/cube_column_uv_locked_x':
                            //
                        case 'block/cube_column_uv_locked_y':
                        case 'minecraft:block/cube_column_uv_locked_y':
                            //
                        case 'block/cube_column_uv_locked_z':
                        case 'minecraft:block/cube_column_uv_locked_z':
                            //
                        case 'block/cube_directional':
                        case 'minecraft:block/cube_directional':
                            //
                        case 'block/cube_mirrored':
                        case 'minecraft:block/cube_mirrored':
                            //
                        case 'block/cube_mirrored_all':
                        case 'minecraft:block/cube_mirrored_all':
                            //
                        case 'block/cube_north_west_mirrored':
                        case 'minecraft:block/cube_north_west_mirrored':
                            //
                        case 'block/cube_north_west_mirrored_all':
                        case 'minecraft:block/cube_north_west_mirrored_all':
                            //
                        case 'block/cube_top':
                        case 'minecraft:block/cube_top':
                            //
                        builder.unitCube(true);
                    }

                    const parentModel: BlockModel = await archives.parseJsonFromZip<BlockModel>(inputAssets, files.pathFromModelEntry(model.parent), defaultAssets);
                    model.parent = parentModel.parent;

                    if (model.parent == null) {
                        break exit;
                    }

                    model.elements = model.elements ?? parentModel.elements;
                    model.textures = model.textures ?? parentModel.textures;
                }
            }

            const materialInstances: Record<string, GeyserMappings.MaterialInstance> = {};
            // TODO: obtain proper render method per block (in actual mappings generator, not here)
            const materialBuilder = new MaterialInstanceBuilder().renderMethod("alpha_test");

            model.textures = models.validatedTextures(model)

            if (model.textures != null) {
                for (const [key, value] of Object.entries(model.textures)) {
                    const texturePath = files.pathFromTextureEntry(value);
                    let bedrockTexturePath = files.bedrockPathFromTextureEntry(value);
                    const textureHash = files.stringHash(texturePath);
                    materialInstances[key] = materialBuilder.texture(`g_${textureHash}`).build();

                    if (movedTexturesArr.includes(texturePath)) {
                        bedrockTexturePath = movedTextures.find(t => t.file === texturePath)!.path;
                    } else {
                        archives.transferFromZip(inputAssets, convertedAssets, [{file: texturePath, path: bedrockTexturePath}]);
                    }

                    blockTextures.texture_data[`g_${textureHash}`] = {
                        textures: [bedrockTexturePath]
                    };
                }
            }

            const geometry = await models.generateBlockGeometry(hash, model);
            archives.insertRawInZip(convertedAssets, [{ file: `models/blocks/geyser_custom/${hash}.geo.json`, data: Buffer.from(JSON.stringify(geometry)) }]);

            const components = builder
                .geometry(`geometry.geyser_custom.geo_${hash}`)
                .materialInstances(materialInstances)
                .build();
            
            interimBlockModelMap[modelPath] = {
                model,
                hash,
                components
            };
        } catch (error) {
            statusMessage(MessageType.Critical, `Failed to block convert model ${modelPath}: ${error}`)
        }
    }

    const blockMappings: GeyserMappings.Blocks = {};

    for (const [block, groups] of Object.entries(variantGroups)) {
        const rootBuilder = new RootBlockBuilder()
            .name(block)
            .onlyOverrideStates(true);
        const builder = new BlockBuilder();
        for (const group of groups) {
            if (group.stateStrings === true) {
                rootBuilder.onlyOverrideStates(false);
            }
        }
    }
}