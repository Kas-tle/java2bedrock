import { ItemModel } from "./java/model"

export type Vec4f = [number, number, number, number]
export type Vec3f = [number, number, number]
export type Vec2f = [number, number]

export type Molang = string | number | boolean
export type MolangVec3f = [Molang, Molang, Molang]

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

export type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export interface ItemEntry {
    item: string;
    bedrock_icon?: string;
    overrides: {
        damage?: number;
        unbreakable?: boolean;
        custom_model_data?: number;
    };
    path: string;
    model: ItemModel;
}