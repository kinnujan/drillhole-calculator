import { measurements, calculateDipDirection, setSelectedType, setSelectedGeneration, setSelectedCustomType, addMeasurement, copyResults, saveAsCSV, clearMeasurementsWithConfirmation, exportData, undoLastMeasurement } from './measurements.js';
import { loadDrillHoleInfo, saveDrillHoleInfo, loadSettings } from './storage.js';
import { handleError, calculateStrike } from './utils.js';
import { importCSV, getImportedDrillHoleData, getHoleData, setupHoleIdDropdown } from './csv_import.js';

// Update utility function for haptic feedback
async function triggerHapticFeedback(duration = 10) {
    try {
        const settings = await loadSettings();
        if (settings.hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    } catch (error) {
        handleError(error, "Error triggering haptic feedback");
    }
}

export function enableUndoButton() {
    const undoButton = document.getElementById('undoMeasurement');
    if (undoButton) {
        undoButton.disabled = false;
    } else {
        console.warn("Undo button not found.");
    }
}

export function disableUndoButton() {
    const undoButton = document.getElementById('undoMeasurement');
    if (undoButton) {
        undoButton.disabled = true;
    } else {
        console.warn("Undo button not found.");
    }
}

export async function setupUI() {
    console.log("Setting up UI...");
    setupDrillHoleInfoToggle();
    await setupTypeSelectors();
    await syncInputs();
    setupDepthButtons();
    setupMeasurementHandlers();
    setupHoleIdDropdown(getImportedDrillHoleData());
    document.addEventListener('measurementAdded', updateHoleInfo);
    
    // Toggle custom Hole ID input based on initial survey import setting
    const settings = await loadSettings();
    toggleCustomHoleIdInput(settings.surveyImportEnabled);
    
    console.log("UI setup complete.");
}

export function updateHoleInfo(holeData) {
    const holeId = document.getElementById('holeIdSelect').value;
    const depth = parseFloat(document.getElementById('depth').value) || 0;
    
    if (holeData) {
        document.getElementById('holeId').value = holeId;
        document.getElementById('holeDip').value = holeData.dip;
        document.getElementById('holeDipSlider').value = holeData.dip;
        document.getElementById('holeAzimuth').value = holeData.azimuth;
        document.getElementById('holeAzimuthSlider').value = holeData.azimuth;
        updateDrillHoleInfoSummary();
        updatePreview();
    }
}


// Remove the setupHoleIdDropdown function as it's now in csv_import.js

function setupDrillHoleInfoToggle() {
    const toggle = document.getElementById('drillHoleInfoToggle');
    const drillHoleInfo = document.getElementById('drillHoleInfo');
    const drillHoleInfoSummary = document.getElementById('drillHoleInfoSummary');

    toggle.addEventListener('click', () => {
        drillHoleInfo.classList.toggle('hidden');
        drillHoleInfoSummary.classList.toggle('hidden');
        toggle.innerHTML = drillHoleInfo.classList.contains('hidden') ? 
            '<i class="fas fa-chevron-down"></i>' : 
            '<i class="fas fa-chevron-up"></i>';
        updateDrillHoleInfoSummary();
    });
}

function updateDrillHoleInfoSummary() {
    const holeId = document.getElementById('holeId').value;
    const holeDip = document.getElementById('holeDip').value;
    const holeAzimuth = document.getElementById('holeAzimuth').value;
    const summary = document.getElementById('drillHoleInfoSummary');

    summary.innerHTML = `
        <span id="holeIdSummary">ID: ${holeId}</span>
        <span id="holeDipSummary">Dip: ${holeDip}°</span>
        <span id="holeAzimuthSummary">Azimuth: ${holeAzimuth}°</span>
    `;
}

function setupMeasurementHandlers() {
    console.log("Setting up measurement handlers...");
    const handlers = [
        { id: 'addMeasurement', handler: addMeasurement },
        { id: 'undoMeasurement', handler: undoLastMeasurement },
        { id: 'copyResults', handler: copyResults },
        { id: 'saveAsCSV', handler: saveAsCSV },
        { id: 'clearMeasurements', handler: clearMeasurementsWithConfirmation },
        { id: 'exportData', handler: exportData }
    ];

    handlers.forEach(({ id, handler }) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', async () => {
                await triggerHapticFeedback();
                handler();
            });
        } else {
            console.warn(`Button with id '${id}' not found.`);
        }
    });

    console.log("Measurement handlers set up.");
}

function setupDepthButtons() {
    const depthButtons = document.querySelectorAll('.depth-button');
    const depthInput = document.getElementById('depth');

    depthButtons.forEach(button => {
        button.addEventListener('click', async () => {
            await triggerHapticFeedback();
            const amount = parseFloat(button.getAttribute('data-amount'));
            if (depthInput) {
                depthInput.value = (parseFloat(depthInput.value) + amount).toFixed(2);
                
                // Add visual feedback
                button.classList.add('active');
                setTimeout(() => {
                    button.classList.remove('active');
                }, 200);

                // Update hole info based on new depth
                updateHoleInfo();
            } else {
                console.warn("Depth input not found.");
            }
        });
    });

    // Add event listener for manual depth input
    if (depthInput) {
        depthInput.addEventListener('input', updateHoleInfo);
    } else {
        console.warn("Depth input not found.");
    }
}

