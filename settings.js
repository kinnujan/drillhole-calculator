import { updateTypeSelectorButtons, updateGenerationSelectorButtons, updateCustomTypeSelectorButtons } from './ui.js';
import { saveSettings, loadSettings, saveMeasurements } from './storage.js';
import errorService from './errorService.js';
import { DEFAULT_SETTINGS } from './constants.js';
import { importCSV } from './csv_import.js';

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
        setupAllTypes(settings.measurementTypes || [], settings.generationTypes || [], settings.customTypes || []);
        setupHapticFeedback(settings.hapticFeedback);
        setupUndoButton(settings.undoEnabled);
        setupIncludeHeaderInExport(settings.includeHeaderInExport);
        setupSurveyImportToggle(settings.surveyImportEnabled);
        
        // Add this line to export the toggleCustomHoleIdInput function
        window.toggleCustomHoleIdInput = toggleCustomHoleIdInput;
        
        const addMeasurementTypeBtn = document.getElementById('addMeasurementType');
        if (addMeasurementTypeBtn) {
            addMeasurementTypeBtn.addEventListener('click', () => addType('measurementTypes'));
        }
        
        const addGenerationTypeBtn = document.getElementById('addGenerationType');
        if (addGenerationTypeBtn) {
            addGenerationTypeBtn.addEventListener('click', () => addType('generationTypes'));
        }
        document.getElementById('addCustomType').addEventListener('click', addCustomType);
        setupResetButton();

        // Set up settings button
        const settingsButton = document.getElementById('settingsButton');
        const settingsPage = document.getElementById('settingsPage');
        const backToMain = document.getElementById('backToMain');

        settingsButton.addEventListener('click', () => {
            settingsPage.classList.remove('hidden');
            document.getElementById('app').classList.add('hidden');
        });

        backToMain.addEventListener('click', () => {
            settingsPage.classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
        });

        console.log("Settings setup complete.");
    } catch (error) {
        errorService.handleError(error, "Error setting up settings");
    }
}

/**
 * Sets up the dark mode toggle
 * @param {boolean} initialState - Initial state of dark mode
 */
async function setupDarkMode(initialState) {
    const darkModeToggle = document.getElementById('darkMode');
    if (!darkModeToggle) {
        console.error('Dark mode toggle not found');
        return;
    }
    darkModeToggle.checked = initialState;
    applyDarkMode(initialState);

    darkModeToggle.addEventListener('change', async () => {
        const isDarkMode = darkModeToggle.checked;
        applyDarkMode(isDarkMode);
        try {
            const settings = await loadSettings();
            settings.darkMode = isDarkMode;
            await saveSettings(settings);
            console.log(`Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`);
        } catch (error) {
            errorService.handleError(error, "Error saving dark mode setting");
        }
    });
}

function applyDarkMode(isDarkMode) {
    document.body.classList.toggle('dark-mode', isDarkMode);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDarkMode ? '#333333' : '#ffffff');
    }
}

/**
 * Sets up the haptic feedback toggle
 * @param {boolean} initialState - Initial state of haptic feedback
 */
