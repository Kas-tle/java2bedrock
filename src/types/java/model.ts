import { Range, Vec3f } from "../util"

export interface BlockModel {
    parent?: string,
    ambientocclusion?: boolean,
    display?: Model.DisplaySettings,
    textures?: Model.Textures
}

export interface ItemModel extends BlockModel {
    gui_light?: 'front' | 'side',
    overrides?: Model.Overrides
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
        blocking?: Range<0, 1>,
        broken?: Range<0, 1>,
        cast?: Range<0, 1>,
        cooldown?: Range<0, 1>,
        damage?: Range<0, 1>,
        damaged?: Range<0, 1>,
        lefthanded?: Range<0, 1>,
        pull?: Range<0, 1>,
        charged?: Range<0, 1>,
        firework?: Range<0, 1>,
        throwing?: Range<0, 1>,
        time?: Range<0, 1>,
        custom_model_data?: Range<0, 1>,
        level?: Range<0, 1>,
        filled?: Range<0, 1>,
        tooting?: Range<0, 1>,
        trim_type?: Range<0, 1>,
        brushing?: Range<0, 1>
    }

    export interface Overrides {
        predicate: Model.Predicate,
        model: string,
    }
}