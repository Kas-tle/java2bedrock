import chalk from 'chalk';

export enum MessageType {
    Completion = 'completion',
    Process = 'process',
    Critical = 'critical',
    Error = 'error',
    Info = 'info',
    Plain = 'plain'
}

export function statusMessage(type: MessageType, ...messages: string[]) {
    switch (type) {
        case MessageType.Completion:
            messages.forEach((message) => console.log(chalk.green(`[+] ${chalk.ansi256(246)(message)}`)));
            break;
        case MessageType.Process:
            messages.forEach((message) => console.log(chalk.yellow(`[•] ${chalk.ansi256(246)(message)}`)));
            break;
        case MessageType.Critical:
            messages.forEach((message) => console.log(chalk.red(`[X] ${chalk.ansi256(246)(message)}`)));
            break;
        case MessageType.Error:
            messages.forEach((message) => console.log(chalk.red(`[ERROR] ${chalk.ansi256(246)(message)}`)));
            break;
        case MessageType.Info:
            messages.forEach((message) => console.log(chalk.blue(`[i] ${chalk.ansi256(246)(message)}`)));
            break;
        case MessageType.Plain:
            messages.forEach((message) => console.log(chalk.gray(message)));
            break;
        default:
            messages.forEach((message) => console.log(chalk.gray(message)));
    }
}