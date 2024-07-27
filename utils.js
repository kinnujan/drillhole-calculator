/**
 * Converts degrees to radians
 * @param {number} angle - Angle in degrees
 * @returns {number} Angle in radians
 */
export const toRadians = (angle) => {
    try {
        return angle * Math.PI / 180;
    } catch (error) {
        console.error('Error in toRadians:', error);
        throw new Error('Failed to convert angle to radians');
    }
};

/**
 * Converts radians to degrees
 * @param {number} angle - Angle in radians
 * @returns {number} Angle in degrees
 */
export const toDegrees = (angle) => {
    try {
        return angle * 180 / Math.PI;
    } catch (error) {
        console.error('Error in toDegrees:', error);
        throw new Error('Failed to convert angle to degrees');
    }
};

/**
 * Calculates strike based on dip direction and strike mode
 * @param {number} dipDirection - Dip direction in degrees
 * @param {string} strikeMode - Strike mode ('negative' or 'positive')
 * @returns {number} Strike in degrees
 */
export function calculateStrike(dipDirection, strikeMode) {
    try {
        if (strikeMode === 'negative') {
            return (dipDirection - 90 + 360) % 360;
        } else if (strikeMode === 'positive') {
            return (dipDirection + 90) % 360;
        } else {
            throw new Error('Invalid strike mode');
        }
    } catch (error) {
        console.error('Error in calculateStrike:', error);
        throw new Error('Failed to calculate strike');
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
