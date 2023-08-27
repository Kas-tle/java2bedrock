import * as files from '../util/files';
import * as math from '../util/math';
import { Geometry } from "../types/bedrock/geometry";
import { ItemEntry } from "../types/converter/items";
import { Model } from "../types/java/model";
import { SpriteSheet } from "../types/util/atlases";
import { Animation } from '../types/bedrock/animation';

export async function generateAnimation(item: ItemEntry): Promise<Animation> {
    const display = item.model.display;
    const animation: Animation = {
        format_version: "1.8.0",
        animations: {
            [`animation.geyser_custom.${item.hash}.thirdperson_main_hand`] : {
                loop: true,
                bones: {
                    geyser_custom_x: display!.thirdperson_righthand ? {
                        rotation: display!.thirdperson_righthand.rotation ? [- display!.thirdperson_righthand.rotation[0], 0, 0] : undefined,
                        position: display!.thirdperson_righthand.translation ? [
                            - display!.thirdperson_righthand.translation[0], 
                            display!.thirdperson_righthand.translation[1], 
                            display!.thirdperson_righthand.translation[2]
                        ] : undefined,
                        scale: display!.thirdperson_righthand.scale ? [
                            display!.thirdperson_righthand.scale[0], 
                            display!.thirdperson_righthand.scale[1], 
                            display!.thirdperson_righthand.scale[2]
                        ] : undefined,
                    } : undefined,
                    geyser_custom_y: display!.thirdperson_righthand ? {
                        rotation: display!.thirdperson_righthand.rotation ? [0, - display!.thirdperson_righthand.rotation[1], 0] : undefined,
                    } : undefined,
                    geyser_custom_z: display!.thirdperson_righthand ? {
                        rotation: display!.thirdperson_righthand.rotation ? [0, 0, display!.thirdperson_righthand.rotation[2]] : undefined,
                    } : undefined,
                    geyser_custom: {
                        rotation: [90, 0, 0],
                        position: [0, 13, -3]
                    }
                }
            }
        }
    };

    return animation;
}

async function generateSlotAnimation(
    item: ItemEntry, 
    animationKey: keyof Model.DisplaySettings, 
    params: {
        baseAnimation?: Animation.Bone,
        baseRotation?: Animation.BoneParam,
        baseScale?: Animation.BoneParam,
    } = {}): Promise<Animation['animations'][string]> {
    const display = item.model.display;
    const animation: Animation['animations'][string] = {
        loop: true,
        bones: {
            geyser_custom_x: display![animationKey] ? {
                rotation: display![animationKey]!.rotation ? [- display![animationKey]!.rotation![0], 0, 0] : undefined,
                position: display![animationKey]!.translation ? [
                    - display![animationKey]!.translation![0], 
                    display![animationKey]!.translation![1], 
                    display![animationKey]!.translation![2]
                ] : undefined,
                scale: display![animationKey]!.scale ? [
                    display![animationKey]!.scale![0], 
                    display![animationKey]!.scale![1], 
                    display![animationKey]!.scale![2]
                ] : undefined,
            } : undefined,
            geyser_custom_y: display![animationKey] ? {
                rotation: display![animationKey]!.rotation ? [0, - display![animationKey]!.rotation![1], 0] : undefined,
            } : undefined,
            geyser_custom_z: display![animationKey] ? {
                rotation: display![animationKey]!.rotation ? [0, 0, display![animationKey]!.rotation![2]] : undefined,
            } : undefined,
            geyser_custom: params.baseAnimation
        }
    };

    return animation;
}

export async function generateItemGeometry(item: ItemEntry, sheet: SpriteSheet | null): Promise<Geometry> {
    return {
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