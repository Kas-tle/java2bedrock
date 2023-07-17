import fs, { promises } from 'fs';
import path from 'path';
import { getErrorMessage } from './error';
import { MessageType, statusMessage } from './console';
import { error } from 'console';

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

export function writeJsonFile(filename: string, data: any): void {
    try {
        const filePath = path.join(process.cwd(), filename);
        const dirPath = path.dirname(filePath);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`Failed to write file ${filename}: ${getErrorMessage(error)}`);
        if (error instanceof RangeError) {
            statusMessage(MessageType.Error, `File too big. You hate to see it.`);
        }
    }
}

export function writeTextFile(filename: string, data: any): void {
    try {
        const filePath = path.join(process.cwd(), filename);
        const dirPath = path.dirname(filePath);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, data);
    } catch (error) {
        console.error(`Failed to write file ${filename}: ${getErrorMessage(error)}`);
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