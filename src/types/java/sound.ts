import { Range } from "../util"
export interface Sound {
    [key: string]: {
        replace?: boolean,
        subtitle?: string,
        sounds: {
            name: string,
            volume?: Range<0, 1>,
            pitch?: number,
            weight?: number,
            stream?: boolean,
            attenuation_distance?: number,
            preload?: boolean,
            type?: 'sound' | 'event'
        }[] | string[]
    }
}