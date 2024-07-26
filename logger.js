import fs from 'fs';
import path from 'path';

const LOG_FILE = 'app.log';
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

let currentLogLevel = LOG_LEVELS.INFO;

function ensureLogFileExists() {
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '');
    }
}

function formatLogMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${level}] ${message}\n`;
}

function writeToLogFile(message) {
    ensureLogFileExists();
    fs.appendFileSync(LOG_FILE, message);
}

export function setLogLevel(level) {
    if (LOG_LEVELS.hasOwnProperty(level)) {
        currentLogLevel = LOG_LEVELS[level];
    }
}

export function log(level, ...args) {
    if (LOG_LEVELS[level] >= currentLogLevel) {
        const message = args.join(' ');
        console[level.toLowerCase()](message);
        writeToLogFile(formatLogMessage(level, message));
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
