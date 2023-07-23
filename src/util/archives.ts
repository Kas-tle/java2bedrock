import AdmZip from 'adm-zip';
import path from 'path';

export function listFilePathsInZip(zip: AdmZip, targetFolder: string, extension: string = ''): string[] {
    let filePaths: string[] = [];
    const zipEntries = zip.getEntries();

    for (const zipEntry of zipEntries) {
        // Normalize file paths to have forward slashes (useful for cross-platform consistency)
        const normalizedEntryName = zipEntry.entryName.replace(/\\/g, '/');

        if (normalizedEntryName.startsWith(targetFolder) && normalizedEntryName.endsWith(extension)) {
            filePaths.push(normalizedEntryName);
        }
    }

    return filePaths;
}

export function subZip(sourceZip: AdmZip, folder: string): AdmZip {
    // Read the source zip file
    const sourceEntries = sourceZip.getEntries();

    // Create a new zip file
    const targetZip = new AdmZip();

    for (const entry of sourceEntries) {
        // Normalize file paths to have forward slashes (useful for cross-platform consistency)
        const normalizedEntryName = entry.entryName.replace(/\\/g, '/');

        // Check if the entry is a file in the target folder
        if (!entry.isDirectory && normalizedEntryName.startsWith(folder)) {
            // Add the file to the target zip file
            targetZip.addFile(entry.entryName, entry.getData());
        }
    }

    return targetZip;
}

export function insertInZip(zip: AdmZip, files: {file: string, path: string}[]): void {
    // Add each file to the zip
    for (const file of files) {
        zip.addLocalFile(file.file, path.dirname(file.file), path.basename(file.file));
    }
}

export function insertRawInZip(zip: AdmZip, files: {file: string, data: Buffer}[]): void {
    // Add each file to the zip
    for (const file of files) {
        zip.addFile(file.file, file.data);
    }
}

export function transferFromZip(sourceZip: AdmZip, targetZip: AdmZip, files: {file: string, path: string}[]): void {
    // Add each file to the zip
    for (const file of files) {
        const sourceEntry = sourceZip.getEntry(file.file);
        if (sourceEntry) {
            targetZip.addFile(file.path, sourceEntry.getData());
        }
    }
}

export function parseJsonFromZip<T>(zip: AdmZip, filePath: string): Promise<T> {
    const entry = zip.getEntry(filePath);
    if (!entry) {
        return Promise.reject(`Could not find file ${filePath} in zip`);
    }
    return JSON.parse(entry.getData().toString());
}