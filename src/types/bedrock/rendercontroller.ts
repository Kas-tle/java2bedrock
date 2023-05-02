import { Molang } from "../util";

export interface RenderController {
    format_version: string,
    render_controllers: {
        [key: string]: RenderController.Controller
    }
}

export namespace RenderController {
    export interface Controller {
        rebuild_animation_matrices?: boolean,
        arrays?: Arrays,
        geometry: string,
        part_visibility?: Array<{ [key: string]: Molang }>,
        materials?: Array<{ [key: string]: Molang }>,
        textures?: Molang[],
        color?: Color,
        overlay_color?: Color,
        on_fire_color?: Color,
        is_hurt_color?: Color,
        uv_anim?: UVAnim,
        light_color_multiplier?: Molang,
        ignore_lighting?: boolean,
        filter_lighting?: boolean
    }
    export interface Arrays {
        geometries?: {
            [key: string]: string[]
        },
        materials?: {
            [key: string]: string[]
        },
        textures?: {
            [key: string]: string[]
        }
    }
    export interface Color {
        r?: Molang,
        g?: Molang,
        b?: Molang,
        a?: Molang
    }
    export interface UVAnim {
        offset: Molang[],
        scale: Molang[]
    }
}