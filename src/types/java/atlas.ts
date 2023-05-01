export interface Atlas {
    sources: Array<
        AtlasSource.Directory 
        | AtlasSource.Single
        | AtlasSource.PalettedPermutations
        | AtlasSource.Filter
        | AtlasSource.Unstitch
    >,
}

export namespace AtlasSource {
    export interface Directory {
        type: 'directory',
        source: string,
        prefix?: string
    }
    export interface Single {
        type: 'single',
        resource: string
    }
    export interface PalettedPermutations {
        type: 'paletted_permutations',
        textures: string[],
        palette_key: string,
        permutations: {
            [key: string]: string
        }
    }
    export interface Filter {
        type: 'filter',
        namespace?: string,
        path?: string
    }
    export interface Unstitch {
        type: 'unstitch',
        resource: string,
        divisor_x: number,
        divisor_y: number,
        regions: {
            sprite: string,
            x: number,
            y: number,
            width: number,
            height: number
        }[]
    }
}