async function setupTypeSelectors() {
    try {
        const settings = await loadSettings();
        updateTypeSelectorButtons(settings.measurementTypes);
        updateGenerationSelectorButtons(settings.generationTypes);
        updateCustomTypeSelectorButtons(settings.customTypes);
    } catch (error) {
        handleError(error, "Error setting up type selectors");
    }
}

export function updateTypeSelectorButtons(types) {
    updateSelectorButtons('.type-selector', types, 'type', setSelectedType);
}

export function updateGenerationSelectorButtons(types) {
    updateSelectorButtons('.generation-selector', types, 'generation', setSelectedGeneration);
}

export function updateCustomTypeSelectorButtons(customTypes) {
    const container = document.querySelector('.custom-type-selectors');
    if (!container) {
        console.warn("Custom type selectors container not found.");
        return;
    }
    container.innerHTML = ''; // Clear existing custom type selectors

    customTypes.forEach(customType => {
        const selectorDiv = document.createElement('div');
        selectorDiv.className = `custom-type-selector custom-type-selector-${customType.name.replace(/\s+/g, '-').toLowerCase()}`;
        const label = document.createElement('label');
        label.textContent = customType.name + ':';
        selectorDiv.appendChild(label);
        container.appendChild(selectorDiv);

        updateSelectorButtons(
            `.custom-type-selector-${customType.name.replace(/\s+/g, '-').toLowerCase()}`, 
            customType.options, 
            'custom-option', 
            (option) => setSelectedCustomType(customType.name, option)
        );
    });
}


function updateSelectorButtons(containerSelector, options, dataAttribute, onClickHandler) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`Container not found: ${containerSelector}`);
        return;
    }
    container.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = `${dataAttribute}-button`;
        button.setAttribute(`data-${dataAttribute}`, option);
        button.textContent = option;
        button.onclick = async () => {
            await triggerHapticFeedback();
            if (button.classList.contains('active')) {
                // If the button is already active, deselect it
                button.classList.remove('active');
                onClickHandler(null); // Call the handler with null to indicate deselection
            } else {
                // Remove 'active' class from all buttons in this container
                container.querySelectorAll(`.${dataAttribute}-button`).forEach(btn => btn.classList.remove('active'));
                // Add 'active' class to clicked button
                button.classList.add('active');
                onClickHandler(option);
            }
        };
        container.appendChild(button);
    });
}

async function syncInputs() {
    const inputs = ['holeDip', 'holeAzimuth', 'alpha', 'beta'];
    inputs.forEach(id => {
        const slider = document.getElementById(id + 'Slider');
        const input = document.getElementById(id);
        if (slider && input) {
            slider.addEventListener('input', async () => {
                await triggerHapticFeedback(5); // Shorter vibration for continuous feedback
                input.value = slider.value;
                updatePreview();
                if (id === 'holeDip' || id === 'holeAzimuth') {
                    await saveDrillHoleInfo({
                        holeId: document.getElementById('holeId')?.value || '',
                        holeDip: document.getElementById('holeDip')?.value || '0',
                        holeAzimuth: document.getElementById('holeAzimuth')?.value || '0'
                    });
                    updateDrillHoleInfoSummary();
                }
            });
            input.addEventListener('input', async () => {
                slider.value = input.value;
                updatePreview();
                if (id === 'holeDip' || id === 'holeAzimuth') {
                    await saveDrillHoleInfo({
                        holeId: document.getElementById('holeId')?.value || '',
                        holeDip: document.getElementById('holeDip')?.value || '0',
                        holeAzimuth: document.getElementById('holeAzimuth')?.value || '0'
                    });
                    updateDrillHoleInfoSummary();
                }
            });
        } else {
            console.warn(`Input or slider for '${id}' not found.`);
        }
    });

    const holeIdInput = document.getElementById('holeId');
    if (holeIdInput) {
        holeIdInput.addEventListener('input', async () => {
            await saveDrillHoleInfo({
                holeId: holeIdInput.value,
                holeDip: document.getElementById('holeDip')?.value || '0',
                holeAzimuth: document.getElementById('holeAzimuth')?.value || '0'
            });
            updateDrillHoleInfoSummary();
        });
    } else {
        console.warn("Hole ID input not found.");
    }

    // Load saved drill hole info
    try {
        const savedInfo = await loadDrillHoleInfo();
        if (savedInfo) {
            const elements = {
                holeId: document.getElementById('holeId'),
                holeDip: document.getElementById('holeDip'),
                holeAzimuth: document.getElementById('holeAzimuth'),
                holeDipSlider: document.getElementById('holeDipSlider'),
                holeAzimuthSlider: document.getElementById('holeAzimuthSlider')
            };

            Object.entries(elements).forEach(([key, element]) => {
                if (element && savedInfo[key] !== undefined) {
                    element.value = savedInfo[key];
                } else {
                    console.warn(`Element for '${key}' not found or saved value is undefined.`);
                }
            });
            updateDrillHoleInfoSummary();
        }
    } catch (error) {
        handleError(error, "Error loading drill hole info");
    }
}

