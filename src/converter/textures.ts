// Hierarchy is a bit of an issue here because some of this can be modified at different levels
// Consider: texture path can be changed at the model level, but also the location of the file itself can be changed
// At the base level, we need some sort of list
// In here, we will just consider the texture files themselves
import AdmZip from 'adm-zip';
import { Mappings, MovedTexture } from '../types/mappings';
import * as archives from '../util/archives';
import path from 'path';
import { MessageType, statusMessage } from '../util/console';

export async function convertTextures(inputAssets: AdmZip, convertedAssets: AdmZip, textureMappings: Mappings['textureMappings']): Promise<MovedTexture[]> {
    const movedTextures = await convertMappedVanillaTextures(inputAssets, convertedAssets, textureMappings);

    // logic for special conversion (e.g. stitching, splitting, etc.)
    // ...
    return movedTextures;
}

async function convertMappedVanillaTextures(inputAssets: AdmZip, convertedAssets: AdmZip, textureMappings: Mappings['textureMappings']): Promise<MovedTexture[]> {
    const validTextureShortPaths: string[] = [];
    const javaTexturePath = 'assets/minecraft/textures/';
    const bedrockTexturePath = 'textures/';
    for (const key in textureMappings.nested) {
        for (const path in textureMappings.nested[key]) {
            validTextureShortPaths.push(`${key}/${path}`);
        }
    }

    const inputAssetsShortPaths = archives.listFilePathsInZip(inputAssets, 'assets/minecraft/textures', '.png').map(p => p
        .replace(javaTexturePath, '')
        .replace('.png', ''));
    const validInputTextureShortPaths = inputAssetsShortPaths.filter(p => validTextureShortPaths.includes(p));

    const texturesToMove: MovedTexture[] = [];
    for (const shortPath of validInputTextureShortPaths) {
        const [prefix, ...rest] = shortPath.split('/');
        const newPath = rest.join('/');
        texturesToMove.push({
            file: path.join(javaTexturePath, `${shortPath}.png`), 
            path: path.join(bedrockTexturePath, textureMappings.root[prefix]!, `${textureMappings.nested[prefix][newPath]}.png`)
        });
    }

    archives.transferFromZip(inputAssets, convertedAssets, texturesToMove);
    statusMessage(MessageType.Info, `Converted ${texturesToMove.length} mapped vanilla textures`);
    return texturesToMove;
}