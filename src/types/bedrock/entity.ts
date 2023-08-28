import { Attachable } from "./attachable"

export interface Entity {
    format_version: string,
    "minecraft:client_entity": {
        description: Entity.Description
    }
}

export namespace Entity {
    export interface Description {
        identifier: string,
        min_engine_version?: string,
        materials?: { [key: string]: string },
        textures?: { [key: string]: string },
        geometry?: { [key: string]: string },
        spawn_egg?: SpawnEgg,
        scripts?: Scripts,
        particle_effects?: { [key: string]: string },
        particle_emitters?: { [key: string]: string },
        animations?: { [key: string]: string },
        render_controllers?: Array<string | { [key: string]: string }>,
        sound_effects?: { [key: string]: string },
        enable_attachables?: boolean
    }
    export interface SpawnEgg {
        texture: string,
        base_color?: string,
        overlay_color?: string,
        texture_index: number
    }
    export interface Scripts extends Attachable.Scripts {
        variables?: { [key: string]: 'public' }
    }
}