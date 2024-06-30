import { updateTypeSelectorButtons, updateGenerationSelectorButtons } from './ui.js';
import { saveSettings, loadSettings } from './storage.js';

export function setupSettings() {
    const settings = loadSettings();
    setupDarkMode(settings.darkMode);
    setupCustomTypes(settings.measurementTypes, settings.generationTypes);
    setupUnits(settings.units);
}

function setupDarkMode(initialState) {
    const darkModeToggle = document.getElementById('darkMode');
    darkModeToggle.checked = initialState;
    document.body.classList.toggle('dark-mode', initialState);

    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode', darkModeToggle.checked);
        const settings = loadSettings();
        settings.darkMode = darkModeToggle.checked;
        saveSettings(settings);
    });
}

function setupCustomTypes(measurementTypes, generationTypes) {
    updateMeasurementTypes(measurementTypes);
    updateGenerationTypes(generationTypes);

    document.getElementById('addMeasurementType').addEventListener('click', addMeasurementType);
    document.getElementById('addGenerationType').addEventListener('click', addGenerationType);
}

function setupUnits(initialUnit) {
    const unitsSelect = document.getElementById('units');
    unitsSelect.value = initialUnit;
    updateUnits(initialUnit);

    unitsSelect.addEventListener('change', () => {
        const settings = loadSettings();
        settings.units = unitsSelect.value;
        saveSettings(settings);
        updateUnits(unitsSelect.value);
    });
}

export function updateMeasurementTypes(types) {
    const container = document.getElementById('measurementTypes');
    container.innerHTML = '';
    types.forEach(type => {
        const div = document.createElement('div');
        div.textContent = type;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteMeasurementType(type);
        div.appendChild(deleteButton);
        container.appendChild(div);
    });
    updateTypeSelectorButtons(types);
    const settings = loadSettings();
    settings.measurementTypes = types;
    saveSettings(settings);
}

export function updateGenerationTypes(types) {
    const container = document.getElementById('generationTypes');
    container.innerHTML = '';
    types.forEach(type => {
        const div = document.createElement('div');
        div.textContent = type;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteGenerationType(type);
        div.appendChild(deleteButton);
        container.appendChild(div);
    });
    updateGenerationSelectorButtons(types);
    const settings = loadSettings();
    settings.generationTypes = types;
    saveSettings(settings);
}

function addMeasurementType() {
    const newType = prompt('Enter new measurement type:');
    if (newType) {
        const settings = loadSettings();
        settings.measurementTypes.push(newType);
        updateMeasurementTypes(settings.measurementTypes);
    }
}

function addGenerationType() {
    const newType = prompt('Enter new generation type:');
    if (newType) {
        const settings = loadSettings();
        settings.generationTypes.push(newType);
        updateGenerationTypes(settings.generationTypes);
    }
}

function deleteMeasurementType(type) {
    const settings = loadSettings();
    const index = settings.measurementTypes.indexOf(type);
    if (index > -1) {
        settings.measurementTypes.splice(index, 1);
        updateMeasurementTypes(settings.measurementTypes);
    }
}

function deleteGenerationType(type) {
    const settings = loadSettings();
    const index = settings.generationTypes.indexOf(type);
    if (index > -1) {
        settings.generationTypes.splice(index, 1);
        updateGenerationTypes(settings.generationTypes);
    }
}

function updateUnits(unit) {
    const depthLabel = document.querySelector('label[for="depth"]');
    if (unit === 'metric') {
        depthLabel.textContent = 'Depth (m):';
    } else {
        depthLabel.textContent = 'Depth (ft):';
    }
    // Update other unit-dependent elements here
}
