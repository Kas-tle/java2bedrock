import fs, { promises } from 'fs';
import path from 'path';
import { getErrorMessage } from './error';
import { MessageType, statusMessage } from './console';
import * as crypto from 'crypto';

export async function ensureDirectory(directory: string) {
    try {
        await promises.stat(directory);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            await promises.mkdir(directory, { recursive: true });
        } else {
            throw error;
        }
    }
}

export async function ensureDefaultDirectories(appDataPath: string) {
    ensureDirectory(path.join(appDataPath, 'default_assets'));
    ensureDirectory('./target/scratch/input');
    ensureDirectory('./target/scratch/output');
    ensureDirectory('./target/scratch/default');
}

export function writeJsonFile(filePath: string, data: any): void {
    try {
        const dirPath = path.dirname(filePath);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`Failed to write file ${path.basename(filePath)}: ${getErrorMessage(error)}`);
        if (error instanceof RangeError) {
            statusMessage(MessageType.Error, `File too big. You hate to see it.`);
        }
    }
}

export function writeTextFile(filePath: string, data: any): void {
    try {
        const dirPath = path.dirname(filePath);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, data);
    } catch (error) {
        console.error(`Failed to write file ${path.basename(filePath)}: ${getErrorMessage(error)}`);
        if (error instanceof RangeError) {
            statusMessage(MessageType.Error, `File too big. You hate to see it.`);
        }
    }
}

export function parseJsonFile<T>(filepath: string): Promise<T> {
    return JSON.parse(fs.readFileSync(filepath).toString());
}

export function fileExists(filename: string): boolean {
    return fs.existsSync(path.join(process.cwd(), filename));
}

export function deleteFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
        try {
            fs.unlinkSync(filePath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                statusMessage(MessageType.Error, `Failed to delete file ${filePath}: ${error}`);
            }
        }
    });
}

export async function copyFiles(filePaths: string[], targetFolder: string): Promise<void> {
    filePaths.forEach(filePath => {
        const targetPath = path.join(targetFolder, path.basename(filePath));
        fs.copyFile(filePath, targetPath, (error: any) => {
            if (error) {
                statusMessage(MessageType.Error, `Failed to copy file ${filePath} to ${targetPath}: ${error}`);
            }
        });
    });
}

export function absolutePath(filepath: string): string {
    return path.join(process.cwd(), filepath);
}

export function extensionlessPath(filepath: string): string {
    return path.join(path.dirname(filepath), path.basename(filepath, path.extname(filepath)));
}

export function pathFromModelEntry(entry: string): string {
    if (entry.includes(':')) {
        const [namespace, ...modelPath] = entry.split(':');
        return path.join('assets', namespace, 'models', `${modelPath}.json`);
    }
    return path.join('assets', 'minecraft', 'models', `${entry}.json`);
}

export function modelEntryFromPath(modelPath: string): string {
    // get namespace from path via regex
    const namespace = modelPath.match(/assets\/([^\/]+)\/models\//)?.[1];
    // get model path from path via regex
    const model = modelPath.match(/assets\/[^\/]+\/models\/(.*)\.json/)?.[1];
    return `${namespace}:${model}`;
}

export function pathFromTextureEntry(entry: string): string {
    if (entry.includes(':')) {
        const [namespace, ...texturePath] = entry.split(':');
        return path.join('assets', namespace, 'textures', `${texturePath}.png`);
    }
    return path.join('assets', 'minecraft', 'textures', `${entry}.png`);
}

export function javaToBedrockTexturePath(texturePath: string): string {
    return texturePath.replace(/assets\/(\w+)\/textures\//, 'textures/');
}

export function bedrockPathFromTextureEntry(entry: string): string {
    const [namespace, ...texture] = entry.split(':');
    return path.join('textures', namespace, `${texture}.png`);
}

export function namespaceEntry(entry: string): string {
    if (!entry.includes(':')) {
        return 'minecraft:' + entry;
    }
    return entry;
}

export function arrayHash(array: any[]): string {
    const jsonString = JSON.stringify(array);
    return crypto.createHash('sha256').update(jsonString).digest('hex').slice(0, 7);
}

export function objectHash(object: any): string {
    const jsonString = JSON.stringify(object);
    return crypto.createHash('sha256').update(jsonString).digest('hex').slice(0, 7);
}

export function stringHash(string: string): string {
    return crypto.createHash('sha256').update(string).digest('hex').slice(0, 7);
}

export function objectsEqual(object1: any, object2: any): boolean {
    return JSON.stringify(object1, Object.keys(object1).sort()) === JSON.stringify(object2, Object.keys(object2).sort());
}

export function sortedObject<T extends Record<string, any>>(unordered: T): T {
    const sorted: Partial<T> = Object.keys(unordered).sort().reduce(
        (obj, key) => {
            obj[key as keyof T] = unordered[key];
            return obj;
        },
        {} as Partial<T>
    );
    return sorted as T;
}