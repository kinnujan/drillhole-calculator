import { LOG_LEVELS, CONFIG } from './constants.js';

let currentLogLevel = LOG_LEVELS[CONFIG.logLevel];

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
    if (LOG_LEVELS[level] >= currentLogLevel && CONFIG.environment === 'development') {
        const message = args.join(' ');
        console[level.toLowerCase()](formatLogMessage(level, message));
    }
}

export function debug(...args) {
    if (CONFIG.environment === 'development') {
        log('DEBUG', ...args);
    }
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

// Production-safe logging function
export function safeLog(level, ...args) {
    if (LOG_LEVELS[level] >= currentLogLevel) {
        const message = args.join(' ');
        if (CONFIG.environment === 'production') {
            // In production, you might want to send logs to a server or a logging service
            // For now, we'll just use console.log for all levels in production
            console.log(formatLogMessage(level, message));
        } else {
            console[level.toLowerCase()](formatLogMessage(level, message));
        }
    }
}
