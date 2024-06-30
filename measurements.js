import { saveMeasurements, loadMeasurementsFromStorage, saveDrillHoleInfo } from './storage.js';
import { updateResultsTable, updatePreview } from './ui.js';

let measurements = [];
let selectedType = 'bedding';
let selectedGeneration = '';
let selectedCustomType = null;
let selectedCustomTypeOption = null;

export function loadMeasurements() {
    measurements = loadMeasurementsFromStorage();
    updateResultsTable();
}

export function setupMeasurementHandlers() {
    document.getElementById('addMeasurement').addEventListener('click', addMeasurement);
    document.getElementById('copyResults').addEventListener('click', copyResults);
    document.getElementById('saveAsCSV').addEventListener('click', saveAsCSV);
    document.getElementById('clearMeasurements').addEventListener('click', clearMeasurementsWithConfirmation);
}

function addMeasurement() {
    const holeId = document.getElementById('holeId').value;
    const holeDip = parseFloat(document.getElementById('holeDip').value);
    const holeAzimuth = parseFloat(document.getElementById('holeAzimuth').value);
    const depth = parseFloat(document.getElementById('depth').value) || 0;
    const alpha = parseFloat(document.getElementById('alpha').value);
    const beta = parseFloat(document.getElementById('beta').value);
    const comment = document.getElementById('comment').value;

    const errorMessage = validateInputs(holeDip, holeAzimuth, alpha, beta);
    if (errorMessage) {
        document.getElementById('error').textContent = errorMessage;
        return;
    }
    document.getElementById('error').textContent = '';

    const [dip, dipDirection] = calculateDipDirection(alpha, beta, holeDip, holeAzimuth);
    const strike = (dipDirection + 90) % 360;
    
    const result = {
        holeId,
        depth,
        type: selectedType,
        generation: selectedGeneration,
        customType: selectedCustomType ? {
            name: selectedCustomType.name,
            option: selectedCustomTypeOption
        } : null,
        alpha: alpha.toFixed(1),
        beta: beta.toFixed(1),
        dip: dip.toFixed(1),
        dipDirection: dipDirection.toFixed(1),
        strike: strike.toFixed(1),
        comment
    };

    measurements.push(result);
    saveMeasurements(measurements);
    saveDrillHoleInfo({ holeId, holeDip, holeAzimuth });

    updateResultsTable();

    document.getElementById('alpha').value = '0';
    document.getElementById('beta').value = '0';
    document.getElementById('alphaSlider').value = '0';
    document.getElementById('betaSlider').value = '0';
    document.getElementById('comment').value = '';
    resetGeneration();
    resetCustomType();
    updatePreview();
}

export function calculateDipDirection(inputAlpha, inputBeta, inputHoleDip, inputHoleAzimuth) {
    const toRadians = (angle) => angle * Math.PI / 180;
    const toDegrees = (angle) => angle * 180 / Math.PI;

    const alphaRad = toRadians(inputAlpha);
    const betaRad = toRadians(inputBeta);
    const holeDipRad = toRadians(-inputHoleDip);
    const holeAzimuthRad = toRadians(inputHoleAzimuth);

    const sinBeta = -Math.sin(betaRad);
    const cosBeta = -Math.cos(betaRad);
    const tanAlpha = -1 / Math.tan(alphaRad);

    let P, Q, R;
    if (sinBeta === 0) {
        P = 0;
        Q = Math.sqrt(-tanAlpha);
        R = cosBeta / Math.sqrt(-tanAlpha);
    } else {
        P = Math.sqrt(-tanAlpha / (1 + cosBeta ** 2 / sinBeta ** 2));
        Q = cosBeta * P / sinBeta;
        R = sinBeta / P;
    }

    const T = P;
    const U = Q * Math.cos(Math.PI / 2 - holeDipRad) - R * Math.sin(Math.PI / 2 - holeDipRad);
    const V = Q * Math.sin(Math.PI / 2 - holeDipRad) + R * Math.cos(Math.PI / 2 - holeDipRad);
    const X = T * Math.cos(-holeAzimuthRad) - U * Math.sin(-holeAzimuthRad);
    const Y = T * Math.sin(-holeAzimuthRad) + U * Math.cos(-holeAzimuthRad);
    const Z = V;

    const AL = Z * X;
    const AM = Z * Y;
    const AN = -(X ** 2 + Y ** 2);

    const AB = (AL !== 0 || AM !== 0 || AN !== 0) ? 1 : 3;

    let dipOutputFINAL, dipdirectionOutputFINAL;

    if (AB > 1) {
        if (AB === 2) {
            dipOutputFINAL = 90;
            dipdirectionOutputFINAL = inputHoleAzimuth;
        } else {
            dipOutputFINAL = 0;
            dipdirectionOutputFINAL = 0;
        }
    } else {
        const AD = Math.atan(Math.abs(AL / AM));
        const AE = toDegrees(AD);
        const AG = toDegrees(Math.PI - AD);
        const AI = toDegrees(Math.PI + AD);
        const AK = toDegrees(2 * Math.PI - AD);

        if (AL > 0) {
            dipdirectionOutputFINAL = AM > 0 ? AE : AG;
        } else {
            dipdirectionOutputFINAL = AM > 0 ? AK : AI;
        }
        dipOutputFINAL = toDegrees(Math.atan(-AN / Math.sqrt(AL ** 2 + AM ** 2)));
    }

    return [dipOutputFINAL, dipdirectionOutputFINAL];
}

