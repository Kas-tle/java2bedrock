import AdmZip from "adm-zip";
import * as archives from '../util/archives';
import { Pack } from "../types/java/mcmeta";
import { Manifest } from "../types/bedrock/manifest";
import { randomUUID } from 'crypto';
import { MessageType, statusMessage } from "../util/console";

export async function convertManifest(inputAssets: AdmZip, convertedAssets: AdmZip, mergeAssetsZip: AdmZip | null): Promise<void> {
    let manifest: Manifest;
    if (mergeAssetsZip !== null) {
        manifest = await archives.parseJsonFromZip(mergeAssetsZip, 'manifest.json');
        statusMessage(MessageType.Info, "Converted manifest.json from merged bedrock pack");
    } else {
        const packMcmeta: Pack = await archives.parseJsonFromZip(inputAssets, 'pack.mcmeta');
        manifest = {
            format_version: 2,
            header: {
                description: 'Adds 3D items for use with a Geyser proxy',
                name: packMcmeta.pack.description.toString(),
                uuid: randomUUID(),
                version: [1, 0, 0],
                min_engine_version: [1, 18, 3]
            },
            modules: [
                {
                    description: 'Adds 3D items for use with a Geyser proxy',
                    type: 'resources',
                    uuid: randomUUID(),
                    version: [1, 0, 0]
                }
            ]
        };
        statusMessage(MessageType.Info, "Converted manifest.json from pack.mcmeta");
    }
    archives.insertRawInZip(convertedAssets, [{file: 'manifest.json', data: Buffer.from(JSON.stringify(manifest))}]);
}