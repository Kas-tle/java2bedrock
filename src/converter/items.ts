import AdmZip from "adm-zip";
import path from 'path';
import detectTSNode from "detect-ts-node";
import * as models from './models';
import * as archives from '../util/archives';
import * as files from '../util/files';
import * as progress from '../util/progress';
import { ItemModel, Model } from "../types/java/model";
import minecraftData from 'minecraft-data'
import { GeyserPredicateBuilder, ItemEntry } from "../types/converter/items";
import { MessageType, statusMessage } from "../util/console";
import { Mappings, MovedTexture } from "../types/mappings";
import { createSpriteSheet, loadImages } from "../util/atlases";
import { SpriteSheet } from "../types/util/atlases";
import sharp from "sharp";
import { Config } from "../util/config";
import { GeyserMappings } from "../types/converter/mappings";
import { Worker } from 'worker_threads';
import os from 'os';
import { ItemAtlas } from "../types/bedrock/texture";

const MISSING_TEXTURE = 'textures/misc/missing_texture';

export async function convertItems(inputAssets: AdmZip, convertedAssets: AdmZip, defaultAssets: AdmZip, mergeAssets: AdmZip | null, movedTextures: MovedTexture[], config: Config, itemMappings: Mappings['itemMappings']): Promise<GeyserMappings.Items> {
    // Scan for vanilla items
    const vanillaItems = await scanVanillaItems(inputAssets, defaultAssets);

    // Scan for predicates
    const predicateItems = await scanPredicates(vanillaItems, inputAssets, defaultAssets, config.defaultAssetVersion!, convertedAssets, movedTextures);

    // Construct texture sheets
    const sheets = await constructTextureSheets(predicateItems, inputAssets, defaultAssets, convertedAssets);

    // Write items
    const mappings = await writeItems(predicateItems, sheets, convertedAssets, config, mergeAssets, itemMappings);

    return mappings;
}

async function scanVanillaItems(inputAssets: AdmZip, defaultAssets: AdmZip): Promise<{ path: string, model: ItemModel }[]> {
    const vanillaItemPaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/models/item', '.json');
    const inputItemPaths = archives.listFilePathsInZip(inputAssets, 'assets/minecraft/models/item', '.json');
    const validItemPaths = inputItemPaths.filter(p => vanillaItemPaths.includes(p));

    return await Promise.all(validItemPaths.map(async p => (
        { path: p, model: await archives.parseJsonFromZip<ItemModel>(inputAssets, p) }
    )));
}

