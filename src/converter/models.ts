import * as files from '../util/files';
import * as archives from '../util/archives';
import * as math from '../util/math';
import { Geometry } from "../types/bedrock/geometry";
import { Attachable } from "../types/bedrock/attachable";
import { ItemEntry } from "../types/converter/items";
import { BlockModel, ItemModel, Model } from "../types/java/model";
import { FrameData, SpriteSheet } from "../types/util/atlases";
import { Animation } from '../types/bedrock/animation';
import { Config } from '../util/config';
import AdmZip from 'adm-zip';
import { Vec3f } from '../types/util';

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

export async function generateBaseAnimations(convertedAssets: AdmZip) {
    const animation: Animation = {
        "format_version": "1.8.0",
        "animations": {
          "animation.geyser_custom.disable": {
            "loop": true,
            "override_previous_animation": true,
            "bones": {
              "geyser_custom": {
                "scale": 0
              }
            }
          }
        }
    };
    archives.insertRawInZip(convertedAssets, [{ file: `animations/disable.animations.json`, data: Buffer.from(JSON.stringify(animation)) }]);
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
                    default: attachableMaterial ?? 'entity_alphatest_one_sided',
                    enchanted: attachableMaterial ?? 'entity_alphatest_one_sided',
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
                        { thirdperson_main_hand: "v.main_hand && !c.is_first_person" },
                        { thirdperson_off_hand: "v.off_hand && !c.is_first_person" },
                        { thirdperson_head: "v.head && !c.is_first_person" },
                        { firstperson_main_hand: "v.main_hand && c.is_first_person" },
                        { firstperson_off_hand: "v.off_hand && c.is_first_person" },
                        { firstperson_head: "c.is_first_person && v.head" }
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
                render_controllers: ["controller.render.item_default"]
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
                    cubes: item.sprite ? undefined : await generateItemCubes(item, sheet)
                }
            ]
        }]
    };
}

export async function generateBlockGeometry(hash: string, model: BlockModel): Promise<{ geo: Geometry, downscaled: boolean }> {
    const cubesObj = await generateBlockCubes(model);
    return {
        geo: {
            format_version: "1.16.0",
            "minecraft:geometry": [{
                description: {
                    identifier: `geometry.geyser_custom.geo_${hash}`,
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
                        cubes: cubesObj.cubes
                    }
                ]
            }]
        }, downscaled: cubesObj.downscaled
    };
}

async function generateItemCubes(item: ItemEntry, sprite: SpriteSheet | null): Promise<Geometry.Cube[]> {
    const elements = item.model.elements ?? [];

    const frameData = (face: Model.Face | undefined): FrameData => {
        const textures = item.model.textures;
        let frameData: FrameData = {
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
            trimmed: false
        };

        if (face == null || sprite == null || sprite.frames == null || textures == null || textures[face.texture.slice(1)] == null) {
            return frameData;
        };

        const texture = files.pathFromTextureEntry(textures[face.texture.slice(1)]);

        if (sprite.frames[texture] != null) {
            frameData = sprite.frames[texture];
        }
        return frameData;
    };

    const calculatedUv = (direction: string, face: Model.Face | undefined): Geometry.Face | undefined => {
        if (face == null || face.uv == null) {
            return undefined;
        }

        const uvShift = frameData(face);

        const sw = 16 / (sprite ? sprite.meta.size.w : 16);
        const sh = 16 / (sprite ? sprite.meta.size.h : 16);
        const fw = uvShift.frame.w;
        const fh = uvShift.frame.h;
        const fx = uvShift.frame.x;
        const fy = uvShift.frame.y;

        const fn0 = (face.uv[0] * fw * 0.0625 + fx) * sw;
        const fn1 = (face.uv[1] * fh * 0.0625 + fy) * sh;
        const fn2 = (face.uv[2] * fw * 0.0625 + fx) * sw;
        const fn3 = (face.uv[3] * fh * 0.0625 + fy) * sh;

        return calculateUv(direction, fn0, fn1, fn2, fn3);
    }

    const cubes = generateCubes(elements, false, calculatedUv);

    return cubes;
}

