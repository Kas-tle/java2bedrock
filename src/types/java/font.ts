export interface Font {
    providers: Array<Providers.Bitmap | Providers.LegacyUnicode | Providers.TTF | Providers.Space>
}

export namespace Providers {
    export interface Bitmap {
        type: 'bitmap',
        file: string,
        height?: number,
        ascent: number,
        chars: string[]
    }
    export interface LegacyUnicode {
        type: 'legacy_unicode',
        sizes: string,
        template: string
    }
    export interface TTF {
        type: 'ttf',
        file: string,
        shift: [number, number],
        size: number,
        oversample: number,
        skip?: string
    }
    export interface Space {
        type: 'space',
        advances: {
            [key: string]: number
        }
    }
}