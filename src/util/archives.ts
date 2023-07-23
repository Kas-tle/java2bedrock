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

export function subZip(sourceZip: AdmZip, targetZipPath: string, folder: string): void {
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

    // Write the new zip file to disk
    targetZip.writeZip(targetZipPath);
}

export function insertInZip(zipPath: string, files: {file: string, path: string}[]): void {
    // Load an existing zip file
    let zip = new AdmZip(zipPath);

    // Add each file to the zip
    for (const file of files) {
        zip.addLocalFile(file.file, path.dirname(file.file), path.basename(file.file));
    }

    // Write the changes back to the zip file
    zip.writeZip(/*overwrite*/zipPath);
}

export function insertRawInZip(zipPath: string, files: {file: string, data: Buffer}[]): void {
    // Load an existing zip file
    let zip = new AdmZip(zipPath);

    // Add each file to the zip
    for (const file of files) {
        zip.addFile(file.file, file.data);
    }

    // Write the changes back to the zip file
    zip.writeZip(/*overwrite*/zipPath);
}