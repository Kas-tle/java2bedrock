import { Range, Vec3f } from "../util"

export interface BlockModel {
    parent?: string,
    ambientocclusion?: boolean,
    display?: Model.DisplaySettings,
    textures?: Model.Textures
}

export interface ItemModel extends BlockModel {
    gui_light?: 'front' | 'side',
    overrides?: Model.Overrides[]
}

export namespace Model {
    export interface DisplaySettings {
        thirdperson_righthand?: Display,
        thirdperson_lefthand?: Display,
        firstperson_righthand?: Display,
        firstperson_lefthand?: Display,
        gui?: Display,
        head?: Display,
        ground?: Display,
        fixed?: Display
    }
    
    export interface Display {
        rotation?: Vec3f,
        translation?: Vec3f,
        scale?: Vec3f
    }
    
    export interface Textures {
        [key: string]: string
    }
    
    export interface Element {
        from: Vec3f,
        to: Vec3f,
        rotation?: {
            origin: Vec3f,
            axis: 'x' | 'y' | 'z',
            angle: -45 | -22.5 | 0 | 22.5 | 45,
            rescale?: boolean
        },
        shade?: boolean,
        faces?: {
            up?: Face
        }
    }
    
    export interface Face {
        uv?: [Range<0, 16>, Range<0, 16>, Range<0, 16>, Range<0, 16>],
        texture: `#${string}`,
        cullface?: 'up' | 'down' | 'north' | 'south' | 'east' | 'west',
        rotation?: 0 | 90 | 180 | 270,
        tintindex?: number
    }
    
    export interface Predicate {
        angle?: Range<0, 1>,
        blocking?: 0 | 1,
        broken?: 0 | 1,
        cast?: 0 | 1,
        cooldown?: Range<0, 1>,
        damage?: Range<0, 1>,
        damaged?: 0 | 1,
        lefthanded?: 0 | 1,
        pull?: Range<0, 1>,
        pulling?: 0 | 1,
        charged?: 0 | 1,
        firework?: 0 | 1,
        throwing?: 0 | 1,
        time?: Range<0, 1>,
        custom_model_data?: number,
        level?: Range<0, 1>,
        filled?: Range<0, 1>,
        tooting?: 0 | 1,
        trim_type?: Range<0, 1>,
        brushing?: Range<0, 1>
    }

    export interface Overrides {
        predicate: Model.Predicate,
        model: string,
    }
}