async function scanPredicates(vanillaItems: { path: string, model: ItemModel }[], inputAssets: AdmZip, defaultAssets: AdmZip, version: string, convertedAssets: AdmZip, movedTextures: MovedTexture[]): Promise<ItemEntry[]> {
    const predicates: ItemEntry[] = [];
    const mcData = minecraftData(version);
    const movedTexturesArr = movedTextures.map(t => t.file);

    for (const vanillaItem of vanillaItems) {
        const item = path.basename(vanillaItem.path, '.json');
        if (vanillaItem.model.overrides != null) {
            for (const override of vanillaItem.model.overrides) {
                const predicate = new GeyserPredicateBuilder();

                if (override.predicate.damage != null && mcData.itemsByName[item].maxDurability != null) {
                    predicate.damage(Math.ceil(override.predicate.damage * mcData.itemsByName[item].maxDurability!));
                }

                if (override.predicate.damaged != null && mcData.itemsByName[item].maxDurability != null) {
                    predicate.unbreakable(override.predicate.damaged === 0 ? true : false)
                }

                if (override.predicate.custom_model_data != null) {
                    predicate.custom_model_data(override.predicate.custom_model_data);
                }

                if (override.predicate.lefthanded != null) {
                    predicate.lefthanded(override.predicate.lefthanded);
                }

                handleSpecialPredicates(item, version, predicate, override);

                try {
                    const model = await archives.parseJsonFromZip<ItemModel>(inputAssets, files.pathFromModelEntry(override.model), defaultAssets);
                    let sprite = false;
                    if (model.parent != null) {
                        exit:
                        while ((model.elements == null || model.textures == null || model.display == null) && model.parent != null) {
                            // Special parent handling
                            switch (files.namespaceEntry(model.parent)) {
                                case 'minecraft:builtin/generated':
                                    if (model.elements == null) {
                                        sprite = true;
                                        break exit;
                                    }
                                case 'minecraft:builtin/entity':
                                    break exit;
                            }

                            const parentModel: ItemModel = await archives.parseJsonFromZip<ItemModel>(inputAssets, files.pathFromModelEntry(model.parent), defaultAssets);
                            model.parent = parentModel.parent;

                            if (model.parent == null) {
                                break;
                            }

                            model.elements = model.elements ?? parentModel.elements;
                            model.textures = model.textures ?? parentModel.textures;
                            model.display = model.display ?? parentModel.display;
                        }
                    }

                    if (!sprite) {
                        model.textures = models.validatedTextures(model);
                    }
                    
                    const sortedJavaTextures = files.sortedObject(model.textures ?? {})
                    const textures = Object.values(sortedJavaTextures).map(t => files.pathFromTextureEntry(t));
                    const uniqueTextures = new Set(textures);

                    let bedrockTexture: string | undefined = undefined;
                    if (sprite) {
                        // Send the sprite to convertedAssets
                        let spriteBuffer: Buffer;
                        
                        if (uniqueTextures.size > 1) {
                            let baseImage = sharp(archives.getBufferFromZip(inputAssets, textures[0], defaultAssets));
                            for (let i = 1; i < textures.length; i++) {
                                baseImage = baseImage.composite([{ input: archives.getBufferFromZip(inputAssets, textures[i], defaultAssets) }]);
                            }
                            spriteBuffer = await baseImage.png().toBuffer();
                        } else {
                            spriteBuffer = archives.getBufferFromZip(inputAssets, textures[0], defaultAssets);
                        }

                        if (movedTexturesArr.includes(textures[0])) {
                            bedrockTexture = movedTextures.find(t => t.file === textures[0])!.path;
                        } else {
                            archives.insertRawInZip(convertedAssets, [{ file: files.javaToBedrockTexturePath(textures[0]), data: spriteBuffer }]);
                            bedrockTexture = files.javaToBedrockTexturePath(textures[0]);
                        }
                    } else if (uniqueTextures.size === 1 && movedTexturesArr.includes(textures[0])) {
                        bedrockTexture = movedTextures.find(t => t.file === textures[0])!.path;
                    }

                    const path = files.pathFromModelEntry(override.model);
                    const overrides = predicate.build();
                    const hash = files.objectHash({path, overrides});

                    predicates.push({
                        item,
                        overrides,
                        path,
                        model,
                        sprite,
                        hash,
                        textures,
                        uniqueTextures,
                        bedrockTexture
                    });
                } catch (error) {
                    statusMessage(MessageType.Critical, `Failed to parse model ${files.namespaceEntry(override.model)} for item ${item}: ${error}`);
                }
            }
        }
    }
    return predicates;
}

function handleSpecialPredicates(item: string, version: string, builder: GeyserPredicateBuilder, override: Model.Overrides) {
    const mcData = minecraftData(version);

    if ((mcData.itemsByName[item].enchantCategories ?? []).includes('armor')) {
        // trim_type
        if (override.predicate.trim_type != null) {
            builder.trim_type(override.predicate.trim_type);
        }
        return;
    }
    switch (item) {
        case 'compass':
        case 'recovery_compass':
            // angle
            if (override.predicate.angle != null) {
                builder.angle(override.predicate.angle);
            }
            break;
        case 'shield':
            // blocking
            if (override.predicate.blocking != null) {
                builder.blocking(override.predicate.blocking);
            }
            break;
        case 'elytra':
            // broken
            if (override.predicate.broken != null) {
                builder.broken(override.predicate.broken);
            }
            break;
        case 'fishing_rod':
            // cast
            if (override.predicate.cast != null) {
                builder.cast(override.predicate.cast);
            }
            break;
        case 'ender_pearl':
        case 'chorus_fruit':
        case 'popped_chorus_fruit':
            // cooldown
            if (override.predicate.cooldown != null) {
                builder.cooldown(override.predicate.cooldown);
            }
            break;
        case 'crossbow':
            // charged
            // firework
            if (override.predicate.charged != null) {
                builder.charged(override.predicate.charged);
            }
            if (override.predicate.firework != null) {
                builder.firework(override.predicate.firework);
            }
        case 'bow':
            // pull
            // pulling
            if (override.predicate.pull != null) {
                builder.pull(override.predicate.pull);
            }
            if (override.predicate.pulling != null) {
                builder.pulling(override.predicate.pulling);
            }
            break;
        case 'trident':
            // throwing
            if (override.predicate.throwing != null) {
                builder.throwing(override.predicate.throwing);
            }
            break;
        case 'clock':
            // time
            if (override.predicate.time != null) {
                builder.time(override.predicate.time);
            }
            break;
        case 'light':
            // level
            if (override.predicate.level != null) {
                builder.level(override.predicate.level);
            }
            break;
        case 'bundle':
            // filled
            if (override.predicate.filled != null) {
                builder.filled(override.predicate.filled);
            }
            break;
        case 'goat_horn':
            // tooting
            if (override.predicate.tooting != null) {
                builder.tooting(override.predicate.tooting);
            }
            break;
        case 'brush':
            // brushing
            if (override.predicate.brushing != null) {
                builder.brushing(override.predicate.brushing);
            }
            break;
    }
}

