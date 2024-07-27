export const MAX_HOLE_DIP = 90;
export const MIN_HOLE_DIP = -90;
export const MAX_HOLE_AZIMUTH = 360;
export const MIN_HOLE_AZIMUTH = 0;
export const MAX_ALPHA = 90;
export const MIN_ALPHA = 0;
export const MAX_BETA = 360;
export const MIN_BETA = 0;

export const ERROR_MESSAGES = {
    HOLE_DIP: "Hole Dip must be between -90° and 90°",
    HOLE_AZIMUTH: "Hole Azimuth must be between 0° and 360°",
    ALPHA: "Alpha (Core Angle) must be between 0° and 90°",
    BETA: "Beta must be between 0° and 360°"
};

export const CSV_MIME_TYPE = 'text/csv;charset=utf-8;';

export const DEFAULT_SETTINGS = {
    darkMode: false,
    strikeMode: 'negative',
    measurementTypes: ['bedding', 'foliation', 'fault', 'shear', 'vein'],
    generationTypes: ['S0', 'S0/1', 'S1', 'S2', 'S3'],
    customTypes: [],
    hapticFeedback: true,
    undoEnabled: true,
    includeHeaderInExport: true,
    surveyImportEnabled: false,
    surveyImportFields: {
        holeId: 'Hole number',
        depth: 'Depth',
        azimuth: 'Azimuth UTM',
        dip: 'Dip'
    }
};

export const CURRENT_SETTINGS_VERSION = 13;

export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

export const CACHE_NAME = 'drill-hole-orientation-calculator-v1';

export const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/measurements.js',
  '/ui.js',
  '/storage.js',
  '/settings.js',
  '/utils.js',
  '/constants.js',
  '/csv_import.js',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

export const CSV_IMPORT_FIELDS = {
    HOLE_ID: ['hole', 'id', 'holeid', 'hole_id', 'hole id', 'HOLE', 'ID', 'HOLEID', 'HOLE_ID', 'HOLE ID'],
    DEPTH: ['depth', 'dep', 'DEPTH', 'DEP'],
    AZIMUTH: ['azimuth', 'azi', 'azimuth_utm', 'azimuth utm', 'AZIMUTH', 'AZI', 'AZIMUTH_UTM', 'AZIMUTH UTM'],
    DIP: ['dip', 'inclination', 'incl', 'DIP', 'INCLINATION', 'INCL']
};
