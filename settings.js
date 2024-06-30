import { updateTypeSelectorButtons, updateGenerationSelectorButtons, updateCustomTypeSelectorButtons } from './ui.js';
import { saveSettings, loadSettings } from './storage.js';

export function setupSettings() {
    console.log("Setting up settings...");
    const settings = loadSettings();
    setupDarkMode(settings.darkMode);
    setupAllTypes(settings.measurementTypes, settings.generationTypes, settings.customTypes);
    
    document.getElementById('addMeasurementType').addEventListener('click', () => addType('measurementTypes'));
    document.getElementById('addGenerationType').addEventListener('click', () => addType('generationTypes'));
    document.getElementById('addCustomType').addEventListener('click', addCustomType);
    console.log("Settings setup complete.");
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

function setupAllTypes(measurementTypes, generationTypes, customTypes) {
    updateTypeList('measurementTypes', measurementTypes);
    updateTypeList('generationTypes', generationTypes);
    updateCustomTypesList(customTypes);
}

function updateTypeList(typeCategory, types) {
    const container = document.getElementById(typeCategory);
    container.innerHTML = '';
    types.forEach(type => {
        const div = document.createElement('div');
        div.textContent = type;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteType(typeCategory, type);
        div.appendChild(deleteButton);
        container.appendChild(div);
    });
    if (typeCategory === 'measurementTypes') {
        updateTypeSelectorButtons(types);
    } else if (typeCategory === 'generationTypes') {
        updateGenerationSelectorButtons(types);
    }
}

function updateCustomTypesList(customTypes) {
    const container = document.getElementById('customTypes');
    container.innerHTML = '';
    customTypes.forEach(customType => {
        const div = document.createElement('div');
        div.textContent = customType.name;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteCustomType(customType.name);
        div.appendChild(deleteButton);
        
        const optionsContainer = document.createElement('div');
        customType.options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.textContent = option;
            const deleteOptionButton = document.createElement('button');
            deleteOptionButton.textContent = 'Delete';
            deleteOptionButton.onclick = () => deleteCustomTypeOption(customType.name, option);
            optionDiv.appendChild(deleteOptionButton);
            optionsContainer.appendChild(optionDiv);
        });
        
        const addOptionButton = document.createElement('button');
        addOptionButton.textContent = 'Add Option';
        addOptionButton.onclick = () => addCustomTypeOption(customType.name);
        
        div.appendChild(optionsContainer);
        div.appendChild(addOptionButton);
        container.appendChild(div);
    });
    updateCustomTypeSelectorButtons(customTypes);
}

function addType(typeCategory) {
    const newType = prompt(`Enter new ${typeCategory.slice(0, -1)}:`);
    if (newType) {
        const settings = loadSettings();
        settings[typeCategory].push(newType);
        updateTypeList(typeCategory, settings[typeCategory]);
        saveSettings(settings);
    }
}

function deleteType(typeCategory, type) {
    const settings = loadSettings();
    const index = settings[typeCategory].indexOf(type);
    if (index > -1) {
        settings[typeCategory].splice(index, 1);
        updateTypeList(typeCategory, settings[typeCategory]);
        saveSettings(settings);
    }
}

function addCustomType() {
    const name = prompt('Enter new custom type name:');
    if (name) {
        const settings = loadSettings();
        settings.customTypes.push({ name, options: [] });
        updateCustomTypesList(settings.customTypes);
        saveSettings(settings);
    }
}

function deleteCustomType(typeName) {
    const settings = loadSettings();
    settings.customTypes = settings.customTypes.filter(type => type.name !== typeName);
    updateCustomTypesList(settings.customTypes);
    saveSettings(settings);
}

function addCustomTypeOption(typeName) {
    const newOption = prompt(`Enter new option for ${typeName}:`);
    if (newOption) {
        const settings = loadSettings();
        const customType = settings.customTypes.find(type => type.name === typeName);
        if (customType) {
            customType.options.push(newOption);
            updateCustomTypesList(settings.customTypes);
            saveSettings(settings);
        }
    }
}

function deleteCustomTypeOption(typeName, option) {
    const settings = loadSettings();
    const customType = settings.customTypes.find(type => type.name === typeName);
    if (customType) {
        const index = customType.options.indexOf(option);
        if (index > -1) {
            customType.options.splice(index, 1);
            updateCustomTypesList(settings.customTypes);
            saveSettings(settings);
        }
    }
}
