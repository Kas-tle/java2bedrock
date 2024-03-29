import fs from 'fs';
import path from 'path';
import { MessageType, statusMessage } from './console';
import { select, input, confirm } from '@inquirer/prompts';
import { jsonGetRequest } from './request';
import { Piston } from '../types/piston';
import * as files from './files';
import { GeyserPredicate } from '../types/converter/items';

export interface Config {
    inputJavaPack: string | null;
    bedrockMergePack: string | null;
    atachableMaterial: string | null;
    blockMaterial: string | null;
    defaultAssetVersion: string | null;
    vanillaClientManifest: string | null;
    saveScratch: boolean;
    ignorePathLimit: boolean;
    spriteMappings: {
        [key: string]: SpriteConfigEntry[];
    } | null;
}

export interface SpriteConfigEntry {
    sprite: string;
    overrides: GeyserPredicate;
}

const defaultConfig: Config = {
    inputJavaPack: null,
    bedrockMergePack: null,
    atachableMaterial: null,
    blockMaterial: null,
    defaultAssetVersion: null,
    vanillaClientManifest: null,
    saveScratch: true,
    ignorePathLimit: false,
    spriteMappings: null
};

let cachedConfig: Config | null = null;

export async function getConfig(): Promise<Config> {
    if (cachedConfig) {
        return cachedConfig;
    }
    try {
        const config = await files.parseJsonFile<Config>(files.absolutePath('config.json'));
        cachedConfig = config;
        return config;
    } catch (err) {
        statusMessage(
            MessageType.Info, 
            "No config file found. Please provide the required config values",
            "Simply input the value and press enter to proceed to the next value",
            "If you need help, please visit https://github.com/Kas-tle/java2bedrock",
            "Press Ctrl+C to cancel"
        );
        statusMessage(MessageType.Plain, "");
        const newConfig = await promptForConfig();
        await fs.promises.writeFile("config.json", JSON.stringify(newConfig, null, 4));
        cachedConfig = newConfig;
        return newConfig;
    }
};

async function promptForConfig(): Promise<Config> {
    function getExtFiles(dir: string, extensions: string[]): Promise<{value: string}[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    const zipFiles = files.filter(file => extensions.includes(path.extname(file))).map(file => ({ value: file }));
                    resolve(zipFiles);
                }
            });
        });
    }

    const pistonManifest: Piston.Manifest = await jsonGetRequest('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');

    const zipFiles = await getExtFiles(process.cwd(), ['.zip']);

    if (!zipFiles.length) {
        throw new Error("No zip files found in current directory. Please provide a pack to convert.");
    }

    let inputJavaPack = zipFiles.length === 1 ? zipFiles[0].value : 
        await select({ 
            message: "Input Java Pack:",
            choices: zipFiles
        });
    let bedrockMergePack: string | null = 'None';
    let atachableMaterial: string | null = 'Assign automatically';
    let blockMaterial: string | null = 'Assign automatically';
    let defaultAssetVersion = pistonManifest.latest.release;
    let saveScratch = true;
    let ignorePathLimit = false;

    let confirmed = false;

    while (!confirmed) {
        statusMessage(
            MessageType.Plain, 
            `Input Java Pack: ${inputJavaPack}`,
            `Bedrock Merge Pack: ${bedrockMergePack}`,
            `Atachable Material: ${atachableMaterial}`,
            `Block Material: ${blockMaterial}`,
            `Default Asset Version: ${defaultAssetVersion}`,
            `Save Scratch: ${saveScratch}`,
            `Ignore Path Limit: ${ignorePathLimit}`,
            ''
        );

        confirmed = await confirm({ message: 'Are these settings correct:' });

        if (!confirmed) {
            const fieldToEdit = await select({
                message: 'Which field would you like to edit?',
                choices: [
                    { name: 'Input Java Pack', value: 'inputJavaPack' },
                    { name: 'Bedrock Merge Pack', value: 'bedrockMergePack' },
                    { name: 'Atachable Material', value: 'atachableMaterial' },
                    { name: 'Block Material', value: 'blockMaterial' },
                    { name: 'Default Asset Version', value: 'defaultAssetVersion' },
                    { name: 'Save Scratch', value: 'saveScratch' },
                    { name: 'Ignore Path Limit', value: 'ignorePathLimit' },
                ]
            });

            switch (fieldToEdit) {
                case 'inputJavaPack':
                    inputJavaPack = await select({ 
                        message: "Input Java Pack:",
                        choices: await getExtFiles(process.cwd(), ['.zip'])
                    });
                    break;
                case 'bedrockMergePack':
                    bedrockMergePack = await select({
                        message: "Bedrock Merge Pack:",
                        choices: [...await getExtFiles(process.cwd(), ['.mcpack', '.zip']), { value: 'None' }]
                    });
                    if (bedrockMergePack === inputJavaPack) {
                        statusMessage(MessageType.Error, "Bedrock Merge Pack cannot be the same as Input Java Pack");
                        bedrockMergePack = 'None';
                    }
                    break;
                case 'atachableMaterial':
                    atachableMaterial = await input({ message: "Atachable Material:", default: 'Assign automatically' });
                    break;
                case 'blockMaterial':
                    blockMaterial = await select({ 
                        message: "Block Material:", 
                        choices: [
                            { value:  'opaque' },
                            { value:  'alpha_test' },
                            { value:  'blend' },
                            { value:  'double_sided' },
                            { value: 'Assign automatically' },
                        ]
                    });
                    break;
                case 'defaultAssetVersion':
                    defaultAssetVersion = await input({ message: "Default Asset Version:", default: pistonManifest.latest.release });
                    if (!pistonManifest.versions.find(version => version.id === defaultAssetVersion)) {
                        statusMessage(MessageType.Error, `Invalid version: ${defaultAssetVersion}`);
                        defaultAssetVersion = pistonManifest.latest.release;
                    }
                    break;
                case 'saveScratch':
                    saveScratch = await confirm({ message: "Save Scratch:", default: true });
                    break;
                case 'ignorePathLimit':
                    ignorePathLimit = await confirm({ message: "Ignore Path Limit:", default: false });
                    break;
                default:
                    throw new Error(`Unknown field ${fieldToEdit}`);
            }
        }
    }

    bedrockMergePack = bedrockMergePack === 'None' ? null : bedrockMergePack;
    atachableMaterial = atachableMaterial === 'Assign automatically' ? null : atachableMaterial;
    blockMaterial = blockMaterial === 'Assign automatically' ? null : blockMaterial;

    const vanillaClientManifest = pistonManifest.versions.find(version => version.id === defaultAssetVersion)?.url;
    if (!vanillaClientManifest) {
        throw new Error(`Could not find vanilla client url for version ${defaultAssetVersion}`);
    }

    statusMessage(MessageType.Info, `Using vanilla client url: ${vanillaClientManifest}`);

    return {
        ...defaultConfig,
        inputJavaPack,
        bedrockMergePack,
        atachableMaterial,
        blockMaterial,
        defaultAssetVersion,
        vanillaClientManifest,
        saveScratch,
        ignorePathLimit
    };
}