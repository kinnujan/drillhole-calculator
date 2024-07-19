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
    customColorEnabled: false
};

export const CURRENT_SETTINGS_VERSION = 8;

// Custom color function constants
export const COLOR_MIN_SATURATION = 70;
export const COLOR_MAX_SATURATION = 100;
export const COLOR_MIN_LIGHTNESS = 25;
export const COLOR_MAX_LIGHTNESS = 50;
export const COLOR_TEXT_SHADOW = `
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 3px #000,
    0 0 5px #000,
    0 0 7px #000
`;
export const COLOR_OVERLAY_OPACITY = 0.3;