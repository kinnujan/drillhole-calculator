import { LOG_LEVELS } from './constants.js';

let currentLogLevel = LOG_LEVELS.INFO;

function formatLogMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${level}] ${message}`;
}

export function setLogLevel(level) {
    if (LOG_LEVELS.hasOwnProperty(level)) {
        currentLogLevel = LOG_LEVELS[level];
    }
}

export function log(level, ...args) {
    if (LOG_LEVELS[level] >= currentLogLevel) {
        const message = args.join(' ');
        console[level.toLowerCase()](formatLogMessage(level, message));
    }
}

export function debug(...args) {
    log('DEBUG', ...args);
}

export function info(...args) {
    log('INFO', ...args);
}

export function warn(...args) {
    log('WARN', ...args);
}

export function error(...args) {
    log('ERROR', ...args);
}
