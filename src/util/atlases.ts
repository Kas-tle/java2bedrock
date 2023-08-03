import sharp from 'sharp';
import { MaxRectsPacker, Rectangle } from 'maxrects-packer';
import * as archives from './archives';
import AdmZip from 'adm-zip';
import { SpriteSheet, ImageData } from '../types/util/atlases';

export async function createSpriteSheet(zip: AdmZip, fallbackZip: AdmZip, imagePaths: string[], convertedAssets: AdmZip, outputPath: string): Promise<SpriteSheet> {
    const images = await loadImages(zip, imagePaths, fallbackZip);
    const options = {
        smart: true,
        pot: true,
        square: true,
        allowRotation: false,
        tag: false,
        border: 0
    };

    const maxPossibleWidth = images.reduce((acc, img) => acc + img.width, 0);
    const maxPossibleHeight = images.reduce((acc, img) => acc + img.height, 0);

    const packer = new MaxRectsPacker(maxPossibleWidth, maxPossibleHeight, 0, options);

    const rects = images.map(img => new Rectangle(img.width, img.height));
    packer.addArray(rects);
    
    let sprites: sharp.OverlayOptions[] = [];
    let output: SpriteSheet = {
        frames: {},
        meta: {
            image: 'spritesheet.png',
            scale: 1,
            size: {
                w: packer.bins[0].width || 0,
                h: packer.bins[0].height || 0,
            },
        },
    };

    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const rect = (packer.bins[0].rects[i] as Rectangle);

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

    // Write the spritesheet to the output zip
    archives.insertRawInZip(convertedAssets, [{ file: outputPath, data: outputBuffer }]);

    return output;
}

async function loadImages(zip: AdmZip, paths: string[], fallbackZip: AdmZip): Promise<ImageData[]> {
    const images = await Promise.all(paths.map(async (imgPath) => {
        const imgBuffer = archives.getBufferFromZip(zip, imgPath, fallbackZip);
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