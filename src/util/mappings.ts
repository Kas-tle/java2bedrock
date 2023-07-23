import path from 'path';
import ignoredPathsMappings from '../resources/mappings/textures/ignored.json';
import modifiedPathsMappings from '../resources/mappings/textures/modified.json';
import * as files from './files';
import * as archives from './archives';
import fs, { stat } from 'fs';
import AdmZip from 'adm-zip';
import { MessageType, statusMessage } from './console';

export async function generateMappings(appDataPath: string, version: string, defaultAssets: AdmZip): Promise<void> {
    const mappingsPath = path.join(appDataPath, 'mappings', version);
    files.ensureDirectory(mappingsPath);

    const vanillaTexturePaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/textures', '.png');
    await generateTextureMappings(mappingsPath, version, vanillaTexturePaths);
}

async function generateTextureMappings(mappingsPath: string, version: string, vanillaTexturePaths: string[]): Promise<void> {
    const mappingsTexturePath = path.join(mappingsPath, 'textures');
    files.ensureDirectory(mappingsTexturePath);

    const mappingsTextureFile = path.join(mappingsTexturePath, `${version}.json`);
    if(fs.existsSync(mappingsTextureFile)) {
        statusMessage(MessageType.Info, `Using existing texture mappings for version ${version}`);
        return;
    }

    const shortPaths = vanillaTexturePaths.map(p => p
        .replace('assets/minecraft/textures/', '')
        .replace('.png', ''))
    const groupedPaths: Record<string, Record<string, string>> = {};
    shortPaths.forEach(p => {
        const [prefix, ...rest] = p.split('/');
        const newPath = rest.join('/');

        if (!groupedPaths[prefix]) {
            groupedPaths[prefix] = {};
        }
        groupedPaths[prefix][newPath] = newPath;
    });

    const modifiedPaths: Record<string, Record<string, string>> = modifiedPathsMappings;
    for (const key in groupedPaths) {
        groupedPaths[key] = {...groupedPaths[key], ...modifiedPaths[key]}
    }

    const ignoredPaths: Record<string, string[] | null> = ignoredPathsMappings;
    for (const key in groupedPaths) {
        if (ignoredPaths[key] === null) {
            delete groupedPaths[key];
        } else {
            ignoredPaths[key]!.forEach(p => {
                delete groupedPaths[key][p];
            });
        }
    }

    files.writeJsonFile(mappingsTextureFile, groupedPaths);
    statusMessage(MessageType.Info, `Generated texture mappings for version ${version}`);
    return;
}