#! /usr/bin/env node

import packageJson from './package.json';
import { getConfig } from './src/util/config';
import { MessageType, statusMessage } from "./src/util/console";
import * as files from './src/util/files';
import getAppDataPath from "appdata-path";
import { cacheVanillaAssets } from './src/util/default';
import { generateMappings } from './src/util/mappings';
import AdmZip from 'adm-zip';
import { convertTextures } from './src/converter/textures';
import path from 'path';
import { convertManifest } from './src/converter/manifest';
import { convertItems } from './src/converter/items';

async function main(): Promise<void> {
    // Needed for exit handler
    process.stdin.resume();

    statusMessage(MessageType.Info, `Starting ${packageJson.name} v${packageJson.version}...`);

    const appDataPath = getAppDataPath(packageJson.name);
    files.ensureDefaultDirectories(appDataPath);
    const config = await getConfig();

    const defaultAssetsZip = await cacheVanillaAssets(config.vanillaClientManifest!, config.defaultAssetVersion!, appDataPath);
    const mappings = await generateMappings(appDataPath, config.defaultAssetVersion!, defaultAssetsZip);

    const inputAssetsZip = new AdmZip(config.inputJavaPack!);
    const mergeAssetsZip = config.bedrockMergePack !== null ? new AdmZip(config.bedrockMergePack) : null;
    const convertedAssetsZip = new AdmZip();

    // Manifest / pack.mcmeta
    await convertManifest(inputAssetsZip, convertedAssetsZip, mergeAssetsZip);

    // Textures
    const movedTextures = await convertTextures(inputAssetsZip, convertedAssetsZip, mappings.textureMappings);

    // Items
    await convertItems(inputAssetsZip, convertedAssetsZip, defaultAssetsZip, config.defaultAssetVersion!, movedTextures, config.atachableMaterial);


    convertedAssetsZip.writeZip(path.join(process.cwd(), 'target', 'geyser_resources.zip'));
    return;
}

main();