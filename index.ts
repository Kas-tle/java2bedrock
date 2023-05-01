#! /usr/bin/env node

import packageJson from './package.json';
import { MessageType, statusMessage } from "./src/util/console";

async function main(): Promise<void> {
    // Needed for exit handler
    process.stdin.resume();

    statusMessage(MessageType.Info, `Starting ${packageJson.name} v${packageJson.version}...`);

    return;
}

main();