import { updateTypeSelectorButtons, updateGenerationSelectorButtons, updateCustomTypeSelectorButtons } from './ui.js';
import { saveSettings, loadSettings } from './storage.js';

export function setupSettings() {
    console.log("Setting up settings...");
    const settings = loadSettings();
    setupDarkMode(settings.darkMode);
    setupCustomTypes(settings.measurementTypes, settings.generationTypes, settings.customTypes);
    
    console.log("Adding event listeners to buttons...");
    document.getElementById('addMeasurementType').addEventListener('click', addMeasurementType);
    document.getElementById('addGenerationType').addEventListener('click', addGenerationType);
    document.getElementById('addCustomType').addEventListener('click', addCustomType);
    console.log("Event listeners added.");
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

function setupCustomTypes(measurementTypes, generationTypes, customTypes) {
    updateMeasurementTypes(measurementTypes);
    updateGenerationTypes(generationTypes);
    updateCustomTypes(customTypes);
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
}

export function updateCustomTypes(types) {
    const container = document.getElementById('customTypes');
    container.innerHTML = '';
    types.forEach(type => {
        const div = document.createElement('div');
        div.textContent = type.name;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteCustomType(type.name);
        div.appendChild(deleteButton);
        container.appendChild(div);
    });
    updateCustomTypeSelectorButtons(types);
}

function addMeasurementType() {
    console.log("Adding measurement type...");
    const newType = prompt('Enter new measurement type:');
    if (newType) {
        const settings = loadSettings();
        settings.measurementTypes.push(newType);
        updateMeasurementTypes(settings.measurementTypes);
        saveSettings(settings);
        console.log("New measurement type added:", newType);
    }
}

function addGenerationType() {
    console.log("Adding generation type...");
    const newType = prompt('Enter new generation type:');
    if (newType) {
        const settings = loadSettings();
        settings.generationTypes.push(newType);
        updateGenerationTypes(settings.generationTypes);
        saveSettings(settings);
        console.log("New generation type added:", newType);
    }
}

function addCustomType() {
    console.log("Adding custom type...");
    const name = prompt('Enter new custom type name:');
    if (name) {
        const optionsString = prompt('Enter options for this type (comma-separated):');
        const options = optionsString.split(',').map(option => option.trim());
        const settings = loadSettings();
        settings.customTypes.push({ name, options });
        updateCustomTypes(settings.customTypes);
        saveSettings(settings);
        console.log("New custom type added:", name, "with options:", options);
    }
}

function deleteMeasurementType(type) {
    const settings = loadSettings();
    const index = settings.measurementTypes.indexOf(type);
    if (index > -1) {
        settings.measurementTypes.splice(index, 1);
        updateMeasurementTypes(settings.measurementTypes);
        saveSettings(settings);
    }
}

function deleteGenerationType(type) {
    const settings = loadSettings();
    const index = settings.generationTypes.indexOf(type);
    if (index > -1) {
        settings.generationTypes.splice(index, 1);
        updateGenerationTypes(settings.generationTypes);
        saveSettings(settings);
    }
}

function deleteCustomType(typeName) {
    const settings = loadSettings();
    settings.customTypes = settings.customTypes.filter(type => type.name !== typeName);
    updateCustomTypes(settings.customTypes);
    saveSettings(settings);
}
