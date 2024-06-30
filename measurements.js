import { saveMeasurements, loadMeasurementsFromStorage, saveDrillHoleInfo, loadSettings } from './storage.js';
import { updateResultsTable, updatePreview, resetUISelections } from './ui.js';

let measurements = [];
let selectedType = '';
let selectedGeneration = '';
let selectedCustomTypes = {};

export function loadMeasurements() {
    console.log("Loading measurements...");
    measurements = loadMeasurementsFromStorage();
    updateResultsTable();
    console.log("Measurements loaded.");
}

export function setupMeasurementHandlers() {
    console.log("Setting up measurement handlers...");
    document.getElementById('addMeasurement').addEventListener('click', addMeasurement);
    document.getElementById('copyResults').addEventListener('click', copyResults);
    document.getElementById('saveAsCSV').addEventListener('click', saveAsCSV);
    document.getElementById('clearMeasurements').addEventListener('click', clearMeasurementsWithConfirmation);
    console.log("Measurement handlers set up.");
}

function addMeasurement() {
    console.log("Adding new measurement...");
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
        console.log("Measurement validation failed:", errorMessage);
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
        customTypes: { ...selectedCustomTypes },
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
    resetSelections();
    updatePreview();
    console.log("New measurement added:", result);
}

export function calculateDipDirection(inputAlpha, inputBeta, inputHoleDip, inputHoleAzimuth) {
    const toRadians = (angle) => angle * Math.PI / 180;
    const toDegrees = (angle) => angle * 180 / Math.PI;

    // Convert input angles to radians
    const alphaRad = toRadians(inputAlpha);
    const betaRad = toRadians(inputBeta);
    const holeDipRad = toRadians(-inputHoleDip);
    const holeAzimuthRad = toRadians(inputHoleAzimuth);

    // Calculate trigonometric values
    const sinBeta = -Math.sin(betaRad);
    const cosBeta = -Math.cos(betaRad);
    const tanAlpha = -1 / Math.tan(alphaRad);

    // Calculate direction cosines of the normal to the plane
    let normalX, normalY, normalZ;
    if (sinBeta === 0) {
        normalX = 0;
        normalY = Math.sqrt(-tanAlpha);
        normalZ = cosBeta / Math.sqrt(-tanAlpha);
    } else {
        normalX = Math.sqrt(-tanAlpha / (1 + cosBeta ** 2 / sinBeta ** 2));
        normalY = cosBeta * normalX / sinBeta;
        normalZ = sinBeta / normalX;
    }

    // Rotate the normal vector according to hole dip and azimuth
    const rotatedX = normalX;
    const rotatedY = normalY * Math.cos(Math.PI / 2 - holeDipRad) - normalZ * Math.sin(Math.PI / 2 - holeDipRad);
    const rotatedZ = normalY * Math.sin(Math.PI / 2 - holeDipRad) + normalZ * Math.cos(Math.PI / 2 - holeDipRad);

    // Adjust for hole azimuth
    const finalX = rotatedX * Math.cos(-holeAzimuthRad) - rotatedY * Math.sin(-holeAzimuthRad);
    const finalY = rotatedX * Math.sin(-holeAzimuthRad) + rotatedY * Math.cos(-holeAzimuthRad);
    const finalZ = rotatedZ;

    // Calculate components for dip and dip direction
    const dipDirectionX = finalZ * finalX;
    const dipDirectionY = finalZ * finalY;
    const dipComponent = -(finalX ** 2 + finalY ** 2);

    // Check if the plane is horizontal or vertical
    const isNonStandardOrientation = (dipDirectionX === 0 && dipDirectionY === 0 && dipComponent === 0) ? 3 : 1;

    let dipOutputFINAL, dipdirectionOutputFINAL;

    if (isNonStandardOrientation > 1) {
        if (isNonStandardOrientation === 2) {
            // Vertical plane
            dipOutputFINAL = 90;
            dipdirectionOutputFINAL = inputHoleAzimuth;
        } else {
            // Horizontal plane
            dipOutputFINAL = 0;
            dipdirectionOutputFINAL = 0;
        }
    } else {
        // Calculate dip direction
        const dipDirectionAngle = Math.atan(Math.abs(dipDirectionX / dipDirectionY));
        const quadrant1 = toDegrees(dipDirectionAngle);
        const quadrant2 = toDegrees(Math.PI - dipDirectionAngle);
        const quadrant3 = toDegrees(Math.PI + dipDirectionAngle);
        const quadrant4 = toDegrees(2 * Math.PI - dipDirectionAngle);

        if (dipDirectionX > 0) {
            dipdirectionOutputFINAL = dipDirectionY > 0 ? quadrant1 : quadrant2;
        } else {
            dipdirectionOutputFINAL = dipDirectionY > 0 ? quadrant4 : quadrant3;
        }

        // Calculate dip
        dipOutputFINAL = toDegrees(Math.atan(-dipComponent / Math.sqrt(dipDirectionX ** 2 + dipDirectionY ** 2)));
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

function resetSelections() {
    selectedType = '';
    selectedGeneration = '';
    selectedCustomTypes = {};
    resetUISelections();
}

function copyResults() {
    console.log("Copying results to clipboard...");
    const csvContent = getCSVContent();

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(csvContent).then(() => {
            document.getElementById('copyStatus').textContent = 'Results copied to clipboard!';
            console.log("Results copied to clipboard successfully.");
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
        console.log(msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        document.getElementById('copyStatus').textContent = 'Unable to copy results';
    }

    document.body.removeChild(textArea);
}

async function saveAsCSV() {
    console.log("Saving results as CSV...");
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
            console.log("File saved successfully.");
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
    console.log("File download initiated.");
}

function getCSVContent() {
    const settings = loadSettings();
    const customTypeNames = settings.customTypes.map(ct => ct.name);
    
    let csvContent = "HoleID,Depth,Type,Generation,Alpha,Beta,Dip,DipDirection,Strike,Comment";
    customTypeNames.forEach(name => {
        csvContent += `,${name}`;
    });
    csvContent += "\n";
    
    measurements.forEach(function(measurement) {
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
        
        customTypeNames.forEach(name => {
            row.push(measurement.customTypes[name] || '');
        });
        
        csvContent += row.map(value => `"${value}"`).join(",") + "\n";
    });

    return csvContent;
}

function clearMeasurementsWithConfirmation() {
    console.log("Clearing measurements with confirmation...");
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
        console.log("All measurements cleared.");
    } else {
        console.log("Measurement clearing cancelled.");
    }
}

export function setSelectedType(type) {
    selectedType = type;
    console.log("Selected type set to:", type);
}

export function setSelectedGeneration(gen) {
    selectedGeneration = gen;
    console.log("Selected generation set to:", gen);
}

export function setSelectedCustomType(typeName, option) {
    selectedCustomTypes[typeName] = option;
    console.log(`Selected custom type ${typeName} set to:`, option);
}

export { measurements, selectedType, selectedGeneration, selectedCustomTypes };
