import { handleError } from './utils.js';
import { DEFAULT_SETTINGS, CURRENT_SETTINGS_VERSION } from './constants.js';

/**
 * Saves measurements to local storage
 * @param {Array} measurements - Array of measurement objects
 * @returns {Promise<void>}
 */
export async function saveMeasurements(measurements) {
    console.log("Saving measurements to local storage...");
    try {
        if (typeof localStorage === 'undefined') {
            throw new Error('localStorage is not available');
        }
        await localStorage.setItem('drillHoleMeasurements', JSON.stringify(measurements));
        console.log("Measurements saved successfully.");
    } catch (error) {
        handleError(error, "Error saving measurements");
    }
}

/**
 * Loads measurements from local storage
 * @returns {Promise<Array>} Array of measurement objects
 */
export async function loadMeasurementsFromStorage() {
    console.log("Loading measurements from local storage...");
    try {
        const savedMeasurements = await localStorage.getItem('drillHoleMeasurements');
        const parsedMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
        console.log("Measurements loaded successfully.");
        return parsedMeasurements;
    } catch (error) {
        handleError(error, "Error loading measurements");
        return [];
    }
}

/**
 * Saves drill hole info to local storage
 * @param {Object} info - Drill hole info object
 * @returns {Promise<void>}
 */
export async function saveDrillHoleInfo(info) {
    console.log("Saving drill hole info to local storage...");
    try {
        await localStorage.setItem('drillHoleInfo', JSON.stringify(info));
        console.log("Drill hole info saved successfully.");
    } catch (error) {
        handleError(error, "Error saving drill hole info");
    }
}

/**
 * Loads drill hole info from local storage
 * @returns {Promise<Object|null>} Drill hole info object or null
 */
export async function loadDrillHoleInfo() {
    console.log("Loading drill hole info from local storage...");
    try {
        const savedDrillHoleInfo = await localStorage.getItem('drillHoleInfo');
        const parsedDrillHoleInfo = savedDrillHoleInfo ? JSON.parse(savedDrillHoleInfo) : null;
        console.log("Drill hole info loaded successfully.");
        return parsedDrillHoleInfo;
    } catch (error) {
        handleError(error, "Error loading drill hole info");
        return null;
    }
}

/**
 * Saves settings to local storage
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
    console.log("Saving settings to local storage...");
    try {
        await localStorage.setItem('appSettings', JSON.stringify(settings));
        console.log("Settings saved successfully.");
    } catch (error) {
        handleError(error, "Error saving settings");
    }
}

/**
 * Loads settings from local storage
 * @returns {Promise<Object>} Settings object
 */
export async function loadSettings() {
    console.log("Loading settings from local storage...");
    try {
        const savedSettings = await localStorage.getItem('appSettings');
        let parsedSettings = savedSettings ? JSON.parse(savedSettings) : null;

        if (!parsedSettings || parsedSettings.version < CURRENT_SETTINGS_VERSION) {
            // Merge existing settings with default settings
            parsedSettings = {
                ...DEFAULT_SETTINGS,
                ...parsedSettings,
                version: CURRENT_SETTINGS_VERSION,
                hapticFeedback: parsedSettings?.hapticFeedback ?? DEFAULT_SETTINGS.hapticFeedback
            };
            // Save the updated settings
            await saveSettings(parsedSettings);
        }

        // Ensure all default settings are present
        for (const key in DEFAULT_SETTINGS) {
            if (parsedSettings[key] === undefined) {
                parsedSettings[key] = DEFAULT_SETTINGS[key];
            }
        }

        console.log("Settings loaded successfully.");
        return parsedSettings;
    } catch (error) {
        handleError(error, "Error loading settings");
        return DEFAULT_SETTINGS;
    }
}
