import { measurements, calculateDipDirection, setSelectedType, setSelectedGeneration, setSelectedCustomType, setSelectedCustomTypeOption } from './measurements.js';
import { loadDrillHoleInfo, saveDrillHoleInfo, loadSettings } from './storage.js';

export function setupUI() {
    console.log("Setting up UI...");
    setupTabs();
    setupTypeSelector();
    setupGenerationSelector();
    setupCustomTypeSelector();
    syncInputs();
    console.log("UI setup complete.");
}

export function updateResultsTable() {
    const resultsTable = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
    resultsTable.innerHTML = '';

    measurements.forEach((measurement) => {
        const row = resultsTable.insertRow();
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

        if (measurement.customType) {
            row.insertCell(6).textContent = `${measurement.customType.name}: ${measurement.customType.option}`;
        } else {
            row.insertCell(6).textContent = '-';
        }
    });
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

function setupTypeSelector() {
    const buttons = document.querySelectorAll('.type-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            setSelectedType(button.dataset.type);
            updatePreview();
        });
    });
}

function setupGenerationSelector() {
    const buttons = document.querySelectorAll('.generation-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            setSelectedGeneration(button.dataset.gen);
        });
    });
}

function setupCustomTypeSelector() {
    const container = document.querySelector('.custom-type-selector');
    container.addEventListener('click', (event) => {
        if (event.target.classList.contains('custom-type-button')) {
            const typeName = event.target.getAttribute('data-type');
            const settings = loadSettings();
            const customType = settings.customTypes.find(type => type.name === typeName);
            if (customType) {
                setSelectedCustomType(customType);
                showCustomTypeOptions(customType);
            }
        }
    });
}

function showCustomTypeOptions(customType) {
    const optionsContainer = document.querySelector('.custom-type-options');
    optionsContainer.innerHTML = '';
    customType.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'custom-type-option';
        button.textContent = option;
        button.onclick = () => setSelectedCustomTypeOption(option);
        optionsContainer.appendChild(button);
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

export function adjustDepth(amount) {
    const depthInput = document.getElementById('depth');
    depthInput.value = (parseFloat(depthInput.value) + amount).toFixed(2);
}

export function updateTypeSelectorButtons(types) {
    const container = document.querySelector('.type-selector');
    container.innerHTML = '';
    types.forEach(type => {
        const button = document.createElement('button');
        button.className = 'type-button';
        button.setAttribute('data-type', type);
        button.textContent = type;
        button.onclick = () => {
            document.querySelectorAll('.type-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            setSelectedType(type);
        };
        container.appendChild(button);
    });
    // Set the first type as active
    if (types.length > 0) {
        container.firstChild.classList.add('active');
        setSelectedType(types[0]);
    }
}

export function updateGenerationSelectorButtons(types) {
    const container = document.querySelector('.generation-selector');
    container.innerHTML = '';
    types.forEach(type => {
        const button = document.createElement('button');
        button.className = 'generation-button';
        button.setAttribute('data-gen', type);
        button.textContent = type;
        button.onclick = () => {
            document.querySelectorAll('.generation-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            setSelectedGeneration(type);
        };
        container.appendChild(button);
    });
}

export function updateCustomTypeSelectorButtons(types) {
    const container = document.querySelector('.custom-type-selector');
    container.innerHTML = '';
    types.forEach(type => {
        const button = document.createElement('button');
        button.className = 'custom-type-button';
        button.setAttribute('data-type', type.name);
        button.textContent = type.name;
        button.onclick = () => {
            document.querySelectorAll('.custom-type-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            setSelectedCustomType(type);
            showCustomTypeOptions(type);
        };
        container.appendChild(button);
    });
}
