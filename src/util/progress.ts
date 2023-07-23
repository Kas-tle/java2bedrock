import cliProgress from 'cli-progress';
import chalk from 'chalk';

export function downloadBar(): cliProgress.SingleBar {
    return new cliProgress.SingleBar({
        format: chalk.yellow('[•]') + chalk.ansi256(246)(' | ') + chalk.yellow('{bar}') + chalk.ansi256(246)(' | {prefix} | {percentage}% | ETA: {eta_formatted}'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
};

export function defaultBar(): cliProgress.SingleBar {
    return new cliProgress.SingleBar({
        format: chalk.yellow('[•]') + chalk.ansi256(246)(' | ') + chalk.yellow('{bar}') + chalk.ansi256(246)(' | {prefix} | {percentage}% | {value}/{total} | ETA: {eta_formatted}'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
};