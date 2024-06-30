import { measurements, calculateDipDirection } from './measurements.js';
import { 
    loadDrillHoleInfo, 
    saveDrillHoleInfo, 
    loadSettings, 
    loadLastMeasurement, 
    saveMeasurements, 
    loadMeasurementsFromStorage 
} from './storage.js';

let selectedType = '';
let selectedGeneration = '';
let selectedCustomTypes = {};

export function setupUI() {
    console.log("Setting up UI...");
    try {
        setupTabs();
        setupTypeSelectors();
        setupDepthButtons();
        syncInputs();
        setupAddMeasurementButton();
        setupActionButtons();
        updateResultsTable();
        console.log("UI setup complete.");
    } catch (error) {
        console.error("Error during UI setup:", error);
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

function setupTypeSelectors() {
    const settings = loadSettings();
    const savedMeasurement = loadLastMeasurement();

    updateTypeSelectorButtons(settings.measurementTypes, savedMeasurement?.type);
    updateGenerationSelectorButtons(settings.generationTypes, savedMeasurement?.generation);
    updateCustomTypeSelectorButtons(settings.customTypes, savedMeasurement?.customTypes);
}

function setupDepthButtons() {
    const depthButtons = document.querySelectorAll('.depth-button');
    depthButtons.forEach(button => {
        button.addEventListener('click', () => {
            const amount = parseFloat(button.getAttribute('data-amount'));
            adjustDepth(amount);
        });
    });
}

function setupAddMeasurementButton() {
    const addButton = document.getElementById('addMeasurement');
    if (addButton) {
        addButton.addEventListener('click', addMeasurement);
    } else {
        console.error("Add Measurement button not found");
    }
}

function setupActionButtons() {
    const copyButton = document.getElementById('copyResults');
    const saveCSVButton = document.getElementById('saveAsCSV');
    const clearButton = document.getElementById('clearMeasurements');

    if (copyButton) copyButton.addEventListener('click', copyResults);
    if (saveCSVButton) saveCSVButton.addEventListener('click', saveAsCSV);
    if (clearButton) clearButton.addEventListener('click', clearMeasurementsWithConfirmation);
}

export function updateTypeSelectorButtons(types, selectedType) {
    updateSelectorButtons('.type-selector', types, 'type', setSelectedType, selectedType);
}

export function updateGenerationSelectorButtons(types, selectedGeneration) {
    updateSelectorButtons('.generation-selector', types, 'gen', setSelectedGeneration, selectedGeneration);
}

export function updateCustomTypeSelectorButtons(customTypes, selectedCustomTypes) {
    const container = document.querySelector('.custom-type-selectors');
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
            (option) => setSelectedCustomType(customType.name, option),
            selectedCustomTypes?.[customType.name]
        );
    });
}

