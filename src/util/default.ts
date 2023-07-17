import fs from 'fs';
import path from 'path';
import * as files from './files';
import * as archives from './archives';
import { Piston } from '../types/piston';

export async function cacheVanillaAssets(version: string, hash: string, appDataPath: string): Promise<void> {
    const minecraftDirectory = require('minecraft-folder-path');
    const minecraftJarPath = path.join(minecraftDirectory, 'versions', version, `${version}.jar`);
    const minecraftJsonPath = path.join(minecraftDirectory, 'versions', version, `${version}.json`);
    const localAssetPath = path.join(appDataPath, 'default_assets', version, `${version}.zip`);

    if (fs.existsSync(localAssetPath)) {
        return;
    } else if (fs.existsSync(minecraftJarPath)) {
        files.ensureDirectory(path.dirname(localAssetPath));
        archives.subZip(minecraftJarPath, localAssetPath, 'assets');
        if (fs.existsSync(minecraftJsonPath)) {
            const minecraftJson = await files.parseJsonFile<Piston.Assets>(minecraftJsonPath);
            const assetHashes = filterAssetHashes(minecraftJson);
            
        }
        return;
    } else {
        
    }
}

async function insertRemoteHashedAssets(version: string, hash: string, appDataPath: string): Promise<void> {
    
}

function filterAssetHashes(assets: Piston.Assets): string[] {
    return Object.keys(assets.objects)
        .filter(key => key.includes('/textures/') || key.endsWith('/sounds.json') || key === 'pack.mcmeta')
        .map(key => assets.objects[key].hash);
}