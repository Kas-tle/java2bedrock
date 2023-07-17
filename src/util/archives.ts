import AdmZip from 'adm-zip';

export function listFilePathsInZip(zipPaths: string[], targetFolder: string, extension: string = ''): string[] {
    let filePaths: string[] = [];

    for (const zipPath of zipPaths) {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        for (const zipEntry of zipEntries) {
            // Normalize file paths to have forward slashes (useful for cross-platform consistency)
            const normalizedEntryName = zipEntry.entryName.replace(/\\/g, '/');
            
            if (normalizedEntryName.startsWith(targetFolder) && normalizedEntryName.endsWith(extension)) {
                filePaths.push(normalizedEntryName);
            }
        }
    }

    return filePaths;
}

export function subZip(sourceZipPath: string, targetZipPath: string, folder: string): void {
    // Read the source zip file
    const sourceZip = new AdmZip(sourceZipPath);
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