async function generateBlockCubes(model: BlockModel): Promise<{ cubes: Geometry.Cube[], downscaled: boolean }> {
    const elements = model.elements ?? [];
    const calculatedUv = (direction: string, face: Model.Face | undefined): Geometry.Face | undefined => {
        if (face == null || face.uv == null) {
            return undefined;
        }

        const fn0 = face.uv[0];
        const fn1 = face.uv[1];
        const fn2 = face.uv[2];
        const fn3 = face.uv[3];

        const material_instance = face.texture ? face.texture.slice(1) : undefined;

        return calculateUv(direction, fn0, fn1, fn2, fn3, material_instance);
    }

    // first test if we need to downscale the model
    let downscale = false;
    for (const e of elements) {
        if (e.from[0] < -6.4 || e.from[1] < 0 || e.from[2] < -6.4 || e.to[0] > 22.4 || e.to[1] > 28.8 || e.to[2] > 22.4) {
            downscale = true;
            break;
        }
    }

    const cubes = generateCubes(elements, downscale, calculatedUv);

    return { cubes, downscaled: downscale };
}

function generateCubes(
        elements: Model.Element[], 
        downscale: boolean = false, 
        calculatedUv: (direction: string, face: Model.Face | undefined) => Geometry.Face | undefined
    ): Geometry.Cube[] {
    const cubes: Geometry.Cube[] = [];

    for (const e of elements) {
        const cube: Geometry.Cube = {};
        if (downscale) {
            cube.origin = math.scale.point([- e.to[0] + 8, e.from[1], e.from[2] - 8], [0, 8, 0], 0.5);
            cube.size = math.scale.size([e.to[0] - e.from[0], e.to[1] - e.from[1], e.to[2] - e.from[2]], 0.5);
            cube.pivot = e.rotation?.origin ? math.scale.point([- e.rotation.origin[0] + 8, e.rotation.origin[1], e.rotation.origin[2] - 8], [0, 8, 0], 0.5)
                : undefined;
        } else {
            cube.origin = [
                math.tenKRound(- e.to[0] + 8),
                math.tenKRound(e.from[1]),
                math.tenKRound(e.from[2] - 8)
            ];
            cube.size = [
                math.tenKRound(e.to[0] - e.from[0]),
                math.tenKRound(e.to[1] - e.from[1]),
                math.tenKRound(e.to[2] - e.from[2])
            ];
            cube.pivot = e.rotation?.origin ? [
                math.tenKRound(- e.rotation.origin[0] + 8),
                math.tenKRound(e.rotation.origin[1]),
                math.tenKRound(e.rotation.origin[2] - 8)
            ] : undefined;
        }
        cube.rotation = e.rotation ? [
            e.rotation.axis === 'x' ? - e.rotation.angle : 0,
            e.rotation.axis === 'y' ? - e.rotation.angle : 0,
            e.rotation.axis === 'z' ? e.rotation.angle : 0
        ] : undefined;

        if (e.faces != null) {
            const uv: Geometry.PerFaceUV = {};
            for (const face of Object.keys(e.faces) as Array<keyof Model.Element['faces']>) {
                if (face == null || e.faces[face] == null) {
                    continue;
                }

                const f = face as keyof Geometry.PerFaceUV

                const faceUv = calculatedUv(face, e.faces[face]);
                const rotation = (e.faces[face] as Model.Face).rotation;

                if (rotation != null && rotation !== 0) {
                    const uvRotCube = generateUvRotCube(cube, rotation, faceUv, f);
                    if (uvRotCube != null) {
                        cubes.push(uvRotCube);
                    }
                } else {
                    uv[f] = faceUv;
                }
            }
            cube.uv = uv;
        }

        cubes.push(cube);
    }

    return cubes;
}

