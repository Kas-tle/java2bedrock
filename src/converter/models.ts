import * as files from '../util/files';
import * as math from '../util/math';
import { Geometry } from "../types/bedrock/geometry";
import { Attachable } from "../types/bedrock/attachable";
import { ItemEntry } from "../types/converter/items";
import { Model } from "../types/java/model";
import { SpriteSheet } from "../types/util/atlases";
import { Animation } from '../types/bedrock/animation';
import { Config } from '../util/config';

export async function generateAnimation(item: ItemEntry): Promise<Animation> {
    const animation: Animation = {
        format_version: "1.8.0",
        animations: {
            [`animation.geyser_custom.${item.hash}.thirdperson_main_hand`]:
                await generateSlotAnimation(item, 'thirdperson_righthand', { baseAnimation: { rotation: [90, 0, 0], position: [0, 13, -3] } }),
            [`animation.geyser_custom.${item.hash}.thirdperson_off_hand`]:
                await generateSlotAnimation(item, 'thirdperson_lefthand', { invertXPos: true, baseAnimation: { rotation: [90, 0, 0], position: [0, 13, -3] } }),
            [`animation.geyser_custom.${item.hash}.head`]:
                await generateSlotAnimation(item, 'head', { baseScale: 0.625, baseAnimation: { position: [0, 19.9, 0] } }),
            [`animation.geyser_custom.${item.hash}.firstperson_main_hand`]:
                await generateSlotAnimation(item, 'firstperson_righthand', { baseRotation: [0.1, 0.1, 0.1], baseAnimation: { rotation: [90, 60, -40], position: [4, 10, 4], scale: 1.5 } }),
            [`animation.geyser_custom.${item.hash}.firstperson_off_hand`]:
                await generateSlotAnimation(item, 'firstperson_lefthand', { invertXPos: true, baseRotation: [0.1, 0.1, 0.1], baseAnimation: { rotation: [90, 60, -40], position: [4, 10, 4], scale: 1.5 } }),
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
        baseScale?: number,
        invertXPos?: boolean,
    } = {}): Promise<Animation.Animation> {
    const display = item.model.display ? item.model.display[animationKey] : undefined;
    const { baseAnimation, baseRotation, baseScale, invertXPos } = params;
    return {
        loop: true,
        bones: {
            geyser_custom_x: display ? {
                rotation: display.rotation ? [math.tenKRound(- display.rotation[0]), 0, 0] : baseRotation,
                position: display.translation ? [
                    math.tenKRound(- display.translation[0] * (invertXPos ? -1 : 1)),
                    math.tenKRound(display.translation[1]),
                    math.tenKRound(display.translation[2])
                ] : undefined,
                scale: display.scale ? [
                    math.tenKRound(display.scale[0] * (baseScale ?? 1)),
                    math.tenKRound(display.scale[1] * (baseScale ?? 1)),
                    math.tenKRound(display.scale[2] * (baseScale ?? 1))
                ] : baseScale,
            } : undefined,
            geyser_custom_y: display ? {
                rotation: display.rotation ? [0, math.tenKRound(- display.rotation[1]), 0] : undefined,
            } : undefined,
            geyser_custom_z: display ? {
                rotation: display.rotation ? [0, 0, math.tenKRound(display.rotation[2])] : undefined,
            } : undefined,
            geyser_custom: baseAnimation
        }
    };
}

export async function generateAttachable(item: ItemEntry, attachableMaterial: Config['atachableMaterial'], texture: string): Promise<Attachable> {
    return {
        format_version: "1.10.0",
        "minecraft:attachable": {
            description: {
                identifier: `geyser_custom:g_${item.hash}`,
                materials: {
                    // TODO: auto assignment of minumum material
                    default: attachableMaterial ?? 'alpha_test',
                    enchanted: attachableMaterial ?? 'alpha_test',
                },
                textures: {
                    default: texture,
                    enchanted: "textures/misc/enchanted_item_glint",
                },
                geometry: {
                    default: `geometry.geyser_custom.geo_${item.hash}`
                },
                scripts: {
                    pre_animation: [
                        "v.main_hand = c.item_slot == 'main_hand';",
                        "v.off_hand = c.item_slot == 'off_hand';",
                        "v.head = c.item_slot == 'head';"
                    ],
                    animate: [
                        {thirdperson_main_hand: "v.main_hand && !c.is_first_person"},
                        {thirdperson_off_hand: "v.off_hand && !c.is_first_person"},
                        {thirdperson_head: "v.head && !c.is_first_person"},
                        {firstperson_main_hand: "v.main_hand && c.is_first_person"},
                        {firstperson_off_hand: "v.off_hand && c.is_first_person"},
                        {firstperson_head: "c.is_first_person && v.head"}
                    ]
                },
                animations: {
                    thirdperson_main_hand: `animation.geyser_custom.${item.hash}.thirdperson_main_hand`,
                    thirdperson_off_hand: `animation.geyser_custom.${item.hash}.thirdperson_off_hand`,
                    thirdperson_head: `animation.geyser_custom.${item.hash}.head`,
                    firstperson_main_hand: `animation.geyser_custom.${item.hash}.firstperson_main_hand`,
                    firstperson_off_hand: `animation.geyser_custom.${item.hash}.firstperson_off_hand`,
                    firstperson_head: "animation.geyser_custom.disable"
                },
                render_controllers: [ "controller.render.item_default" ]
            }
        }
    };
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
        const fw = frameData.frame.w;
        const fh = frameData.frame.h;
        const fx = frameData.frame.x;
        const fy = frameData.frame.y;

        const fn0 = (face.uv[0] * fw * 0.0625 + fx) * sw;
        const fn1 = (face.uv[1] * fh * 0.0625 + fy) * sh;
        const fn2 = (face.uv[2] * fw * 0.0625 + fx) * sw;
        const fn3 = (face.uv[3] * fh * 0.0625 + fy) * sh;
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
                e.rotation.axis === 'x' ? - e.rotation.angle : 0,
                e.rotation.axis === 'y' ? - e.rotation.angle : 0,
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