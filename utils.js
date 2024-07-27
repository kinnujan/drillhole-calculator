/**
 * Converts degrees to radians
 * @param {number} angle - Angle in degrees
 * @returns {number} Angle in radians
 */
export const toRadians = (angle) => {
    if (typeof angle !== 'number') {
        throw new Error('Invalid input: angle must be a number');
    }
    return angle * Math.PI / 180;
};

/**
 * Converts radians to degrees
 * @param {number} angle - Angle in radians
 * @returns {number} Angle in degrees
 */
export const toDegrees = (angle) => {
    if (typeof angle !== 'number') {
        throw new Error('Invalid input: angle must be a number');
    }
    return angle * 180 / Math.PI;
};

/**
 * Calculates strike based on dip direction and strike mode
 * @param {number} dipDirection - Dip direction in degrees
 * @param {string} strikeMode - Strike mode ('negative' or 'positive')
 * @returns {number} Strike in degrees
 */
export function calculateStrike(dipDirection, strikeMode) {
    if (typeof dipDirection !== 'number' || dipDirection < 0 || dipDirection >= 360) {
        throw new Error('Invalid dipDirection: must be a number between 0 and 359');
    }
    if (strikeMode !== 'negative' && strikeMode !== 'positive') {
        throw new Error('Invalid strike mode: must be either "negative" or "positive"');
    }
    
    if (strikeMode === 'negative') {
        return (dipDirection - 90 + 360) % 360;
    } else {
        return (dipDirection + 90) % 360;
    }
}

/**
 * Validates input values for hole dip, hole azimuth, alpha, and beta
 * @param {number} holeDip - Hole dip in degrees
 * @param {number} holeAzimuth - Hole azimuth in degrees
 * @param {number} alpha - Alpha angle in degrees
 * @param {number} beta - Beta angle in degrees
 * @returns {string|null} Error message if validation fails, null otherwise
 */
export function validateInputs(holeDip, holeAzimuth, alpha, beta) {
    try {
        if (holeDip < -90 || holeDip > 90) throw new Error("Hole Dip must be between -90° and 90°");
        if (holeAzimuth < 0 || holeAzimuth > 360) throw new Error("Hole Azimuth must be between 0° and 360°");
        if (alpha < 0 || alpha > 90) throw new Error("Alpha (Core Angle) must be between 0° and 90°");
        if (beta < 0 || beta > 360) throw new Error("Beta must be between 0° and 360°");
        return null;
    } catch (error) {
        console.error('Error in validateInputs:', error);
        return error.message;
    }
}

// Export errorService for use in other modules
import errorService from './errorService.js';
export { errorService };

/**
 * Debounces a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            try {
                func(...args);
            } catch (error) {
                console.error('Error in debounced function:', error);
                throw error;
            }
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
