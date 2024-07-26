import { loadMeasurements } from './measurements.js';
import { setupUI, updatePreview } from './ui.js';
import { setupSettings } from './settings.js';
import { handleError } from './utils.js';
import { info, error, warn } from './logger.js';

async function init() {
    console.log('Testing logger...');
    info('This is an info log');
    warn('This is a warning log');
    error('This is an error log');
    debug('This is a debug log');
    
    info('Initializing app...');
    try {
        info('Setting up UI...');
        await setupUI();
        info('UI setup complete.');

        info('Loading measurements...');
        await loadMeasurements();
        info('Measurements loaded.');

        info('Updating preview...');
        updatePreview();
        info('Preview updated.');

        info('Setting up settings...');
        await setupSettings();
        info('Settings setup complete.');
    } catch (err) {
        error('Error during initialization:', err);
        error('Error stack:', err.stack);
        error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        handleError(err, "An error occurred during app initialization. Some features may not work correctly.");
    }
    
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

    console.log('App initialization complete');
}

function domReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

domReady(async () => {
    await init();

    // Set up settings button
    const settingsButton = document.getElementById('settingsButton');
    const settingsPage = document.getElementById('settingsPage');
    const backToMain = document.getElementById('backToMain');

    if (settingsButton && settingsPage && backToMain) {
        settingsButton.addEventListener('click', () => {
            console.log('Settings button clicked');
            settingsPage.classList.remove('hidden');
            document.getElementById('app').classList.add('hidden');
        });

        backToMain.addEventListener('click', () => {
            settingsPage.classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
        });
    } else {
        console.warn('Settings button, settings page, or back button not found');
    }

    // Set up help button (if needed)
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
        console.log('Help button found');
        helpButton.addEventListener('click', () => console.log('Help button clicked'));
    } else {
        console.warn('Help button not found');
    }

    // Ensure toggleCustomHoleIdInput is available
    if (typeof window.toggleCustomHoleIdInput === 'function') {
        console.log('toggleCustomHoleIdInput function is available');
    } else {
        console.error('toggleCustomHoleIdInput function is not available');
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async function() {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        } catch (err) {
            console.error('ServiceWorker registration failed: ', err);
            handleError(err, 'ServiceWorker registration failed. The app will still work, but offline functionality may be limited.');
        }
    });
} else {
    console.warn('Service workers are not supported in this browser. The app will still work, but offline functionality will be limited.');
}
