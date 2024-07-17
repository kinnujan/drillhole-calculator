import { loadMeasurements, setupMeasurementHandlers } from './measurements.js';
import { setupUI, updatePreview } from './ui.js';
import { setupSettings } from './settings.js';
import { handleError } from './utils.js';

window.onload = async function() {
    try {
        setupUI();
        setupMeasurementHandlers();
        await loadMeasurements();
        updatePreview();
        await setupSettings();
    } catch (error) {
        handleError(error, "An error occurred during initialization.");
    }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
            handleError(err, 'ServiceWorker registration failed.');
        });
    });
}