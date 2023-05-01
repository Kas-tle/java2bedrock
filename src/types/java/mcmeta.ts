export interface Pack {
    pack: {
        pack_format: number,
        // this can technically also be a raw JSON text object but... meh later
        description: string
    },
    language?: {
        [key: string]: {
            name: string,
            region: string,
            bidirectional: boolean
        }
    },
    filter?: {
        block: Array<Block.Path | Block.Namespace | Block.PathNamespace>
    }
}

export namespace Block {
    export interface Path {
        path: string
    }
    
    export interface Namespace {
        namespace: string
    }
    
    export interface PathNamespace {
        path: string,
        namespace: string
    }
}

export interface Animation {
    interpolate?: boolean,
    width?: number,
    height?: number,
    frametime?: number,
    frames: Array<Frame | number>
}

export interface Frame {
    index: number,
    time: number
}

export interface Villager {
    [key: string]: {
        hat: 'full' | 'partial' | 'default'
    }
}

export interface Misc {
    [key: string]: {
        blur?: boolean,
        clamp?: boolean,
        mipmaps?: number[],
    }
}