function generateUvRotCube(cube: Geometry.Cube, rotation: 0 | 90 | 180 | 270, uv: Geometry.Face | undefined, face: keyof Geometry.PerFaceUV): Geometry.Cube | undefined {
    if (uv == null || cube.origin == null || cube.size == null) {
        return undefined;
    }
    
    const { origin: o, size: s, rotation: r, pivot: p } = cube;

    const c000 = o;
    const c000r = math.euler.zyx.rotatePoint(c000, p, r);
    const c100 = math.vector.add<Vec3f>(c000, [s[0], 0, 0]);
    const c100r = math.euler.zyx.rotatePoint(c100, p, r);
    const c010 = math.vector.add<Vec3f>(c000, [0, s[1], 0]);
    const c010r = math.euler.zyx.rotatePoint(c010, p, r);
    const c110 = math.vector.add<Vec3f>(c000, [s[0], s[1], 0]);
    const c110r = math.euler.zyx.rotatePoint(c110, p, r);
    const c001 = math.vector.add<Vec3f>(c000, [0, 0, s[2]]);
    const c001r = math.euler.zyx.rotatePoint(c001, p, r);
    const c101 = math.vector.add<Vec3f>(c000, [s[0], 0, s[2]]);
    const c101r = math.euler.zyx.rotatePoint(c101, p, r);
    const c011 = math.vector.add<Vec3f>(c000, [0, s[1], s[2]]);
    const c011r = math.euler.zyx.rotatePoint(c011, p, r);
    const c111 = math.vector.add<Vec3f>(c000, [s[0], s[1], s[2]]);
    const c111r = math.euler.zyx.rotatePoint(c111, p, r);
    

    const rc: Geometry.Cube = {
        uv: {}
    };
    (rc.uv as Geometry.PerFaceUV)[face] = uv;

    outer: switch(face) {
        case 'up':
            switch(rotation) {
                case 90:
                    rc.origin = math.vector.add<Vec3f>(c010r, [- s[2], 0, 0]);
                    rc.size = [s[2], 0, s[0]];
                    rc.rotation = math.vector.add<Vec3f>([0, 90, 0], r);
                    rc.pivot = c010r;
                    break outer;
                case 180:
                    rc.origin = math.vector.add<Vec3f>(c011r, [- s[0], 0, 0]);
                    rc.size = [s[0], 0, s[2]];
                    rc.rotation = math.vector.add<Vec3f>([0, 180, 0], r);
                    rc.pivot = c011r;
                case 270:
                    rc.origin = c110r;
                    rc.size = [s[2], 0, s[0]];
                    rc.rotation = math.vector.add<Vec3f>([0, 270, 0], r);
                    rc.pivot = c110r;
                    break outer;
            }
        case 'down':
            switch(rotation) {
                case 90:
                    rc.origin = c100r;
                    rc.size = [s[2], 0, s[0]];
                    rc.rotation = math.vector.add<Vec3f>([0, -90, 0], r);
                    rc.pivot = c100r;
                    break outer;
                case 180:
                    rc.origin = c101r;
                    rc.size = [s[0], 0, s[2]];
                    rc.rotation = math.vector.add<Vec3f>([0, -180, 0], r);
                    rc.pivot = c101r;
                    break outer;
                case 270:
                    rc.origin = math.vector.add<Vec3f>(c000r, [- s[2], 0, 0]);
                    rc.size = [s[2], 0, s[0]];
                    rc.rotation = math.vector.add<Vec3f>([0, -270, 0], r);
                    rc.pivot = c000r;
                    break outer;

            }
        case 'north':
            switch(rotation) {
                case 90:
                    rc.origin = math.vector.add<Vec3f>(c000r, [- s[1], 0, 0]);
                    rc.size = [s[1], s[0], 0];
                    rc.rotation = math.vector.add<Vec3f>([0, 0, 90], r);
                    rc.pivot = c000r;
                    break outer;
                case 180:
                    rc.origin = math.vector.add<Vec3f>(c010r, [- s[0], 0, 0]);
                    rc.size = [s[0], s[1], 0];
                    rc.rotation = math.vector.add<Vec3f>([0, 0, 180], r);
                    rc.pivot = c010r;
                    break outer;
                case 270:
                    rc.origin = c100r;
                    rc.size = [s[1], s[0], 0];
                    rc.rotation = math.vector.add<Vec3f>([0, 0, 270], r);
                    rc.pivot = c100r;
                    break outer;
            }
        case 'south':
            switch(rotation) {
                case 90:
                    rc.origin = c101r;
                    rc.size = [s[1], s[0], 0];
                    rc.rotation = math.vector.add<Vec3f>([0, 0, -90], r);
                    rc.pivot = c101r;
                    break outer;
                case 180:
                    rc.origin = c111r;
                    rc.size = [s[0], s[1], 0];
                    rc.rotation = math.vector.add<Vec3f>([0, 0, -180], r);
                    rc.pivot = c111r;
                    break outer;
                case 270:
                    rc.origin = math.vector.add<Vec3f>(c001r, [- s[1], 0, 0]);
                    rc.size = [s[1], s[0], 0];
                    rc.rotation = math.vector.add<Vec3f>([0, 0, -270], r);
                    rc.pivot = c001r;
                    break outer;
            }
        case 'east':
            switch(rotation) {
                case 90:
                    rc.origin = c001r;
                    rc.size = [0, s[2], s[1]];
                    rc.rotation = math.vector.add<Vec3f>([90, 0, 0], r);
                    rc.pivot = c001r;
                    break outer;
                case 180:
                    rc.pivot = c011r;
                    rc.size = [0, s[1], s[2]];
                    rc.rotation = math.vector.add<Vec3f>([180, 0, 0], r);
                    rc.pivot = c011r;
                    break outer;
                case 270:
                    rc.pivot = c000r;
                    rc.origin = math.vector.add<Vec3f>(rc.pivot, [0, 0, - s[1]]);
                    rc.size = [0, s[2], s[1]];
                    rc.rotation = math.vector.add<Vec3f>([270, 0, 0], r);
                    break outer;
            }
        case 'west':
            switch(rotation) {
                case 90:
                    rc.origin = math.vector.add<Vec3f>(c100r, [0, 0, - s[1]]);
                    rc.size = [0, s[2], s[1]];
                    rc.rotation = math.vector.add<Vec3f>([-90, 0, 0], r);
                    rc.pivot = c100r;
                    break outer;
                case 180:
                    rc.origin = math.vector.add<Vec3f>(c110r, [0, 0, - s[2]]);
                    rc.size = [0, s[1], s[2]];
                    rc.rotation = math.vector.add<Vec3f>([-180, 0, 0], r);
                    rc.pivot = c110r;
                    break outer;
                case 270:
                    rc.origin = c101r;
                    rc.size = [0, s[2], s[1]];
                    rc.rotation = math.vector.add<Vec3f>([-270, 0, 0], r);
                    rc.pivot = c101r;
                    break outer;
            }
    }

    return rc;
}

