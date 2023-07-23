import fs from 'fs';
import path from 'path';
import * as files from './files';
import * as archives from './archives';
import { Piston } from '../types/piston';
import * as request from './request';
import AdmZip from 'adm-zip';
import { MessageType, statusMessage } from './console';
import * as progress from './progress';

export async function cacheVanillaAssets(verstionUrl: string, version: string, appDataPath: string): Promise<AdmZip> {
    const localAssetPath = path.join(appDataPath, 'default_assets', version, `${version}.zip`);
    
    if (fs.existsSync(localAssetPath)) {
        statusMessage(MessageType.Info, `Found cached assets for version ${version}`);
        return new AdmZip(localAssetPath);
    }

    const versionJson: Piston.Version = await request.jsonGetRequest(verstionUrl);
    const minecraftDirectory = require('minecraft-folder-path');
    const minecraftJarPath = path.join(minecraftDirectory, 'versions', version, `${version}.jar`);
    
    if (fs.existsSync(minecraftJarPath)) {
        files.ensureDirectory(path.dirname(localAssetPath));
        archives.subZip(new AdmZip(minecraftJarPath), localAssetPath, 'assets');
        statusMessage(MessageType.Info, `Found assets in minecraft directory for version ${version}`);

        const assetsIndexFileName = path.basename(versionJson.assetIndex.url);
        const minecraftAssetsIndexPath = path.join(minecraftDirectory, 'assets', 'indexes', `${assetsIndexFileName}.json`);
        if (fs.existsSync(minecraftAssetsIndexPath)) {
            const minecraftAssetsObjectsPath = path.join(minecraftDirectory, 'assets', 'objects');
            const assetsJson = await files.parseJsonFile<Piston.Assets>(minecraftAssetsIndexPath);
            const assets: {file: string, path: string}[] = Object.keys(assetsJson.objects)
                .filter(key => key.includes('/textures/') || key.endsWith('/sounds.json') || key === 'pack.mcmeta')
                .map(key => ({ 
                    path: key,
                    file:  path.join(
                        minecraftAssetsObjectsPath, 
                        assetsJson.objects[key].hash.substring(0, 2), 
                        assetsJson.objects[key].hash)
                }));
            archives.insertInZip(localAssetPath, assets);

            statusMessage(MessageType.Info, `Found hashed assets in minecraft directory for version ${version}`);
            return new AdmZip(localAssetPath);
        }
    }

    statusMessage(MessageType.Info, `Downloading client jar for assets version ${version}:`);
    const clientUrl = versionJson.downloads.client.url;
    const clientJarResponse = await request.getRequest(clientUrl, {}, 'arraybuffer');
    archives.subZip(new AdmZip(clientJarResponse.data), localAssetPath, 'assets');
    
    statusMessage(MessageType.Info, `Downloading hashed assets for version ${version}:`);
    const assetsJson: Piston.Assets = await request.jsonGetRequest(versionJson.assetIndex.url);
    const assets: {file: string, data: Buffer}[] = [];
    const assetKeys = Object.keys(assetsJson.objects).filter(key => key.includes('/textures/') || key.endsWith('/sounds.json') || key === 'pack.mcmeta');

    const bar = progress.defaultBar();
    bar.start(assetKeys.length, 0, {prefix: 'Hashed Assets'});
    for (const key of assetKeys) {
        bar.update({prefix: path.basename(key)});
        const assetHash = assetsJson.objects[key].hash;
        const assetUrl = `https://resources.download.minecraft.net/${assetHash.substring(0, 2)}/${assetHash}`;
        const assetResponse = await request.getRequest(assetUrl, {}, 'arraybuffer', false);
        assets.push({ file: path.join('assets', key), data: assetResponse.data });
        bar.increment();
    }
    bar.stop();

    archives.insertRawInZip(localAssetPath, assets);
    return new AdmZip(localAssetPath);
}