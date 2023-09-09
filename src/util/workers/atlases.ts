import { isMainThread, parentPort } from 'worker_threads';
import { createSpriteSheet } from '../atlases';

if (!isMainThread && parentPort != null) {
    parentPort.on('message', async (data) => {
        if (parentPort == null) return;
        const result = await createSpriteSheet(data.images, data.outputPath);
        parentPort.postMessage(result);
    });
}