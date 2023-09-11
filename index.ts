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
import { convertBlocks } from './src/converter/blocks';
import { GeyserMappings } from './src/types/converter/mappings';

async function main(): Promise<void> {
    // Needed for exit handler
    process.stdin.resume();
    const startTime = Date.now();

    statusMessage(MessageType.Info, `Starting ${packageJson.name} v${packageJson.version}...`);

    const appDataPath = getAppDataPath(packageJson.name);
    files.ensureDefaultDirectories(appDataPath);
    const config = await getConfig();

    const defaultAssetsZip = await cacheVanillaAssets(config.vanillaClientManifest!, config.defaultAssetVersion!, appDataPath);
    const mappings = await generateMappings(appDataPath, config.defaultAssetVersion!, defaultAssetsZip);
    const geyserMappings: GeyserMappings = {
        format_version: "1",
        items: {},
        blocks: {}
    };

    const inputAssetsZip = new AdmZip(config.inputJavaPack!);
    const mergeAssetsZip = config.bedrockMergePack !== null ? new AdmZip(config.bedrockMergePack) : null;
    const convertedAssetsZip = new AdmZip();

    // Manifest / pack.mcmeta
    await convertManifest(inputAssetsZip, convertedAssetsZip, mergeAssetsZip);

    // Textures
    const movedTextures = await convertTextures(inputAssetsZip, convertedAssetsZip, mappings.textureMappings);

    // Items
    geyserMappings['items'] = await convertItems(inputAssetsZip, convertedAssetsZip, defaultAssetsZip, mergeAssetsZip, movedTextures, config, mappings.itemMappings);

    // Blocks
    geyserMappings['blocks'] = await convertBlocks(inputAssetsZip, convertedAssetsZip, defaultAssetsZip, mergeAssetsZip, movedTextures, config);

    convertedAssetsZip.writeZip(path.join(process.cwd(), 'target', 'geyser_resources.zip'));
    files.writeJsonFile(path.join(process.cwd(), 'target', 'geyser_mappings.json'), geyserMappings);

    const itemCount = geyserMappings.items ? Object.values(geyserMappings.items).reduce((total, currentArray) => total + currentArray.length, 0) : 0;
    const blockCount = geyserMappings.blocks ? Object.values(geyserMappings.blocks).reduce((total, currentArray) => total + Object.values(currentArray).length, 0) : 0;

    const completionTime = (Date.now() - startTime) / 1000;
    statusMessage(MessageType.Completion, `Conversion complete for ${itemCount} items and ${blockCount} blocks in ${completionTime}s`);
    return;
}

main();