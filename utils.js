/**
 * Converts degrees to radians
 * @param {number} angle - Angle in degrees
 * @returns {number} Angle in radians
 */
export const toRadians = (angle) => angle * Math.PI / 180;

/**
 * Converts radians to degrees
 * @param {number} angle - Angle in radians
 * @returns {number} Angle in degrees
 */
export const toDegrees = (angle) => angle * 180 / Math.PI;

/**
 * Calculates strike based on dip direction and strike mode
 * @param {number} dipDirection - Dip direction in degrees
 * @param {string} strikeMode - Strike mode ('negative' or 'positive')
 * @returns {number} Strike in degrees
 */
export function calculateStrike(dipDirection, strikeMode) {
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
    if (holeDip < -90 || holeDip > 90) return "Hole Dip must be between -90° and 90°";
    if (holeAzimuth < 0 || holeAzimuth > 360) return "Hole Azimuth must be between 0° and 360°";
    if (alpha < 0 || alpha > 90) return "Alpha (Core Angle) must be between 0° and 90°";
    if (beta < 0 || beta > 360) return "Beta must be between 0° and 360°";
    return null;
}

/**
 * Handles errors by logging them and displaying a message to the user
 * @param {Error} error - The error object
 * @param {string} userMessage - The message to display to the user
 */
export function handleError(error, userMessage) {
    console.error(error);
    document.getElementById('error').textContent = userMessage;
}

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
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}