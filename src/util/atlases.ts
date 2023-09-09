import sharp from 'sharp';
import { MaxRectsPacker } from 'maxrects-packer';
import * as archives from './archives';
import AdmZip from 'adm-zip';
import { SpriteSheet, ImageData } from '../types/util/atlases';

export async function createSpriteSheet(images: ImageData[], outputPath: string): Promise<{sheet: SpriteSheet, file: string, data: Buffer}> {
    const options = {
        smart: true,
        pot: true,
        square: false,
        allowRotation: false,
        tag: false,
        border: 0
    };

    const maxPossibleWidth = images.reduce((acc, img) => acc + img.width, 0);
    const maxPossibleHeight = images.reduce((acc, img) => acc + img.height, 0);

    const packer = new MaxRectsPacker(maxPossibleWidth * 2, maxPossibleHeight * 2, 0, options);

    for (const image of images) {
        packer.add(image.width, image.height, image.path);
    }
    
    let sprites: sharp.OverlayOptions[] = [];
    let output: SpriteSheet = {
        frames: {},
        meta: {
            image: outputPath,
            scale: 1,
            size: {
                w: packer.bins[0].width || 0,
                h: packer.bins[0].height || 0,
            },
        },
    };

    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const rects = packer.bins[0].rects;
        const rect = (rects.find(rect => rect.data === image.path) || rects[i]);

        // Add image frame data to the output object
        output.frames[image.path] = {
            frame: { h: image.height, w: image.width, x: rect.x, y: rect.y },
            rotated: false,
            sourceSize: { h: image.height, w: image.width },
            spriteSourceSize: { h: image.height, w: image.width, x: 0, y: 0 },
            trimmed: false,
        };

        // Composite image onto spritesheet
        sprites.push({ input: image.buffer, left: rect.x, top: rect.y });
    }

    // Create an empty spritesheet
    const spritesheet = sharp({
        create: {
            width: output.meta.size.w,
            height: output.meta.size.h,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    });

    // Composite the images onto the spritesheet
    const outputBuffer = await spritesheet.composite(sprites).png().toBuffer();

    return { sheet: output, file: outputPath, data: outputBuffer };
}

export async function loadImages(zip: AdmZip, paths: string[], fallbackZip: AdmZip): Promise<ImageData[]> {
    const images = await Promise.all(paths.map(async (imgPath) => {
        let imgBuffer: Buffer;
        try {
            imgBuffer = archives.getBufferFromZip(zip, imgPath, fallbackZip);   
        } catch (e) {
            //statusMessage(MessageType.Critical, `Failed to load image ${imgPath}, using fallback texture`)
            imgBuffer = archives.getBufferFromZip(zip, 'assets/minecraft/textures/block/white_concrete.png', fallbackZip);
        }
        const metadata = await sharp(imgBuffer).metadata();

        return {
            buffer: imgBuffer,
            width: metadata.width!,
            height: metadata.height!,
            path: imgPath,
        };
    }));

    return images;
}