async function setupHapticFeedback(initialState) {
    const hapticFeedbackToggle = document.getElementById('hapticFeedback');
    hapticFeedbackToggle.checked = initialState;

    hapticFeedbackToggle.addEventListener('change', async () => {
        const isHapticFeedbackEnabled = hapticFeedbackToggle.checked;
        try {
            const settings = await loadSettings();
            settings.hapticFeedback = isHapticFeedbackEnabled;
            await saveSettings(settings);
            console.log(`Haptic feedback ${isHapticFeedbackEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            errorService.handleError(error, "Error saving haptic feedback setting");
        }
    });
}

/**
 * Sets up the undo button toggle
 * @param {boolean} initialState - Initial state of undo button
 */
async function setupUndoButton(initialState) {
    const undoButtonToggle = document.getElementById('undoEnabled');
    undoButtonToggle.checked = initialState;

    undoButtonToggle.addEventListener('change', async () => {
        const isUndoEnabled = undoButtonToggle.checked;
        try {
            const settings = await loadSettings();
            settings.undoEnabled = isUndoEnabled;
            await saveSettings(settings);
            console.log(`Undo button ${isUndoEnabled ? 'enabled' : 'disabled'}`);
            // Update UI to show/hide undo button based on the new setting
            const undoButton = document.getElementById('undoMeasurement');
            if (undoButton) {
                undoButton.style.display = isUndoEnabled ? 'inline-block' : 'none';
            }
        } catch (error) {
            errorService.handleError(error, "Error saving undo button setting");
        }
    });
}

async function setupIncludeHeaderInExport(initialState) {
    const includeHeaderToggle = document.getElementById('includeHeaderInExport');
    includeHeaderToggle.checked = initialState;

    includeHeaderToggle.addEventListener('change', async () => {
        const includeHeader = includeHeaderToggle.checked;
        try {
            const settings = await loadSettings();
            settings.includeHeaderInExport = includeHeader;
            await saveSettings(settings);
            console.log(`Include header in export ${includeHeader ? 'enabled' : 'disabled'}`);
        } catch (error) {
            errorService.handleError(error, "Error saving include header in export setting");
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

async function setupSurveyImportToggle(initialState) {
    const surveyImportToggle = document.getElementById('surveyImportEnabled');
    const surveyImportSettings = document.querySelector('.survey-import-settings');
    
    if (!surveyImportToggle || !surveyImportSettings) {
        console.error('Survey import toggle or settings elements not found');
        return;
    }
    
    surveyImportToggle.checked = initialState;
    surveyImportSettings.style.display = initialState ? 'block' : 'none';

    surveyImportToggle.addEventListener('change', async () => {
        const isSurveyImportEnabled = surveyImportToggle.checked;
        try {
            const settings = await loadSettings();
            settings.surveyImportEnabled = isSurveyImportEnabled;
            await saveSettings(settings);
            console.log(`Survey import ${isSurveyImportEnabled ? 'enabled' : 'disabled'}`);
            surveyImportSettings.style.display = isSurveyImportEnabled ? 'block' : 'none';
            toggleCustomHoleIdInput(isSurveyImportEnabled);
            toggleCSVImportUI(isSurveyImportEnabled);
        } catch (error) {
            errorService.handleError(error, "Error saving survey import setting");
        }
    });

    setupSurveyImportInput();
    setupSurveyImportFieldSelectors();
}

function setupSurveyImportInput() {
    const surveyImportInput = document.getElementById('surveyImportInput');
    if (surveyImportInput) {
        surveyImportInput.addEventListener('change', handleCSVImport);
    } else {
        console.warn('Survey import input element not found');
    }
}

function setupSurveyImportFieldSelectors() {
    const surveyFieldSelectors = ['holeId', 'depth', 'azimuth', 'dip'];
    surveyFieldSelectors.forEach(field => {
        const selector = document.getElementById(`surveyImport${field.charAt(0).toUpperCase() + field.slice(1)}Field`);
        if (selector) {
            selector.addEventListener('change', async () => {
                const settings = await loadSettings();
                settings.surveyImportFields[field] = selector.value;
                await saveSettings(settings);
            });
        } else {
            console.warn(`Survey import field selector for ${field} not found`);
        }
    });
}

export function toggleCustomHoleIdInput(isSurveyImportEnabled) {
    const holeIdGroup = document.getElementById('holeIdGroup');
    const holeIdSelectGroup = document.getElementById('holeIdSelectGroup');
    
    if (holeIdGroup && holeIdSelectGroup) {
        holeIdGroup.classList.toggle('hidden', isSurveyImportEnabled);
        holeIdSelectGroup.classList.toggle('hidden', !isSurveyImportEnabled);
        console.log(`Custom Hole ID input ${isSurveyImportEnabled ? 'hidden' : 'shown'}`);
        console.log(`Hole ID select ${isSurveyImportEnabled ? 'shown' : 'hidden'}`);
    } else {
        console.warn('Hole ID group or Hole ID select group not found');
    }
}

// Make the function available globally
window.toggleCustomHoleIdInput = toggleCustomHoleIdInput;

async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (file) {
        try {
            console.log("Starting CSV import process...");
            const csvData = await readCSVFile(file);
            console.log("CSV file read successfully");
            
            if (!Array.isArray(csvData) || csvData.length === 0) {
                throw new Error('Invalid CSV data: empty or not an array');
            }
            
            const headers = csvData[0];
            console.log("CSV headers:", headers);
            
            populateFieldSelectors(headers);
            console.log("Field selectors populated");
            
            const importedData = await importCSV(csvData);
            console.log("CSV imported successfully", importedData);
            
            // Update the UI with the imported data
            setupHoleIdDropdown(importedData);
            
            // Show success message to the user
            const copyStatus = document.getElementById('copyStatus');
            if (copyStatus) {
                copyStatus.textContent = 'CSV imported successfully!';
                setTimeout(() => copyStatus.textContent = '', 3000);
            }

            // Update the main UI to reflect the imported data
            updateMainUIAfterImport(importedData);
        } catch (error) {
            console.error("CSV import error:", error);
            errorService.handleError(error, "Error importing CSV file: " + error.message);
        }
    } else {
        console.warn("No file selected for CSV import");
    }
}

function updateMainUIAfterImport(importedData) {
    setupHoleIdDropdown(importedData);

    // Show the hole ID select and hide the hole ID input
    const holeIdGroup = document.getElementById('holeIdGroup');
    const holeIdSelectGroup = document.getElementById('holeIdSelectGroup');
    if (holeIdGroup && holeIdSelectGroup) {
        holeIdGroup.classList.add('hidden');
        holeIdSelectGroup.classList.remove('hidden');
    }

    // Trigger an update of the hole info
    const holeIdSelect = document.getElementById('holeIdSelect');
    const event = new Event('change');
    holeIdSelect.dispatchEvent(event);
}

function setupHoleIdDropdown(data) {
    const holeIdSelect = document.getElementById('holeIdSelect');
    if (!holeIdSelect) {
        console.error('Hole ID select element not found');
        return;
    }

    holeIdSelect.innerHTML = '<option value="">Select Hole ID</option>';
    
    if (data) {
        Object.keys(data).forEach(holeId => {
            const option = document.createElement('option');
            option.value = holeId;
            option.textContent = holeId;
            holeIdSelect.appendChild(option);
        });
    }
}

function readCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const data = CSVToArray(text);
            resolve(data);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

function CSVToArray(strData, strDelimiter = ',') {
    const objPattern = new RegExp(
        ("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        "([^\"\\" + strDelimiter + "\\r\\n]*))"),"gi"
    );
    let arrData = [[]];
    let arrMatches = null;
    while (arrMatches = objPattern.exec(strData)) {
        const strMatchedDelimiter = arrMatches[1];
        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
            arrData.push([]);
        }
        let strMatchedValue;
        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp( "\"\"", "g" ), "\"");
        } else {
            strMatchedValue = arrMatches[3];
        }
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return arrData;
}

async function populateFieldSelectors(headers) {
    const settings = await loadSettings();
    const surveyFieldSelectors = ['holeId', 'depth', 'azimuth', 'dip'];
    surveyFieldSelectors.forEach(field => {
        const selector = document.getElementById(`surveyImport${field.charAt(0).toUpperCase() + field.slice(1)}Field`);
        if (selector) {
            selector.innerHTML = '<option value="">Select field</option>';
            headers.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                if (settings.surveyImportFields[field] === header) {
                    option.selected = true;
                }
                selector.appendChild(option);
            });
        } else {
            console.warn(`Selector for ${field} not found`);
        }
    });
}

function toggleCSVImportUI(isEnabled) {
    const surveyImportElements = document.querySelectorAll('.survey-import-element');
    surveyImportElements.forEach(element => {
        element.style.display = isEnabled ? 'block' : 'none';
    });
}

async function populateCSVFieldSelectors() {
    const settings = await loadSettings();
    const csvFieldSelectors = ['holeId', 'depth', 'azimuth', 'dip'];
    
    csvFieldSelectors.forEach(field => {
        const selector = document.getElementById(`csvImport${field.charAt(0).toUpperCase() + field.slice(1)}Field`);
        if (selector) {
            selector.value = settings.csvImportFields[field];
        }
    });
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
            errorService.handleError(error, "Error adding new custom type");
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
        errorService.handleError(error, "Error deleting custom type");
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
            errorService.handleError(error, "Error adding custom type option");
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
        errorService.handleError(error, "Error deleting custom type option");
    }
}

/**
 * Sets up the reset button
 */
function setupResetButton() {
    const resetButton = document.getElementById('resetApp');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all settings and data? This action cannot be undone.')) {
                try {
                    // Clear all localStorage items
                    localStorage.clear();

                    // Reset settings to default
                    await saveSettings(DEFAULT_SETTINGS);

                    // Clear measurements
                    await saveMeasurements([]);

                    // Show a message to the user
                    const copyStatus = document.getElementById('copyStatus');
                    if (copyStatus) {
                        copyStatus.textContent = 'Application reset. Reloading page...';
                    }

                    // Reload the page to reset the UI after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } catch (error) {
                    errorService.handleError(error, "Error resetting application");
                }
            }
        });
    } else {
        console.error('Reset button not found in the DOM');
    }
}
