import AdmZip from "adm-zip";
import path from 'path';
import * as models from './models';
import * as archives from '../util/archives';
import * as files from '../util/files';
import { ItemModel, Model } from "../types/java/model";
import minecraftData from 'minecraft-data'
import { GeyserPredicateBuilder, ItemEntry, ItemEntryBuilder } from "../types/converter/items";
import { MessageType, statusMessage } from "../util/console";
import { Mappings, MovedTexture } from "../types/mappings";
import sharp from "sharp";
import { Config } from "../util/config";
import { GeyserMappings } from "../types/converter/mappings";
import { Worker } from 'worker_threads';
import { ItemAtlas } from "../types/bedrock/texture";

const MISSING_TEXTURE = 'textures/misc/missing_texture';

export async function convertItems(inputAssets: AdmZip, convertedAssets: AdmZip, defaultAssets: AdmZip, mergeAssets: AdmZip | null, movedTextures: MovedTexture[], config: Config, itemMappings: Mappings['itemMappings']): Promise<GeyserMappings.Items> {
    // Scan for vanilla items
    const vanillaItems = await scanVanillaItems(inputAssets, defaultAssets);

    // Scan for predicates
    const predicateItems = await scanPredicates(vanillaItems, inputAssets, defaultAssets, config.defaultAssetVersion!, convertedAssets, movedTextures);

    // Write animations
    await writeAnimations(predicateItems, inputAssets, defaultAssets, convertedAssets);

    // Write textures
    await writeTextures(predicateItems, inputAssets, defaultAssets, convertedAssets, movedTextures);

    // Write geometries
    await writeGeometries(predicateItems, inputAssets, defaultAssets, convertedAssets);

    // Write items
    const mappings = await writeItems(predicateItems, convertedAssets, config, mergeAssets, itemMappings, movedTextures);

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

/**
 * A new approach for textures:
 * Currently, we atlas all textures which is costly for performance
 * We do this because we were operating under the assumption that we could only use one texture per attachable
 * However, there is a way out of this
 * Using multiple render controllers, we can render multiple geometries per attachable at the same time
 * Since each of these geometries has a seperate render controller, it can have its own texture
 * So, what we need to do is create a geometry for each texture entry in our model
 * This will even give us the freedom to support UV animation in theory
 * It also means we can parent properly now
 * So there will now instead of the current system, predicates will first be scanned for, and we will identify parents for:
 * - textures
 * - elements
 * - display settings
 */
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
                    const modelPath = files.pathFromModelEntry(override.model);
                    const model = await archives.parseJsonFromZip<ItemModel>(inputAssets, modelPath, defaultAssets);

                    let sprite = false;
                    const itemEntry = new ItemEntryBuilder()
                        .item(item)
                        .elementsPath(modelPath)
                        .displayPath(modelPath)
                        .texturesPath(modelPath);

                    if (model.parent != null) {
                        exit: while ((model.elements == null || model.textures == null || model.display == null) && model.parent != null) {
                            // Special parent handling
                            switch (files.namespaceEntry(model.parent)) {
                                case 'minecraft:builtin/generated':
                                    if (model.elements == null) {
                                        sprite = true;
                                        itemEntry
                                            .sprite(sprite)
                                            .texturesPath('')
                                            .elementsPath('');
                                        break exit;
                                    }
                                case 'minecraft:builtin/entity':
                                    break exit;
                            }

                            const parentPath = files.pathFromModelEntry(model.parent);
                            const parentModel: ItemModel = await archives.parseJsonFromZip<ItemModel>(inputAssets, parentPath, defaultAssets);
                            model.parent = parentModel.parent;

                            if (model.parent == null) {
                                break;
                            }

                            if (model.elements == null) {
                                model.elements = parentModel.elements;
                                itemEntry.elementsPath(parentPath);
                            }

                            if (model.textures == null) {
                                model.textures = parentModel.textures;
                                itemEntry.texturesPath(parentPath);
                            }

                            if (model.display == null) {
                                model.display = parentModel.display;
                                itemEntry.displayPath(parentPath);
                            }
                        }
                    }

                    if (!sprite) {
                        model.textures = models.validatedTextures(model);
                    }

                    const sortedJavaTextures = files.sortedObject(model.textures ?? {})
                    const textures = Object.values(sortedJavaTextures).map(t => files.pathFromTextureEntry(t));

                    if (sprite) {
                        // Send the sprite to convertedAssets
                        const uniqueTextures = new Set(textures);

                        if (uniqueTextures.size > 1) {
                            let hashSrc: string = '';
                            let baseImage = sharp(archives.getBufferFromZip(inputAssets, textures[0], defaultAssets));

                            for (let i = 1; i < textures.length; i++) {
                                baseImage = baseImage.composite([{ input: archives.getBufferFromZip(inputAssets, textures[i], defaultAssets) }]);
                                hashSrc += textures[i];
                            }

                            const spriteBuffer = await baseImage.png().toBuffer();
                            const bedrockTexture = `textures/geyser_custom/${files.stringHash(hashSrc)}.png`;
                            archives.insertRawInZip(convertedAssets, [{ file: bedrockTexture, data: spriteBuffer }]);
                            itemEntry.bedrockTexture(bedrockTexture);
                        } else {
                            if (movedTexturesArr.includes(textures[0])) {
                                itemEntry.bedrockTexture(movedTextures.find(t => t.file === textures[0])!.path);
                            } else {
                                const bedrockTexture = `textures/geyser_custom/${files.stringHash(textures[0])}.png`;
                                const spriteBuffer = archives.getBufferFromZip(inputAssets, textures[0], defaultAssets);
                                archives.insertRawInZip(convertedAssets, [{ file: bedrockTexture, data: spriteBuffer }]);
                                itemEntry.bedrockTexture(bedrockTexture);
                            }
                        }
                    }

                    const overrides = predicate.build();
                    const entryPath = files.pathFromModelEntry(override.model);

                    itemEntry
                        .overrides(overrides)
                        .path(files.pathFromModelEntry(override.model))
                        .model(model)
                        .hash(files.objectHash({ entryPath, overrides }))
                        .textureKeyMap(texturesToMap(model.textures ?? {}));

                    predicates.push(itemEntry.build());
                } catch (error) {
                    statusMessage(MessageType.Critical, `Failed to parse model ${files.namespaceEntry(override.model)} for item ${item}: ${error}`);
                }
            }
        }
    }
    return predicates;
}

