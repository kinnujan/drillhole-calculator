import { loadMeasurements, setupMeasurementHandlers } from './measurements.js';
import { setupUI, updatePreview } from './ui.js';
import { setupSettings } from './settings.js';

window.onload = function() {
    setupUI();
    setupMeasurementHandlers();
    loadMeasurements();
    updatePreview();
    setupSettings();
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
