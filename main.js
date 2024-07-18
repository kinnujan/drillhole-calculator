import { loadMeasurements } from './measurements.js';
import { setupUI, updatePreview } from './ui.js';
import { setupSettings } from './settings.js';
import { handleError } from './utils.js';

async function init() {
    try {
        console.log('Initializing app...');
        await setupUI();
        await loadMeasurements();
        updatePreview();
        await setupSettings();
        
        // Check for Vibration API support
        if ('vibrate' in navigator) {
            console.log('Vibration API is supported');
        } else {
            console.warn('Vibration API is not supported on this device');
            // Optionally, you can display a message to the user
            const message = document.createElement('div');
            message.textContent = 'Haptic feedback is not supported on this device.';
            message.style.cssText = 'background-color: #ffff99; padding: 10px; text-align: center; position: fixed; top: 0; left: 0; right: 0; z-index: 1000;';
            document.body.prepend(message);
            setTimeout(() => message.remove(), 5000); // Remove the message after 5 seconds
        }

        // Add debug logs for settings and help buttons
        const settingsButton = document.getElementById('settingsButton');
        const helpButton = document.getElementById('helpButton');
        
        if (settingsButton) {
            console.log('Settings button found');
            settingsButton.addEventListener('click', () => console.log('Settings button clicked'));
        } else {
            console.warn('Settings button not found');
        }
        
        if (helpButton) {
            console.log('Help button found');
            helpButton.addEventListener('click', () => console.log('Help button clicked'));
        } else {
            console.warn('Help button not found');
        }

        console.log('App initialization complete');
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