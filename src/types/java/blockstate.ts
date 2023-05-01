export type BlockState = BlockState.Variants | BlockState.Multipart

export namespace BlockState {
    export interface Variants {
        variants: {
            [key: `${string}=${string}`]: State | State[]
        }
    }
    
    export interface Multipart {
        multipart: {
            when?: {
                [key: string]: string
            } | {
                OR: {
                    [key: string]: string
                },
                AND: {
                    [key: string]: string
                }
            },
            apply: State | State[]
        }[]
    }
    
    export interface State {
        model: string,
        y?: 0 | 90 | 180 | 270,
        x?: 0 | 90 | 180 | 270,
        uvlock?: boolean,
        weight?: number
    }
}