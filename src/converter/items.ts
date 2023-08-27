import AdmZip from "adm-zip";
import path from 'path';
import * as archives from '../util/archives';
import * as files from '../util/files';
import * as math from '../util/math';
import * as progress from '../util/progress';
import { BlockModel, ItemModel, Model } from "../types/java/model";
import minecraftData from 'minecraft-data'
import { GeyserPredicateBuilder, ItemEntry } from "../types/converter/items";
import { MessageType, statusMessage } from "../util/console";
import { MovedTexture } from "../types/mappings";
import { createSpriteSheet } from "../util/atlases";
import { SpriteSheet } from "../types/util/atlases";
import { Geometry } from "../types/bedrock/geometry";
import sharp from "sharp";

export async function convertItems(inputAssets: AdmZip, convertedAssets: AdmZip, defaultAssets: AdmZip, version: string, movedTextures: MovedTexture[]): Promise<void> {
    // Scan for vanilla items
    const vanillaItems = await scanVanillaItems(inputAssets, defaultAssets);

    // Scan for predicates
    const predicateItems = await scanPredicates(vanillaItems, inputAssets, defaultAssets, version);

    // Construct texture sheets
    const sheets = await constructTextureSheets(predicateItems, inputAssets, defaultAssets, convertedAssets, movedTextures);

    // Write items
    await writeItems(predicateItems, sheets, inputAssets, defaultAssets, convertedAssets, movedTextures);
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

async function scanPredicates(vanillaItems: { path: string, model: ItemModel }[], inputAssets: AdmZip, defaultAssets: AdmZip, version: string): Promise<ItemEntry[]> {
    const predicates: ItemEntry[] = [];
    const mcData = minecraftData(version);

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
                    const path = files.pathFromModelEntry(override.model);
                    const overrides = predicate.build();
                    const hash = files.objectHash({path, overrides});
                    predicates.push({
                        item,
                        overrides,
                        path,
                        model,
                        sprite,
                        hash
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

async function constructTextureSheets(predicateItems: ItemEntry[], inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip, movedTextures: MovedTexture[]): Promise<SpriteSheet[]> {
    const atlases: string[][] = [];
    const movedTexturesArr = movedTextures.map(t => t.file);
    for (const item of predicateItems) {
        const sortedJavaTextures = files.sortedObject(item.model.textures ?? {})
        const javaItemTextures = Object.values(sortedJavaTextures).map(t => files.pathFromTextureEntry(t));
        const itemTextures = new Set(javaItemTextures);
        if (itemTextures.size === 0) {
            continue;
        }

        if (item.sprite) {
            // Send the sprite to convertedAssets
            let spriteBuffer: Buffer;
            if (itemTextures.size > 1) {
                let baseImage = sharp(archives.getBufferFromZip(inputAssets, javaItemTextures[0], defaultAssets));
                for (let i = 1; i < javaItemTextures.length; i++) {
                    baseImage = baseImage.composite([{ input: archives.getBufferFromZip(inputAssets, javaItemTextures[i], defaultAssets) }]);
                }
                spriteBuffer = await baseImage.png().toBuffer();
            } else {
                spriteBuffer = archives.getBufferFromZip(inputAssets, itemTextures.values().next().value, defaultAssets);
            }
            archives.insertRawInZip(convertedAssets, [{ file: item.path, data: spriteBuffer }]);
            continue;
        }

        // Check if any of the textures are contained in an existing atlas or multiple atlases
        const containedAtlases = atlases
            .map((a, index) => ({ index, textures: a.filter(t => itemTextures.has(t)) }))
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
            for (const texture of itemTextures) {
                combinedAtlas.add(texture);
            }

            // Remove the contained atlases from the atlases array
            for (const i of containedAtlases) {
                atlases.splice(i, 1);
            }

            // Add the combined atlas to the atlases array
            atlases.push(Array.from(combinedAtlas).sort());
        } else if (itemTextures.size === 1) {
            // If there is only one texture, check if it is contained in the textures we already moved
            if (movedTexturesArr.includes(itemTextures.values().next().value)) {
                continue;
            }
            atlases.push(Array.from(itemTextures));
        } else {
            // Otherwise just create a new atlas
            atlases.push(Array.from(itemTextures).sort());
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

async function writeItems(predicateItems: ItemEntry[], sprites: SpriteSheet[], inputAssets: AdmZip, defaultAssets: AdmZip, convertedAssets: AdmZip, movedTextures: MovedTexture[]) {
    for (const item of predicateItems) {
        const textureValues = Object.values(item.model.textures || {}).map(t => files.pathFromTextureEntry(t));
        const sheet: SpriteSheet | null = sprites.find(sprite => {
            return Object.keys(sprite.frames).some(frameKey => {
                return textureValues.includes(frameKey);
            });
        }) ?? null;
        const geometry: Geometry = {
            format_version: "1.16.0",
            "minecraft:geometry": [{
                description: {
                    identifier: `geometry.geyser_custom.geo_${item.hash}`,
                    texture_width: 16,
                    texture_height: 16,
                    visible_bounds_width: 4,
                    visible_bounds_height: 4.5,
                    visible_bounds_offset: [0, 0.75, 0]
                },
                bones: [
                    {
                        name: "geyser_custom",
                        binding: "c.item_slot == 'head' ? 'head' : q.item_slot_to_bone_name(c.item_slot)",
                        pivot: [0, 8, 0]
                    },
                    {
                        name: "geyser_custom_x",
                        parent: "geyser_custom",
                        pivot: [0, 8, 0]
                    },
                    {
                        name: "geyser_custom_y",
                        parent: "geyser_custom_x",
                        pivot: [0, 8, 0]
                    },
                    {
                        name: "geyser_custom_z",
                        parent: "geyser_custom_y",
                        texture_meshes: item.sprite ? [{ texture: "default", position: [0, 8, 0], rotation: [90, 0, -180], local_pivot: [8, 0.5, 8] }] : undefined,
                        cubes: item.sprite ? undefined : await generateCubes(item, sheet)
                    }
                ]
            }]
        };
        archives.insertRawInZip(convertedAssets, [{ file: `models/geometry/geyser_custom.geo_${item.hash}.json`, data: Buffer.from(JSON.stringify(geometry)) }]);
    }
}

async function generateCubes(item: ItemEntry, sprite: SpriteSheet | null): Promise<Geometry.Cube[]> {
    const elements = item.model.elements ?? [];
    const cubes: Geometry.Cube[] = [];
    const frameData = (face: Model.Face | undefined): SpriteSheet["frames"][string] => {
        const textures = item.model.textures;
        if (face == null || sprite == null || textures == null || textures[face.texture.slice(1)] == null) {
            return {
                frame: {
                    h: 16,
                    w: 16,
                    x: 0,
                    y: 0
                },
                rotated: false,
                sourceSize: {
                    h: 16,
                    w: 16,
                },
                spriteSourceSize: {
                    h: 16,
                    w: 16,
                    x: 0,
                    y: 0,
                },
                trimmed: false,
            };
        };
        const texture = files.pathFromTextureEntry(textures[face.texture.slice(1)]);
        return sprite?.frames[texture];
    };
    const calculatedUv = (direction: string, face: Model.Face | undefined, frameData: SpriteSheet["frames"][string]): Geometry.Face | undefined => {
        if (face == null || face.uv == null || frameData == null) {
            return undefined;
        }

        const sw = 16 / (sprite ? sprite.meta.size.w : 16);
        const sh = 16 / (sprite ? sprite.meta.size.h : 16);
        const fw = frameData.frame.w * 0.0625;
        const fh = frameData.frame.h * 0.0625;
        const fx = frameData.frame.x * 0.0625;
        const fy = frameData.frame.y * 0.0625;

        const fn0 = (face.uv[0] * fw + fx) * sw;
        const fn1 = (face.uv[1] * fh + fy) * sh;
        const fn2 = (face.uv[2] * fw + fx) * sw;
        const fn3 = (face.uv[3] * fh + fy) * sh;
        const xSign = Math.sign(fn2 - fn0);
        const ySign = Math.sign(fn3 - fn1);

        switch (direction) {
            case 'up':
            case 'down':
                return {
                    uv: [math.tenKRound(fn2 - (0.016 * xSign)), math.tenKRound(fn3 - (0.016 * ySign))],
                    uv_size: [math.tenKRound((fn0 - fn2) + (0.016 * xSign)), math.tenKRound((fn1 - fn3) + (0.016 * ySign))]
                };
            case 'north':
            case 'south':
            case 'east':
            case 'west':
                return {
                    uv: [math.tenKRound(fn0 + (0.016 * xSign)), math.tenKRound(fn1 + (0.016 * ySign))],
                    uv_size: [math.tenKRound((fn2 - fn0) - (0.016 * xSign)), math.tenKRound((fn3 - fn1) - (0.016 * ySign))]
                };
        }
    }

    for (const e of elements) {
        const cube: Geometry.Cube = {
            origin: [
                math.tenKRound(- e.to[0] + 8),
                math.tenKRound(e.from[1]),
                math.tenKRound(e.from[2] - 8)
            ],
            size: [
                math.tenKRound(e.to[0] - e.from[0]),
                math.tenKRound(e.to[1] - e.from[1]),
                math.tenKRound(e.to[2] - e.from[2])
            ],
            rotation: e.rotation ? [
                e.rotation.axis === 'x' ? e.rotation.angle : 0,
                e.rotation.axis === 'y' ? e.rotation.angle : 0,
                e.rotation.axis === 'z' ? e.rotation.angle : 0
            ] : undefined,
            pivot: e.rotation?.origin ? [
                math.tenKRound(- e.rotation.origin[0] + 8),
                math.tenKRound(e.rotation.origin[1]),
                math.tenKRound(e.rotation.origin[2] - 8)
            ] : undefined,
            uv: e.faces ? {
                north: calculatedUv('north', e.faces.north, frameData(e.faces.north)),
                south: calculatedUv('south', e.faces.south, frameData(e.faces.south)),
                east: calculatedUv('east', e.faces.east, frameData(e.faces.east)),
                west: calculatedUv('west', e.faces.west, frameData(e.faces.west)),
                up: calculatedUv('up', e.faces.up, frameData(e.faces.up)),
                down: calculatedUv('down', e.faces.down, frameData(e.faces.down)),
            } : undefined,
        };
        cubes.push(cube);
    }

    return cubes;
}