async function constructTextureSheets(predicateItems: ItemEntry[], inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip): Promise<SpriteSheet[]> {
    const atlases: string[][] = [];
    for (const item of predicateItems) {
        if (item.uniqueTextures.size === 0) {
            continue;
        }

        if (item.bedrockTexture != null) {
            // we already have a texture so we don't need an atlas
            continue;
        }

        // Check if any of the textures are contained in an existing atlas or multiple atlases
        const containedAtlases = atlases
            .map((a, index) => ({ index, textures: a.filter(t => item.uniqueTextures.has(t)) }))
            .filter(a => a.textures.length > 0)
            .map(a => a.index);

        if (containedAtlases.length > 0) {
            // Create a combined atlas from the contained atlases and the item textures
            const combinedAtlas: Set<string> = new Set();
            for (const i of containedAtlases) {
                for (const texture of atlases[i]) {
                    combinedAtlas.add(texture);
                }
            }
            for (const texture of item.uniqueTextures) {
                combinedAtlas.add(texture);
            }

            // Remove the contained atlases from the atlases array
            for (const i of containedAtlases) {
                atlases.splice(i, 1);
            }

            // Add the combined atlas to the atlases array
            atlases.push(Array.from(combinedAtlas).sort());
        } else {
            // Otherwise just create a new atlas
            atlases.push(Array.from(item.uniqueTextures).sort());
        }
    }

    // Create sprite sheets from the atlases
    const sheets: SpriteSheet[] = [];
    const numCPUs = detectTSNode ? Math.floor(os.cpus().length  / 3) : os.cpus().length - 2;
    const multithreaded = numCPUs > 1;
    statusMessage(MessageType.Process, 'Creating item atlases...')
    const bar = progress.defaultBar();
    bar.start(atlases.length, 0, { prefix: 'Item Atlases' });

    if (multithreaded) {
        // Multi threaded
        await (async () => {
            const atlasWorkers: Worker[] = [];
            interface Result {
                file: string;
                data: Buffer;
                sheet: SpriteSheet;
            }
            const results: Result[] = [];
            let finishedTasks = 0;
    
            let resolveAllTasksCompleted: () => void;
            const allTasksCompleted = new Promise<void>((resolve) => {
                resolveAllTasksCompleted = resolve;
            });
    
            function handleWorkerMessage(result: Result) {
                results.push(result);
                finishedTasks++;
                bar.increment();
    
                if (finishedTasks === atlases.length) {
                    resolveAllTasksCompleted();
                }
            }
    
            function handleError(error: any) {
                console.error("Worker encountered an error:", error);
                // handle error appropriately here
                statusMessage(MessageType.Error, `Worker encountered an error on atlas generation: ${error}`);
            }
    
            for (let i = 0; i < numCPUs; i++) {
                const worker = files.importWorker('../util/workers/atlases', {});
                worker.on('message', handleWorkerMessage);
                worker.on('error', handleError);
                atlasWorkers.push(worker);
            }
    
            const tasks = atlases.map(async (atlas, index) => {
                const hash = files.arrayHash(atlas);
                const worker = atlasWorkers[index % numCPUs];
                const images = await loadImages(inputAssets, atlas, defaultAssets);
            
                worker.postMessage({
                    images,
                    outputPath: `textures/item_atlases/${hash}.png`,
                });
            });
            
            await Promise.all(tasks);
    
            await allTasksCompleted;
    
            // Process results here, after all tasks have completed
            for (const result of results) {
                archives.insertRawInZip(convertedAssets, [{ file: result.file, data: result.data }]);
                sheets.push(result.sheet);
                bar.stop();
            }
        })();
    } else {
        // Single threaded
        for (const atlas of atlases) {
            const hash = files.arrayHash(atlas);
            bar.update({ prefix: hash });
            const images = await loadImages(inputAssets, atlas, defaultAssets);
            const sheet = await createSpriteSheet(images, `textures/item_atlases/${hash}.png`);
            archives.insertRawInZip(convertedAssets, [{ file: sheet.file, data: sheet.data }]);
            sheets.push(sheet.sheet);
            bar.increment();
        }
    }

    bar.stop();
    statusMessage(MessageType.Completion, `Created ${atlases.length} item atlases`)

    return sheets;
}

