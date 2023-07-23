// Hierarchy is a bit of an issue here because some of this can be modified at different levels
// Consider: texture path can be changed at the model level, but also the location of the file itself can be changed
// At the base level, we need some sort of list
// In here, we will just consider the texture files themselves
import AdmZip from 'adm-zip';
import { Mappings } from '../types/mappings';
import * as archives from '../util/archives';
import path from 'path';

export async function convertTextures(inputAssets: AdmZip, defaultAssets: AdmZip, textureMappings: Mappings['textureMappings']): Promise<void> {

    await convertVanillaTextures(inputAssets, defaultAssets, textureMappings);
}

async function convertVanillaTextures(inputAssets: AdmZip, defaultAssets: AdmZip, textureMappings: Mappings['textureMappings']): Promise<void> {
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

    const texturesToMove: Record<string, string> = {};
    for (const shortPath of validInputTextureShortPaths) {
        const [prefix, ...rest] = shortPath.split('/');
        const newPath = rest.join('/');
        texturesToMove[
            path.join(javaTexturePath, `${shortPath}.png`)
        ] = path.join(bedrockTexturePath, textureMappings.root[prefix]!, `${textureMappings.nested[prefix][newPath]}.png`);
    }

    console.log(texturesToMove);
}