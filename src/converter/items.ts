import AdmZip from "adm-zip";
import path from 'path';
import * as models from './models';
import * as archives from '../util/archives';
import * as files from '../util/files';
import * as progress from '../util/progress';
import { BlockModel, ItemModel, Model } from "../types/java/model";
import minecraftData from 'minecraft-data'
import { GeyserPredicateBuilder, ItemEntry } from "../types/converter/items";
import { MessageType, statusMessage } from "../util/console";
import { MovedTexture } from "../types/mappings";
import { createSpriteSheet } from "../util/atlases";
import { SpriteSheet } from "../types/util/atlases";
import sharp from "sharp";
import { Config } from "../util/config";

export async function convertItems(inputAssets: AdmZip, convertedAssets: AdmZip, defaultAssets: AdmZip, version: string, movedTextures: MovedTexture[], attachableMaterial: Config['atachableMaterial']): Promise<void> {
    // Scan for vanilla items
    const vanillaItems = await scanVanillaItems(inputAssets, defaultAssets);

    // Scan for predicates
    const predicateItems = await scanPredicates(vanillaItems, inputAssets, defaultAssets, version, convertedAssets, movedTextures);

    // Construct texture sheets
    const sheets = await constructTextureSheets(predicateItems, inputAssets, defaultAssets, convertedAssets);

    // Write items
    await writeItems(predicateItems, sheets, convertedAssets, attachableMaterial);
    console.log('[DEBUG] done');
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
                        model.textures = validatedTextures(model);
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

                        if (!movedTexturesArr.includes(textures[0])) {
                            archives.insertRawInZip(convertedAssets, [{ file: files.javaToBedrockTexturePath(textures[0]), data: spriteBuffer }]);
                            bedrockTexture = files.javaToBedrockTexturePath(textures[0]);
                        }
                    } else if (uniqueTextures.size === 1 && movedTexturesArr.includes(textures[0])) {
                        bedrockTexture = files.javaToBedrockTexturePath(textures[0]);
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
    statusMessage(MessageType.Process, 'Creating item atlases...')
    const bar = progress.defaultBar();
    bar.start(atlases.length, 0, { prefix: 'Item Atlases' });
    for (const atlas of atlases) {
        const hash = files.arrayHash(atlas);
        bar.update({ prefix: hash });
        const sheet = await createSpriteSheet(inputAssets, defaultAssets, atlas, convertedAssets, `textures/item_atlases/${hash}.png`);
        sheets.push(sheet);
        bar.increment();
    }
    bar.stop();
    statusMessage(MessageType.Completion, `Created ${atlases.length} item atlases`)

    return sheets;
}

function validatedTextures(model: BlockModel | ItemModel): Model.Textures {
    const usedTextures = new Set(
        (model.elements || [])
            .flatMap(element => Object.values(element.faces || {}))
            .filter(face => face != null)
            .map(face => face!.texture.slice(1))
    );
    return Object.fromEntries(
        Object.entries(model.textures || {})
            .filter(([key]) => usedTextures.has(key))
    );
}

async function writeItems(predicateItems: ItemEntry[], sprites: SpriteSheet[], convertedAssets: AdmZip, attachableMaterial: Config['atachableMaterial']) {
    for (const item of predicateItems) {
        const textureValues = Object.values(item.model.textures || {}).map(t => files.pathFromTextureEntry(t));
        const sheet: SpriteSheet | null = sprites.find(sprite => {
            return Object.keys(sprite.frames).some(frameKey => {
                return textureValues.includes(frameKey);
            });
        }) ?? null;
        let texture = 'textures/misc/missing_texture';

        if (item.bedrockTexture != null) {
            texture = files.extensionlessPath(item.bedrockTexture);
        } else if (sheet != null) {
            texture = files.extensionlessPath(sheet.meta.image);
        }

        const geometry = await models.generateItemGeometry(item, sheet);
        archives.insertRawInZip(convertedAssets, [{ file: `models/geyser_custom/${item.hash}.geo.json`, data: Buffer.from(JSON.stringify(geometry)) }]);

        const animation = await models.generateAnimation(item);
        archives.insertRawInZip(convertedAssets, [{ file: `animations/geyser_custom/${item.hash}.animation.json`, data: Buffer.from(JSON.stringify(animation)) }]);

        const attachable = await models.generateAttachable(item, attachableMaterial, texture);
        archives.insertRawInZip(convertedAssets, [{ file: `attachables/geyser_custom/${item.hash}.attachable.json`, data: Buffer.from(JSON.stringify(attachable)) }]);
    }
}