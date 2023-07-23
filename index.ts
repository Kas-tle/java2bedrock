#! /usr/bin/env node

import packageJson from './package.json';
import { getConfig } from './src/util/config';
import { MessageType, statusMessage } from "./src/util/console";
import * as files from './src/util/files';
import getAppDataPath from "appdata-path";
import { cacheVanillaAssets } from './src/util/default';

async function main(): Promise<void> {
    // Needed for exit handler
    process.stdin.resume();

    statusMessage(MessageType.Info, `Starting ${packageJson.name} v${packageJson.version}...`);

    const appDataPath = getAppDataPath(packageJson.name);
    files.ensureDefaultDirectories(appDataPath);
    const config = await getConfig();

    await cacheVanillaAssets(config.vanillaClientManifest!, config.defaultAssetVersion!, appDataPath);

    // Scan predicates from pack
    // Only look in files that are overlap of [default_assets/.../items/*.json] and [input_pack/.../items/*.json]

    return;
}

main();