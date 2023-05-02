import { Molang } from "../util";
import { Entity } from "./entity";

export interface Attachable {
    format_version: string,
    "minecraft:attachable": {
        description: Attachable.Description
    }
}

export namespace Attachable {
    export interface Description extends Entity.Description {
        item?: string | { [key: string]: Molang }
    }
    export interface Scripts {
        initialize?: string[],
        pre_animation?: Molang[],
        scale?: Molang,
        scalex?: Molang,
        scaleX?: Molang,
        scaley?: Molang,
        scaleY?: Molang,
        scalez?: Molang,
        scaleZ?: Molang,
        parent_setup?: Molang,
        animate?: (string | { [key: string]: Molang })[],
        should_update_bones_and_effects_offscreen?: Molang,
        should_update_effects_offscreen?: Molang
    }
}