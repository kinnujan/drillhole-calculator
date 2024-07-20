import { COLOR_MIN_SATURATION, COLOR_MAX_SATURATION, COLOR_MIN_LIGHTNESS, COLOR_MAX_LIGHTNESS } from './constants.js';
import { measurements, calculateDipDirection, setSelectedType, setSelectedGeneration, setSelectedCustomType, addMeasurement, copyResults, saveAsCSV, clearMeasurementsWithConfirmation, exportData, undoLastMeasurement } from './measurements.js';
import { loadDrillHoleInfo, saveDrillHoleInfo, loadSettings } from './storage.js';
import { handleError, calculateStrike } from './utils.js';

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
    console.log("UI setup complete.");
}

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
}function calculateColor(dipDirection, dip) {
    // Normalize dip direction to 0-360 range
    dipDirection = (dipDirection % 360 + 360) % 360;
    
    // Calculate hue based on dip direction (0-360)
    const hue = dipDirection;
    
    // Calculate saturation based on dip (0-90 degrees mapped to MIN-MAX%)
    const sat = COLOR_MIN_SATURATION + (dip / 90) * (COLOR_MAX_SATURATION - COLOR_MIN_SATURATION);
    
    // Adjust lightness based on dip (higher dip = darker color)
    const lit = COLOR_MAX_LIGHTNESS - (dip / 90) * (COLOR_MAX_LIGHTNESS - COLOR_MIN_LIGHTNESS);
    
    return `hsl(${hue}, ${sat}%, ${lit}%)`;
}


function setupDepthButtons() {
    const depthButtons = document.querySelectorAll('.depth-button');
    depthButtons.forEach(button => {
        button.addEventListener('click', async () => {
            await triggerHapticFeedback();
            const amount = parseFloat(button.getAttribute('data-amount'));
            const depthInput = document.getElementById('depth');
            if (depthInput) {
                depthInput.value = (parseFloat(depthInput.value) + amount).toFixed(2);
                
                // Add visual feedback
                button.classList.add('active');
                setTimeout(() => {
                    button.classList.remove('active');
                }, 200);
            } else {
                console.warn("Depth input not found.");
            }
        });
    });
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
        const holeDip = parseFloat(elements.holeDip.value);
        const holeAzimuth = parseFloat(elements.holeAzimuth.value);
        const alpha = parseFloat(elements.alpha.value);
        const beta = parseFloat(elements.beta.value);

        const [dip, dipDirection] = calculateDipDirection(alpha, beta, holeDip, holeAzimuth);

        try {
            const settings = await loadSettings();
            const strike = calculateStrike(dipDirection, settings.strikeMode);

            let previewText = `
                <span class="preview-label">Dip: </span><span class="preview-value">${dip.toFixed(1)}°</span>
                <span class="preview-label">Dip Direction: </span><span class="preview-value">${dipDirection.toFixed(1)}°</span>
                <span class="preview-label">Strike: </span><span class="preview-value">${strike.toFixed(1)}°</span>
            `;

            elements.preview.innerHTML = previewText;

            if (settings.customColorEnabled) {
                const color = calculateColor(dipDirection, dip);
                elements.preview.style.backgroundColor = color;
                elements.preview.classList.add('custom-color-enabled');
            } else {
                elements.preview.style.backgroundColor = '';
                elements.preview.classList.remove('custom-color-enabled');
            }
        } catch (error) {
            handleError(error, "Error updating preview");
        }
    } else {
        console.warn("One or more elements required for preview update not found.");
    }
}
export async function updateResultsTable() {
    console.log("Updating results table");
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

    try {
        const settings = await loadSettings();
        console.log("Loaded settings:", settings);

        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('tr');
        const baseColumns = ['Depth', 'Type', 'Gen', 'Dip', 'DipDir', 'Comment'];
        const allColumns = [...baseColumns, ...settings.customTypes.map(ct => ct.name)];
        
        allColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        
        console.log("Measurements:", measurements);
        
        // Populate table body
        measurements.forEach((measurement, index) => {
            console.log(`Processing measurement ${index}:`, measurement);
            const row = document.createElement('tr');
            
            // Create an array of cell data
            const cellData = [
                { value: measurement.depth, format: (v) => (v != null && !isNaN(v)) ? Number(v).toFixed(2) : '' },
                { value: measurement.type, format: (v) => v || '' },
                { value: measurement.generation, format: (v) => v || '' },
                { value: measurement.dip, format: (v) => (v != null && !isNaN(v)) ? Number(v).toFixed(1) + '°' : '' },
                { value: measurement.dipDirection, format: (v) => (v != null && !isNaN(v)) ? Number(v).toFixed(1) + '°' : '' },
                { value: measurement.comment, format: (v) => v || '' },
                ...settings.customTypes.map(customType => ({
                    value: measurement.customTypes?.[customType.name],
                    format: (v) => v || '-'
                }))
            ];

            // Add cells to the row
            cellData.forEach((data, cellIndex) => {
                const cell = document.createElement('td');
                const formattedValue = data.format(data.value);
                cell.textContent = formattedValue;
                console.log(`Column ${cellIndex}:`, data.value, "Formatted:", formattedValue);
                
                if (cellIndex === 5 && measurement.comment) { // Comment cell
                    cell.title = measurement.comment; // Show full comment on hover
                    if (measurement.comment.length > 20) {
                        cell.textContent = measurement.comment.substring(0, 20) + '...';
                    }
                }
                row.appendChild(cell);
            });
            
            // Apply custom color if enabled
            if (settings.customColorEnabled) {
                const color = calculateColor(measurement.dipDirection, measurement.dip);
                row.style.setProperty('--row-bg-color', color);
                row.classList.add('custom-color-enabled');
            }
            
            tbody.appendChild(row);
        });

        // Add or remove custom-color-enabled class to the table
        resultsTable.classList.toggle('custom-color-enabled', settings.customColorEnabled);
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

document.addEventListener('customColorSettingChanged', async (event) => {
    const isCustomColorEnabled = event.detail;
    await updatePreview();
    await updateResultsTable();
    
    const resultsTable = document.getElementById('resultsTable');
    if (resultsTable) {
        resultsTable.classList.toggle('custom-color-enabled', isCustomColorEnabled);
        const tbody = resultsTable.querySelector('tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, index) => {
                const measurement = measurements[index];
                if (measurement) {
                    if (isCustomColorEnabled) {
                        const color = calculateColor(measurement.dipDirection, measurement.dip);
                        row.style.backgroundColor = color;
                        row.classList.add('custom-color-enabled');
                    } else {
                        row.style.backgroundColor = '';
                        row.classList.remove('custom-color-enabled');
                    }
                }
            });
        }
    }
});
