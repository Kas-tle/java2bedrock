import AdmZip from "adm-zip";
import * as archives from '../util/archives';
import { ItemModel } from "../types/java/model";
import minecraftData from 'minecraft-data'
import { ItemEntry } from "../types/util";

export async function convertItems(inputAssets: AdmZip, convertedAssets: AdmZip, defaultAssets: AdmZip): Promise<void> {
    // Scan for vanilla items
    const vanillaItems = await scanVanillaItems(inputAssets, defaultAssets);

    // Scan for predicates
}

async function scanVanillaItems(inputAssets: AdmZip, defaultAssets: AdmZip): Promise<{ path: string, model: ItemModel }[]> {
    const vanillaItemPaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/models/item', '.json');
    const inputItemPaths = archives.listFilePathsInZip(inputAssets, 'assets/minecraft/models/item', '.json');
    const validItemPaths = inputItemPaths.filter(p => vanillaItemPaths.includes(p));

    return await Promise.all(validItemPaths.map(async p => (
        { path: p, model: await archives.parseJsonFromZip<ItemModel>(inputAssets, p) }
    )));
}

async function scanPredicates(vanillaItems: { path: string, model: ItemModel }[], inputAssets: AdmZip): Promise<void> {
    const predicates: ItemEntry[] = [];

    for (const vanillaItem of vanillaItems) {
        if (vanillaItem.model.overrides != null) {
            for (const override of vanillaItem.model.overrides) {
                
            }
        }
    }
}