function validateInputs(holeDip, holeAzimuth, alpha, beta) {
    if (holeDip < -90 || holeDip > 90) return "Hole Dip must be between -90° and 90°";
    if (holeAzimuth < 0 || holeAzimuth > 360) return "Hole Azimuth must be between 0° and 360°";
    if (alpha < 0 || alpha > 90) return "Alpha (Core Angle) must be between 0° and 90°";
    if (beta < 0 || beta > 360) return "Beta must be between 0° and 360°";
    return null;
}

function resetGeneration() {
    const buttons = document.querySelectorAll('.generation-button');
    buttons.forEach(b => b.classList.remove('active'));
    selectedGeneration = '';
}

function resetCustomType() {
    const buttons = document.querySelectorAll('.custom-type-button');
    buttons.forEach(b => b.classList.remove('active'));
    selectedCustomType = null;
    selectedCustomTypeOption = null;
    document.querySelector('.custom-type-options').innerHTML = '';
}

function copyResults() {
    const csvContent = getCSVContent();

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(csvContent).then(() => {
            document.getElementById('copyStatus').textContent = 'Results copied to clipboard!';
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyTextToClipboard(csvContent);
        });
    } else {
        fallbackCopyTextToClipboard(csvContent);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'Results copied to clipboard!' : 'Unable to copy results';
        document.getElementById('copyStatus').textContent = msg;
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        document.getElementById('copyStatus').textContent = 'Unable to copy results';
    }

    document.body.removeChild(textArea);
}

async function saveAsCSV() {
    const csvContent = getCSVContent();
    const filename = `drill_hole_measurements_${new Date().toISOString().slice(0,10)}.csv`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'CSV File',
                    accept: {'text/csv': ['.csv']},
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(csvContent);
            await writable.close();
            document.getElementById('copyStatus').textContent = 'File saved successfully!';
        } catch (err) {
            console.error('Error saving file:', err);
            fallbackSaveAsCSV(csvContent, filename);
        }
    } else {
        fallbackSaveAsCSV(csvContent, filename);
    }
}

function fallbackSaveAsCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    document.getElementById('copyStatus').textContent = 'File download initiated.';
}

function getCSVContent() {
    let csvContent = "HoleID,Depth,Type,Generation,CustomType,CustomOption,Alpha,Beta,Dip,DipDirection,Strike,Comment\n";
    
    measurements.forEach(function(measurement) {
        let row = [
            measurement.holeId,
            measurement.depth,
            measurement.type,
            measurement.generation,
            measurement.customType ? measurement.customType.name : '',
            measurement.customType ? measurement.customType.option : '',
            measurement.alpha,
            measurement.beta,
            measurement.dip,
            measurement.dipDirection,
            measurement.strike,
            measurement.comment
        ].map(value => `"${value}"`).join(",");
        csvContent += row + "\n";
    });

    return csvContent;
}

function clearMeasurementsWithConfirmation() {
    if (confirm("Are you sure you want to clear all measurements? This action cannot be undone.")) {
        measurements = [];
        saveMeasurements(measurements);
        updateResultsTable();
        document.getElementById('copyStatus').textContent = 'All measurements cleared.';
        document.getElementById('holeId').value = '';
        document.getElementById('holeDip').value = '0';
        document.getElementById('holeAzimuth').value = '0';
        document.getElementById('holeDipSlider').value = '0';
        document.getElementById('holeAzimuthSlider').value = '0';
        saveDrillHoleInfo({ holeId: '', holeDip: 0, holeAzimuth: 0 });
    }
}

export function setSelectedType(type) {
    selectedType = type;
}

export function setSelectedGeneration(gen) {
    selectedGeneration = gen;
}

export function setSelectedCustomType(type) {
    selectedCustomType = type;
    selectedCustomTypeOption = null;
}

export function setSelectedCustomTypeOption(option) {
    selectedCustomTypeOption = option;
}

export { measurements, selectedType, selectedGeneration, selectedCustomType, selectedCustomTypeOption };