function updateSelectorButtons(containerSelector, options, dataAttribute, onClickHandler, selectedValue) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container not found: ${containerSelector}`);
        return;
    }
    container.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = `${dataAttribute}-button selector-button`;
        button.setAttribute(`data-${dataAttribute}`, option);
        button.textContent = option;
        if (option === selectedValue) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            container.querySelectorAll(`.${dataAttribute}-button`).forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            onClickHandler(option);
        });
        container.appendChild(button);
    });
}

function syncInputs() {
    const inputs = ['holeDip', 'holeAzimuth', 'alpha', 'beta'];
    inputs.forEach(id => {
        const slider = document.getElementById(id + 'Slider');
        const input = document.getElementById(id);
        slider.addEventListener('input', () => {
            input.value = slider.value;
            updatePreview();
            if (id === 'holeDip' || id === 'holeAzimuth') {
                saveDrillHoleInfo({
                    holeId: document.getElementById('holeId').value,
                    holeDip: document.getElementById('holeDip').value,
                    holeAzimuth: document.getElementById('holeAzimuth').value
                });
            }
        });
        input.addEventListener('input', () => {
            slider.value = input.value;
            updatePreview();
            if (id === 'holeDip' || id === 'holeAzimuth') {
                saveDrillHoleInfo({
                    holeId: document.getElementById('holeId').value,
                    holeDip: document.getElementById('holeDip').value,
                    holeAzimuth: document.getElementById('holeAzimuth').value
                });
            }
        });
    });

    document.getElementById('holeId').addEventListener('input', () => {
        saveDrillHoleInfo({
            holeId: document.getElementById('holeId').value,
            holeDip: document.getElementById('holeDip').value,
            holeAzimuth: document.getElementById('holeAzimuth').value
        });
    });

    // Load saved drill hole info
    const savedInfo = loadDrillHoleInfo();
    if (savedInfo) {
        document.getElementById('holeId').value = savedInfo.holeId;
        document.getElementById('holeDip').value = savedInfo.holeDip;
        document.getElementById('holeAzimuth').value = savedInfo.holeAzimuth;
        document.getElementById('holeDipSlider').value = savedInfo.holeDip;
        document.getElementById('holeAzimuthSlider').value = savedInfo.holeAzimuth;
    }
}

export function updatePreview() {
    const holeDip = parseFloat(document.getElementById('holeDip').value);
    const holeAzimuth = parseFloat(document.getElementById('holeAzimuth').value);
    const alpha = parseFloat(document.getElementById('alpha').value);
    const beta = parseFloat(document.getElementById('beta').value);

    const [dip, dipDirection] = calculateDipDirection(alpha, beta, holeDip, holeAzimuth);
    const strike = (dipDirection + 90) % 360;

    const previewElement = document.getElementById('preview');
    
    let previewText = `Dip: ${dip.toFixed(1)}°\nDip Direction: ${dipDirection.toFixed(1)}°\nStrike: ${strike.toFixed(1)}°`;
    
    previewElement.textContent = previewText;
}

export function updateResultsTable() {
    const resultsTable = document.getElementById('resultsTable');
    const thead = resultsTable.querySelector('thead');
    const tbody = resultsTable.querySelector('tbody');
    
    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create header row
    const headerRow = document.createElement('tr');
    const baseColumns = ['Depth', 'Type', 'Gen', 'Dip', 'DipDir', 'Comment'];
    baseColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });

    // Add custom type columns
    const settings = loadSettings();
    settings.customTypes.forEach(customType => {
        const th = document.createElement('th');
        th.textContent = customType.name;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    // Populate table body
    measurements.forEach((measurement) => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = measurement.depth.toFixed(2);
        row.insertCell(1).textContent = measurement.type;
        row.insertCell(2).textContent = measurement.generation;
        row.insertCell(3).textContent = measurement.dip.toFixed(1) + '°';
        row.insertCell(4).textContent = measurement.dipDirection.toFixed(1) + '°';
        
        const commentCell = row.insertCell(5);
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
}

export function adjustDepth(amount) {
    const depthInput = document.getElementById('depth');
    depthInput.value = (parseFloat(depthInput.value) + amount).toFixed(2);
    depthInput.dispatchEvent(new Event('input')); // Trigger input event
    updatePreview(); // Update the preview after adjusting depth
}

function addMeasurement() {
    console.log("Adding new measurement...");
    const holeId = document.getElementById('holeId').value;
    const depth = parseFloat(document.getElementById('depth').value) || 0;
    const holeDip = parseFloat(document.getElementById('holeDip').value);
    const holeAzimuth = parseFloat(document.getElementById('holeAzimuth').value);
    const alpha = parseFloat(document.getElementById('alpha').value);
    const beta = parseFloat(document.getElementById('beta').value);
    const comment = document.getElementById('comment').value;

    if (!selectedType) {
        alert("Please select a measurement type.");
        return;
    }

    const [dip, dipDirection] = calculateDipDirection(alpha, beta, holeDip, holeAzimuth);
    const strike = (dipDirection + 90) % 360;

    const newMeasurement = {
        holeId,
        depth,
        type: selectedType,
        generation: selectedGeneration,
        customTypes: { ...selectedCustomTypes },
        alpha,
        beta,
        dip,
        dipDirection,
        strike,
        comment
    };

    measurements.push(newMeasurement);
    saveMeasurements(measurements);
    updateResultsTable();

    // Reset input fields
    document.getElementById('alpha').value = '0';
    document.getElementById('beta').value = '0';
    document.getElementById('alphaSlider').value = '0';
    document.getElementById('betaSlider').value = '0';
    document.getElementById('comment').value = '';

    // Increment depth
    const depthInput = document.getElementById('depth');
    depthInput.value = (parseFloat(depthInput.value) + 0.1).toFixed(2);

    resetUISelections();
    updatePreview();
    console.log("New measurement added:", newMeasurement);
}

function copyResults() {
    const csvContent = getCSVContent();
    navigator.clipboard.writeText(csvContent).then(() => {
        alert("Results copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert("Failed to copy results. Please try again.");
    });
}

function saveAsCSV() {
    const csvContent = getCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "measurements.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function getCSVContent() {
    const headers = ['HoleID', 'Depth', 'Type', 'Generation', 'Alpha', 'Beta', 'Dip', 'DipDirection', 'Strike', 'Comment'];
    const settings = loadSettings();
    settings.customTypes.forEach(customType => {
        headers.push(customType.name);
    });

    let csvContent = headers.join(',') + '\n';

    measurements.forEach(measurement => {
        let row = [
            measurement.holeId,
            measurement.depth,
            measurement.type,
            measurement.generation,
            measurement.alpha,
            measurement.beta,
            measurement.dip,
            measurement.dipDirection,
            measurement.strike,
            measurement.comment
        ];

        settings.customTypes.forEach(customType => {
            row.push(measurement.customTypes[customType.name] || '');
        });

        csvContent += row.map(value => `"${value}"`).join(',') + '\n';
    });

    return csvContent;
}

function clearMeasurementsWithConfirmation() {
    if (confirm("Are you sure you want to clear all measurements? This action cannot be undone.")) {
        measurements.length = 0; // Clear the array
        saveMeasurements(measurements);
        updateResultsTable();
        alert("All measurements have been cleared.");
    }
}

export function setSelectedType(type) {
    selectedType = type;
}

export function setSelectedGeneration(generation) {
    selectedGeneration = generation;
}

export function setSelectedCustomType(typeName, value) {
    selectedCustomTypes[typeName] = value;
}

// Initial setup
window.addEventListener('load', () => {
    setupUI();
});

// Exports
export { 
    setupUI, 
    updateTypeSelectorButtons, 
    updateGenerationSelectorButtons, 
    updateCustomTypeSelectorButtons, 
    updatePreview, 
    updateResultsTable,
    adjustDepth,  // Add this line if it's not already here
    resetUISelections 
};
