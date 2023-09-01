import path from 'path';
import ignoredTexturePathsMappings from '../resources/mappings/textures/ignored.json';
import modifiedTexturePathsMappings from '../resources/mappings/textures/modified.json';
import rootTexturePathsMappings from '../resources/mappings/textures/root.json';
import itemIconMappings from '../resources/mappings/items/icon.json';
import * as files from './files';
import * as archives from './archives';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { MessageType, statusMessage } from './console';
import { Item, Mappings, Sound, Texture } from '../types/mappings';

export async function generateMappings(appDataPath: string, version: string, defaultAssets: AdmZip): Promise<Mappings> {
    const mappingsPath = path.join(appDataPath, 'mappings', version);
    files.ensureDirectory(mappingsPath);

    const vanillaTexturePaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/textures', '.png');
    const textureMappings = await generateTextureMappings(mappingsPath, version, vanillaTexturePaths);

    const itemMappings = await generateItemMappings();

    const vanillaSoundPaths = archives.listFilePathsInZip(defaultAssets, 'assets/minecraft/sounds', '.ogg');
    const soundMappings = await generateSoundMappings(mappingsPath, version, vanillaSoundPaths);

    return {
        textureMappings,
        itemMappings,
        soundMappings
    }
}

async function generateItemMappings(): Promise<Mappings['itemMappings']> {
    const iconMappings: Item.Icons = itemIconMappings;

    return {
        icons: iconMappings
    };
}

async function generateTextureMappings(mappingsPath: string, version: string, vanillaTexturePaths: string[]): Promise<Mappings['textureMappings']> {
    const mappingsTexturePath = path.join(mappingsPath, 'textures');
    files.ensureDirectory(mappingsTexturePath);

    const mappingsTextureFile = path.join(mappingsTexturePath, `${version}.json`);
    const rootPaths: Texture.RootMappings = rootTexturePathsMappings;
    if(fs.existsSync(mappingsTextureFile)) {
        statusMessage(MessageType.Info, `Found cached texture mappings for version ${version}`);
        return {nested: await files.parseJsonFile<Texture.Mappings>(mappingsTextureFile), root: rootPaths};
    }

    const shortPaths = vanillaTexturePaths.map(p => p
        .replace('assets/minecraft/textures/', '')
        .replace('.png', ''))
    const groupedPaths: Texture.Mappings = {};
    shortPaths.forEach(p => {
        const [prefix, ...rest] = p.split('/');
        const newPath = rest.join('/');

        if (!groupedPaths[prefix]) {
            groupedPaths[prefix] = {};
        }
        groupedPaths[prefix][newPath] = newPath;
    });

    const modifiedPaths: Texture.Mappings = modifiedTexturePathsMappings;
    for (const key in groupedPaths) {
        groupedPaths[key] = {...groupedPaths[key], ...modifiedPaths[key]}
    }

    const ignoredPaths: Texture.IgnoredMappings = ignoredTexturePathsMappings;
    for (const key in groupedPaths) {
        if (rootPaths[key] === null) {
            delete groupedPaths[key];
        } else {
            (ignoredPaths[key] ?? []).forEach(p => {
                delete groupedPaths[key][p];
            });
        }
    }

    files.writeJsonFile(mappingsTextureFile, groupedPaths);
    statusMessage(MessageType.Info, `Generated texture mappings for version ${version}`);
    return {nested: groupedPaths, root: rootPaths};
}

async function generateSoundMappings(mappingsPath: string, version: string, vanillaSoundPaths: string[]): Promise<Mappings['soundMappings']> {
    const mappings: Sound.Mappings = {
        files: {},
        identifiers: {}
    };
    return mappings;
    // temp no-op
    
    const mappingsSoundPath = path.join(mappingsPath, 'sounds');
    files.ensureDirectory(mappingsSoundPath);

    const mappingsSoundFile = path.join(mappingsSoundPath, `${version}.json`);
    if(fs.existsSync(mappingsSoundFile)) {
        statusMessage(MessageType.Info, `Found cached sound mappings for version ${version}`);
        return await files.parseJsonFile(mappingsSoundFile);
    }

    const shortPaths = vanillaSoundPaths.map(p => p
        .replace('assets/minecraft/sounds/', '')
        .replace('.ogg', ''))
    const groupedPaths: {[key: string]: string[]} = {};
    shortPaths.forEach(p => {
        const [prefix, ...rest] = p.split('/');
        const newPath = rest.join('/');

        if (!groupedPaths[prefix]) {
            groupedPaths[prefix] = [];
        }
        groupedPaths[prefix].push(newPath);
    });

    files.writeJsonFile(mappingsSoundFile, groupedPaths);
    statusMessage(MessageType.Info, `Generated sound mappings for version ${version}`);
    return mappings;
}

