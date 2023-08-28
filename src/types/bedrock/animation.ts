import { MolangVec3f } from "../util";

export interface Animation {
    format_version: string,
    animations: {
        [identifier: string]: Animation.Animation
    }
}

export namespace Animation {
    export interface Animation {
        loop?: boolean,
        loop_hold_on_last_frame?: string,
        start_delay?: string,
        loop_delay?: string,
        anim_time_update?: string,
        blend_weight?: string,
        override_previous_animation?: boolean,
        bones?: {
            [identifier: string]: Bone | undefined
        },
        particle_effects?: {
            [time_stamp: string]: ParticleEffect | Array<ParticleEffect>
        },
        sound_effects?: {
            [time_stamp: string]: SoundEffect | Array<SoundEffect>
        },
        timeline?: {
            [time_stamp: string]: string | Array<string>
        },
        animation_length?: number
    }
    export interface Bone {
        relative_to?: {
            rotation_entity?: string,
        },
        position?: BoneParam,
        rotation?: BoneParam,
        scale?: BoneParam
    }

    export type BoneParam = string | number | MolangVec3f | TimeStampObject;

    export interface TimeStampObject {
        [time_stamp: string]: MolangVec3f | TimeStampParams
    }
    
    export interface TimeStampParams {
        lerp_mode?: 'linear' | 'catmullrom',
        pre?: MolangVec3f,
        post?: MolangVec3f
    }
    
    export interface ParticleEffect {
        effect: string,
        locator?: string,
        pre_effect_script?: string,
        bind_to_actor?: boolean
    }
    
    export interface SoundEffect {
        effect: string
    }
}


