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
    customTypes: []
};

export const CURRENT_SETTINGS_VERSION = 4;