export async function updatePreview() {
    const elements = {
        holeDip: document.getElementById('holeDip'),
        holeAzimuth: document.getElementById('holeAzimuth'),
        alpha: document.getElementById('alpha'),
        beta: document.getElementById('beta'),
        preview: document.getElementById('preview')
    };

    if (Object.values(elements).every(el => el)) {
        const holeDip = parseFloat(elements.holeDip.value) || 0;
        const holeAzimuth = parseFloat(elements.holeAzimuth.value) || 0;
        const alpha = parseFloat(elements.alpha.value) || 0;
        const beta = parseFloat(elements.beta.value) || 0;

        if (isNaN(holeDip) || isNaN(holeAzimuth) || isNaN(alpha) || isNaN(beta)) {
            elements.preview.textContent = "Invalid input. Please enter numbers.";
            return;
        }

        const [dip, dipDirection] = calculateDipDirection(alpha, beta, holeDip, holeAzimuth);
        
        try {
            const settings = await loadSettings();
            const strike = calculateStrike(dipDirection, settings.strikeMode);
            
            let previewText = `<span class="preview-label">Dip:</span> <span class="preview-value">${dip.toFixed(1)}°</span> <span class="preview-label">Dip Direction:</span> <span class="preview-value">${dipDirection.toFixed(1)}°</span> <span class="preview-label">Strike:</span> <span class="preview-value">${strike.toFixed(1)}°</span>`;
        
            elements.preview.innerHTML = previewText;
        } catch (error) {
            handleError(error, "Error updating preview");
        }
    } else {
        console.warn("One or more elements required for preview update not found.");
    }
}

export async function updateResultsTable() {
    const resultsTable = document.getElementById('resultsTable');
    if (!resultsTable) {
        console.warn("Results table not found.");
        return;
    }

    const thead = resultsTable.querySelector('thead');
    const tbody = resultsTable.querySelector('tbody');
    
    if (!thead || !tbody) {
        console.warn("Table head or body not found.");
        return;
    }

    // Clear existing content
    tbody.innerHTML = '';

    // Update header row
    const headerRow = thead.querySelector('tr');
    headerRow.innerHTML = '<th><input type="checkbox" id="selectAllMeasurements"></th>';
    const baseColumns = ['Depth', 'Type', 'Gen', 'Dip', 'DipDir', 'Strike', 'Comment'];
    baseColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });

    try {
        // Add custom type columns
        const settings = await loadSettings();
        settings.customTypes.forEach(customType => {
            const th = document.createElement('th');
            th.textContent = customType.name;
            headerRow.appendChild(th);
        });

        // Populate table body
        measurements.forEach((measurement, index) => {
            const row = tbody.insertRow();
            const checkboxCell = row.insertCell(0);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'measurement-checkbox';
            checkbox.dataset.index = index;
            checkboxCell.appendChild(checkbox);

            row.insertCell(1).textContent = measurement.depth.toFixed(2);
            row.insertCell(2).textContent = measurement.type;
            row.insertCell(3).textContent = measurement.generation;
            row.insertCell(4).textContent = measurement.dip + '°';
            row.insertCell(5).textContent = measurement.dipDirection + '°';
            row.insertCell(6).textContent = measurement.strike + '°';
            
            const commentCell = row.insertCell(7);
            commentCell.textContent = (measurement.comment.length > 20 ? 
                measurement.comment.substring(0, 20) + '...' : 
                measurement.comment);
            commentCell.title = measurement.comment; // Show full comment on hover

            // Add custom type values
            settings.customTypes.forEach(customType => {
                const cell = row.insertCell();
                const customValue = measurement.customTypes && measurement.customTypes[customType.name];
                cell.textContent = customValue || '-';
            });
        });

        // Add event listener for "Select All" checkbox
        const selectAllCheckbox = document.getElementById('selectAllMeasurements');
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.measurement-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = this.checked);
        });

    } catch (error) {
        handleError(error, "Error updating results table");
    }
}

export function adjustDepth(amount) {
    const depthInput = document.getElementById('depth');
    if (depthInput) {
        depthInput.value = (parseFloat(depthInput.value) + amount).toFixed(2);
    } else {
        console.warn("Depth input not found.");
    }
}

export function resetUISelections() {
    document.querySelectorAll('.type-button, .generation-button, .custom-option-button').forEach(btn => {
        btn.classList.remove('active');
    });
}
