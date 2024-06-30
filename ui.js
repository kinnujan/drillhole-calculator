import { measurements, calculateDipDirection, setSelectedType, setSelectedGeneration, setSelectedCustomType } from './measurements.js';
import { loadDrillHoleInfo, saveDrillHoleInfo, loadSettings } from './storage.js';

export function setupUI() {
    console.log("Setting up UI...");
    setupTabs();
    setupTypeSelectors();
    syncInputs();
    console.log("UI setup complete.");
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
    updateTypeSelectorButtons(settings.measurementTypes);
    updateGenerationSelectorButtons(settings.generationTypes);
    updateCustomTypeSelectorButtons(settings.customTypes);
}

export function updateTypeSelectorButtons(types) {
    updateSelectorButtons('.type-selector', types, 'type', setSelectedType);
}

export function updateGenerationSelectorButtons(types) {
    updateSelectorButtons('.generation-selector', types, 'gen', setSelectedGeneration);
}

export function updateCustomTypeSelectorButtons(customTypes) {
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
            (option) => setSelectedCustomType(customType.name, option)
        );
    });
}

function updateSelectorButtons(containerSelector, options, dataAttribute, onClickHandler) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container not found: ${containerSelector}`);
        return;
    }
    container.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = `${dataAttribute}-button`;
        button.setAttribute(`data-${dataAttribute}`, option);
        button.textContent = option;
        button.onclick = () => {
            container.querySelectorAll(`.${dataAttribute}-button`).forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            onClickHandler(option);
        };
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
        row.insertCell(3).textContent = measurement.dip + '°';
        row.insertCell(4).textContent = measurement.dipDirection + '°';
        
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
}

export function resetUISelections() {
    document.querySelectorAll('.type-button, .generation-button, .custom-option-button').forEach(btn => {
        btn.classList.remove('active');
    });
}
