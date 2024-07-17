import { loadMeasurements } from './measurements.js';
import { setupUI, updatePreview } from './ui.js';
import { setupSettings } from './settings.js';
import { handleError } from './utils.js';

async function init() {
    try {
        await setupUI();
        await loadMeasurements();
        updatePreview();
        await setupSettings();
    } catch (error) {
        handleError(error, "An error occurred during initialization.");
    }
}

function domReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

domReady(init);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async function() {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        } catch (err) {
            handleError(err, 'ServiceWorker registration failed.');
        }
    });
}