async function writeItems(predicateItems: ItemEntry[], sprites: SpriteSheet[], convertedAssets: AdmZip, config: Config, mergeAssets: AdmZip | null, itemMappings: Mappings['itemMappings']): Promise<GeyserMappings.Items> {
    const mappings: GeyserMappings.Items = {};
    const itemTextures: ItemAtlas = {
        resource_pack_name: "geyser_custom",
        texture_name: "atlas.items",
        texture_data: {
            missing: {
                textures: "textures/blocks/sandstone_top"
            }
        }
    };

    for (const item of predicateItems) {
        const textureValues = Object.values(item.model.textures || {}).map(t => files.pathFromTextureEntry(t));
        const sheet: SpriteSheet | null = sprites.find(sprite => {
            return Object.keys(sprite.frames).some(frameKey => {
                return textureValues.includes(frameKey);
            });
        }) ?? null;
        let texture = MISSING_TEXTURE;

        if (item.bedrockTexture != null) {
            texture = files.extensionlessPath(item.bedrockTexture);
        } else if (sheet != null) {
            texture = files.extensionlessPath(sheet.meta.image);
        }

        const geometry = await models.generateItemGeometry(item, sheet);
        archives.insertRawInZip(convertedAssets, [{ file: `models/entity/${item.hash}.geo.json`, data: Buffer.from(JSON.stringify(geometry)) }]);

        const animation = await models.generateAnimation(item);
        archives.insertRawInZip(convertedAssets, [{ file: `animations/geyser_custom/${item.hash}.animation.json`, data: Buffer.from(JSON.stringify(animation)) }]);

        const attachable = await models.generateAttachable(item, config.atachableMaterial, texture);
        archives.insertRawInZip(convertedAssets, [{ file: `attachables/geyser_custom/${item.hash}.attachable.json`, data: Buffer.from(JSON.stringify(attachable)) }]);

        let icon = undefined;
        if (item.sprite && item.bedrockTexture != null) {
            icon = `g_${item.hash}`;
            itemTextures.texture_data[icon] = {
                textures: files.extensionlessPath(item.bedrockTexture)
            };
        }
        if (config.spriteMappings != null && mergeAssets != null) {
            const spriteMappings = config.spriteMappings[item.item];
            const spriteMapping = spriteMappings ? spriteMappings.find(s => files.objectsEqual(s.overrides, item.overrides)) : null;
            if (spriteMapping != null) {
                icon = `g_${item.hash}`;
                itemTextures.texture_data[icon] = {
                    textures: files.extensionlessPath(spriteMapping.sprite)
                };
                const filePath = path.join(files.pathFromTextureEntry(spriteMapping.sprite), '.png');
                archives.transferFromZip(mergeAssets, convertedAssets, [{ file: filePath, path: filePath }]);
            }
        }
        if (icon == null) {
            icon = itemMappings.icons[item.item] != null ? itemMappings.icons[item.item].icon : 'missing';
        }

        const itemMapping: GeyserMappings.Item = {
            name: `g_${item.hash}`,
            allow_off_hand: true,
            icon,
            custom_model_data: item.overrides.custom_model_data,
            damage_predicate: item.overrides.damage,
            unbreakable: item.overrides.unbreakable
        };

        mappings[`minecraft:${item.item}`] == null ? mappings[`minecraft:${item.item}`] = [] : '';
        mappings[`minecraft:${item.item}`].push(itemMapping);
    }

    const itemTexturesCount = Object.keys(itemTextures.texture_data).length - 1;
    if (itemTexturesCount > 0) {
        if (mergeAssets != null) {
            try {
                const existingItemTextures = await archives.parseJsonFromZip<ItemAtlas>(mergeAssets, 'textures/item_texture.json');
                itemTextures.texture_data = {...existingItemTextures.texture_data, ...itemTextures.texture_data}
            } catch(e) {
                // no-op
            }
        }
        archives.insertRawInZip(convertedAssets, [{ file: 'textures/item_texture.json', data: Buffer.from(JSON.stringify(itemTextures)) }]);
        statusMessage(MessageType.Completion, `Inserted ${itemTexturesCount} mapped icons into item atlas`);
    }

    return mappings;
}