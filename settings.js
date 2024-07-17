import { updateTypeSelectorButtons, updateGenerationSelectorButtons, updateCustomTypeSelectorButtons } from './ui.js';
import { saveSettings, loadSettings, saveMeasurements } from './storage.js';
import { handleError } from './utils.js';
import { DEFAULT_SETTINGS } from './constants.js';

/**
 * Sets up the settings UI and event listeners
 * @returns {Promise<void>}
 */
export async function setupSettings() {
    console.log("Setting up settings...");
    try {
        const settings = await loadSettings();
        await setupDarkMode(settings.darkMode);
        setupStrikeMode(settings.strikeMode);
        setupAllTypes(settings.measurementTypes, settings.generationTypes, settings.customTypes);
        
        document.getElementById('addMeasurementType').addEventListener('click', () => addType('measurementTypes'));
        document.getElementById('addGenerationType').addEventListener('click', () => addType('generationTypes'));
        document.getElementById('addCustomType').addEventListener('click', addCustomType);
        setupResetButton();
        console.log("Settings setup complete.");
    } catch (error) {
        handleError(error, "Error setting up settings");
    }
}

/**
 * Sets up the dark mode toggle
 * @param {boolean} initialState - Initial state of dark mode
 */
async function setupDarkMode(initialState) {
    const darkModeToggle = document.getElementById('darkMode');
    darkModeToggle.checked = initialState;
    document.body.classList.toggle('dark-mode', initialState);

    darkModeToggle.addEventListener('change', async () => {
        const isDarkMode = darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        try {
            const settings = await loadSettings();
            settings.darkMode = isDarkMode;
            await saveSettings(settings);
            console.log(`Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`);
        } catch (error) {
            handleError(error, "Error saving dark mode setting");
        }
    });
}

/**
 * Sets up the strike mode selector
 * @param {string} initialState - Initial state of strike mode
 */
function setupStrikeMode(initialState) {
    const strikeModeSelect = document.getElementById('strikeMode');
    strikeModeSelect.value = initialState || 'negative';

    strikeModeSelect.addEventListener('change', async () => {
        const settings = await loadSettings();
        settings.strikeMode = strikeModeSelect.value;
        await saveSettings(settings);
    });
}

/**
 * Sets up all type selectors
 * @param {string[]} measurementTypes - Array of measurement types
 * @param {string[]} generationTypes - Array of generation types
 * @param {Object[]} customTypes - Array of custom type objects
 */
function setupAllTypes(measurementTypes, generationTypes, customTypes) {
    updateTypeList('measurementTypes', measurementTypes);
    updateTypeList('generationTypes', generationTypes);
    updateCustomTypesList(customTypes);
}

/**
 * Updates the type list in the UI
 * @param {string} typeCategory - Category of the type list
 * @param {string[]} types - Array of types
 */
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

/**
 * Updates the custom types list in the UI
 * @param {Object[]} customTypes - Array of custom type objects
 */
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

/**
 * Adds a new type to the specified category
 * @param {string} typeCategory - Category of the type
 * @returns {Promise<void>}
 */
async function addType(typeCategory) {
    const newType = prompt(`Enter new ${typeCategory.slice(0, -1)}:`);
    if (newType) {
        try {
            const settings = await loadSettings();
            settings[typeCategory].push(newType);
            updateTypeList(typeCategory, settings[typeCategory]);
            await saveSettings(settings);
        } catch (error) {
            handleError(error, `Error adding new ${typeCategory.slice(0, -1)}`);
        }
    }
}

/**
 * Deletes a type from the specified category
 * @param {string} typeCategory - Category of the type
 * @param {string} type - Type to delete
 * @returns {Promise<void>}
 */
async function deleteType(typeCategory, type) {
    try {
        const settings = await loadSettings();
        const index = settings[typeCategory].indexOf(type);
        if (index > -1) {
            settings[typeCategory].splice(index, 1);
            updateTypeList(typeCategory, settings[typeCategory]);
            await saveSettings(settings);
        }
    } catch (error) {
        handleError(error, `Error deleting ${typeCategory.slice(0, -1)}`);
    }
}

/**
 * Adds a new custom type
 * @returns {Promise<void>}
 */
async function addCustomType() {
    const name = prompt('Enter new custom type name:');
    if (name) {
        try {
            const settings = await loadSettings();
            settings.customTypes.push({ name, options: [] });
            updateCustomTypesList(settings.customTypes);
            await saveSettings(settings);
        } catch (error) {
            handleError(error, "Error adding new custom type");
        }
    }
}

/**
 * Deletes a custom type
 * @param {string} typeName - Name of the custom type to delete
 * @returns {Promise<void>}
 */
async function deleteCustomType(typeName) {
    try {
        const settings = await loadSettings();
        settings.customTypes = settings.customTypes.filter(type => type.name !== typeName);
        updateCustomTypesList(settings.customTypes);
        await saveSettings(settings);
    } catch (error) {
        handleError(error, "Error deleting custom type");
    }
}

/**
 * Adds an option to a custom type
 * @param {string} typeName - Name of the custom type
 * @returns {Promise<void>}
 */
async function addCustomTypeOption(typeName) {
    const newOption = prompt(`Enter new option for ${typeName}:`);
    if (newOption) {
        try {
            const settings = await loadSettings();
            const customType = settings.customTypes.find(type => type.name === typeName);
            if (customType) {
                customType.options.push(newOption);
                updateCustomTypesList(settings.customTypes);
                await saveSettings(settings);
            }
        } catch (error) {
            handleError(error, "Error adding custom type option");
        }
    }
}

/**
 * Deletes an option from a custom type
 * @param {string} typeName - Name of the custom type
 * @param {string} option - Option to delete
 * @returns {Promise<void>}
 */
async function deleteCustomTypeOption(typeName, option) {
    try {
        const settings = await loadSettings();
        const customType = settings.customTypes.find(type => type.name === typeName);
        if (customType) {
            const index = customType.options.indexOf(option);
            if (index > -1) {
                customType.options.splice(index, 1);
                updateCustomTypesList(settings.customTypes);
                await saveSettings(settings);
            }
        }
    } catch (error) {
        handleError(error, "Error deleting custom type option");
    }
}

/**
 * Sets up the reset button
 */
function setupResetButton() {
    const resetButton = document.getElementById('resetApp');
    resetButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all settings and data? This action cannot be undone.')) {
            try {
                // Clear all localStorage items
                localStorage.clear();

                // Reset settings to default
                await saveSettings(DEFAULT_SETTINGS);

                // Clear measurements
                await saveMeasurements([]);

                // Reload the page to reset the UI
                window.location.reload();
            } catch (error) {
                handleError(error, "Error resetting application");
            }
        }
    });
}