function texturesToMap(textures: Model.Textures): Map<string, string[]> {
    const textureEntries = Object.entries(textures).map(([key, value]) => {
        return [key, files.pathFromTextureEntry(value)];
    });

    const textureMap = textureEntries.reduce<Map<string, string[]>>(
        (acc, [key, value]) => {
            if (!acc.has(value)) {
                acc.set(value, []);
            }
            acc.get(value)!.push(key);
            return acc;
        },
        new Map()
    );

    return textureMap;
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

async function writeAnimations(predicateItems: ItemEntry[], inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip): Promise<void> {
    const displayPaths = new Set(predicateItems.map(i => i.displayPath));

    for (const path of displayPaths) {
        try {
            const model = await archives.parseJsonFromZip<ItemModel>(inputAssets, path, defaultAssets);
            const pathHash = files.stringHash(path);
            const animation = await models.generateAnimation(model.display, pathHash);
            archives.insertRawInZip(convertedAssets, [{ file: `animations/geyser_custom/${pathHash}.animation.json`, data: Buffer.from(JSON.stringify(animation)) }]);
        } catch (error) {
            statusMessage(MessageType.Critical, `Failed to parse display ${path}: ${error}`);
        }
    }

    statusMessage(MessageType.Completion, `Inserted ${displayPaths.size} animations`);
}

async function writeTextures(predicateItems: ItemEntry[], inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip, movedTextures: MovedTexture[]): Promise<void> {
    const textureSrcPaths = new Set(predicateItems.map(i => i.texturesPath).filter(p => p != ''));
    const movedTexturesArr = movedTextures.map(t => t.file);

    for (const path of textureSrcPaths) {
        const model = await archives.parseJsonFromZip<ItemModel>(inputAssets, path, defaultAssets);
        const textures = (model.textures ?? {});

        nextTexture: for (const texture of Object.values(textures)) {
            try {
                const texturePath = files.pathFromTextureEntry(texture);
                if (movedTexturesArr.includes(texturePath)) {
                    continue nextTexture;
                }
                const textureHash = files.stringHash(texturePath);
                const textureBuffer = archives.getBufferFromZip(inputAssets, texturePath, defaultAssets);
                archives.insertRawInZip(convertedAssets, [{ file: `textures/geyser_custom/${textureHash}.png`, data: textureBuffer }]);
            } catch (error) {
                statusMessage(MessageType.Critical, `Failed to copy texture ${texture}: ${error}`);
            }
        }
    }

    statusMessage(MessageType.Completion, `Inserted ${textureSrcPaths.size} textures`);
}

async function writeGeometries(predicateItems: ItemEntry[], inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip): Promise<void> {
    const elementsPaths = new Set(predicateItems.map(i => i.elementsPath).filter(p => p != ''));

    for (const path of elementsPaths) {
        try {
            const model = await archives.parseJsonFromZip<ItemModel>(inputAssets, path, defaultAssets);
            const textureKeyMap = texturesToMap(model.textures ?? {});
            const geoHash = files.stringHash(path);

            for (const [texture, textureKeys] of textureKeyMap) {
                const textureHash = files.stringHash(texture);
                const geometry = await models.generateItemGeometry(model.elements, textureKeys, geoHash, textureHash);
                archives.insertRawInZip(convertedAssets, [{ file: `models/entity/geyser_custom/${geoHash}.${textureHash}.geo.json`, data: Buffer.from(JSON.stringify(geometry)) }]);
            }
        } catch (error) {
            statusMessage(MessageType.Critical, `Failed to parse elements ${path}: ${error}`);
        }
    }

    statusMessage(MessageType.Completion, `Inserted ${elementsPaths.size} geometries`);
}

async function writeItems(predicateItems: ItemEntry[], convertedAssets: AdmZip, config: Config, mergeAssets: AdmZip | null, itemMappings: Mappings['itemMappings'], movedTextures: MovedTexture[]): Promise<GeyserMappings.Items> {
    const mappings: GeyserMappings.Items = {};
    const movedTexturesArr = movedTextures.map(t => t.file);
    let sprites = false;

    const itemTextures: ItemAtlas = {
        resource_pack_name: "geyser_custom",
        texture_name: "atlas.items",
        texture_data: {
            missing: {
                textures: MISSING_TEXTURE
            }
        }
    };

    for (const item of predicateItems) {
        const textures: Record<string, string> = {};
        const geometries: Record<string, string> = {};
        const controllers: string[] = [];
        const animationHash = files.stringHash(item.displayPath);
        let icon = undefined;

        if (item.sprite) {
            sprites = true;
            textures['default'] = item.bedrockTexture ?? MISSING_TEXTURE;
            geometries['default'] = 'geometry.geyser_custom.sprite';
            controllers.push('controller.render.item_default');

            icon = `g_${item.hash}`;
            itemTextures.texture_data[icon] = {
                textures: files.extensionlessPath(item.bedrockTexture)
            };
        } else {
            const renderController = await models.generateRenderController(item);
            archives.insertRawInZip(convertedAssets, [{ file: `render_controllers/geyser_custom/${item.hash}.render_controllers.json`, data: Buffer.from(JSON.stringify(renderController)) }]);

            const geoHash = files.stringHash(item.elementsPath);
            const rootGeometry = await models.generateRootItemGeometry(geoHash);
            archives.insertRawInZip(convertedAssets, [{ file: `models/entity/geyser_custom/${geoHash}.geo.json`, data: Buffer.from(JSON.stringify(rootGeometry)) }]);
            geometries[`g_${geoHash}`] = `geometry.geyser_custom.${geoHash}`;

            controllers.push(`controller.render.geyser_custom.${geoHash}`);
            controllers.push(...Object.keys(renderController.render_controllers).filter(c => c != `controller.render.geyser_custom.${geoHash}`));

            for (const [texture] of item.textureKeyMap) {
                const textureHash = files.stringHash(texture);

                if (movedTexturesArr.includes(texture)) {
                    textures[`t_${textureHash}`] = movedTextures.find(t => t.file === texture)!.path;
                } else {
                    textures[`t_${textureHash}`] = `textures/geyser_custom/${textureHash}`;
                }

                geometries[`g_${geoHash}_${textureHash}`] = `geometry.geyser_custom.${geoHash}.${textureHash}`;
            }
        }

        const attachable = await models.generateAttachable(item, config.atachableMaterial, textures, geometries, controllers, animationHash);
        archives.insertRawInZip(convertedAssets, [{ file: `attachables/geyser_custom/${item.hash}.attachable.json`, data: Buffer.from(JSON.stringify(attachable)) }]);

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

    if (sprites) {
        archives.insertRawInZip(convertedAssets, [{ file: `models/entity/geyser_custom/sprite.geo.json`, data: Buffer.from(JSON.stringify(await models.generateSpriteItemGeometry())) }]);
    }

    const itemTexturesCount = Object.keys(itemTextures.texture_data).length - 1;
    if (itemTexturesCount > 0) {
        if (mergeAssets != null) {
            try {
                const existingItemTextures = await archives.parseJsonFromZip<ItemAtlas>(mergeAssets, 'textures/item_texture.json');
                itemTextures.texture_data = { ...existingItemTextures.texture_data, ...itemTextures.texture_data }
            } catch (e) {
                // no-op
            }
        }

        archives.insertRawInZip(convertedAssets, [{ file: 'textures/item_texture.json', data: Buffer.from(JSON.stringify(itemTextures)) }]);
        statusMessage(MessageType.Completion, `Inserted ${itemTexturesCount} mapped icons into item atlas`);
    }

    return mappings;
}