function calculateUv(direction: string, fn0: number, fn1: number, fn2: number, fn3: number, material_instance: string | undefined = undefined): Geometry.Face | undefined {
    const xSign = Math.sign(fn2 - fn0);
    const ySign = Math.sign(fn3 - fn1);

    switch (direction) {
        case 'up':
        case 'down':
            return {
                uv: [math.tenKRound(fn2 - (0.016 * xSign)), math.tenKRound(fn3 - (0.016 * ySign))],
                uv_size: [math.tenKRound((fn0 - fn2) + (0.016 * xSign)), math.tenKRound((fn1 - fn3) + (0.016 * ySign))],
                material_instance
            };
        case 'north':
        case 'south':
        case 'east':
        case 'west':
            return {
                uv: [math.tenKRound(fn0 + (0.016 * xSign)), math.tenKRound(fn1 + (0.016 * ySign))],
                uv_size: [math.tenKRound((fn2 - fn0) - (0.016 * xSign)), math.tenKRound((fn3 - fn1) - (0.016 * ySign))],
                material_instance
            };
    }

    return undefined;
}

export function validatedTextures(model: BlockModel | ItemModel): Model.Textures {
    const usedTextures = new Set(
        (model.elements || [])
            .flatMap(element => Object.values(element.faces || {}))
            .filter(face => face != null)
            .map(face => face!.texture.slice(1))
    );
    return Object.fromEntries(
        Object.entries(model.textures || {})
            .filter(([key]) => usedTextures.has(key) || key === 'particle')
    );
}

