export interface SpriteSheet {
    frames: {
        [key: string]: {
            frame: {
                h: number,
                w: number,
                x: number,
                y: number
            },
            rotated: boolean,
            sourceSize: {
                h: number,
                w: number,
            },
            spriteSourceSize: {
                h: number,
                w: number,
                x: number,
                y: number,
            },
            trimmed: boolean
        }
    },
    meta: {
        image: string,
        scale: number,
        size: {
            w: number,
            h: number,
        }
    },
};

export interface ImageData {
    buffer: Buffer,
    width: number,
    height: number,
    path: string,
};

export interface FrameData {
    frame: {
        h: number,
        w: number,
        x: number,
        y: number
    },
    rotated: boolean,
    sourceSize: {
        h: number,
        w: number,
    },
    spriteSourceSize: {
        h: number,
        w: number,
        x: number,
        y: number,
    },
    trimmed: boolean
}