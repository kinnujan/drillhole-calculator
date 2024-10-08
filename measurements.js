import { saveMeasurements, loadMeasurementsFromStorage, saveDrillHoleInfo, loadSettings } from './storage.js';
import { updateResultsTable, updatePreview, resetUISelections, enableUndoButton, disableUndoButton } from './ui.js';
import { toRadians, toDegrees, calculateStrike, validateInputs } from './utils.js';
import errorService from './errorService.js';
import { ERROR_MESSAGES, CSV_MIME_TYPE } from './constants.js';
import { getHoleData } from './csv_import.js';

let measurements = [];
let selectedType = '';
let selectedGeneration = '';
let selectedCustomTypes = {};
let lastAddedMeasurement = null;

export async function loadMeasurements() {
    console.log("Loading measurements...");
    try {
        measurements = await loadMeasurementsFromStorage();
        await updateResultsTable();
        console.log("Measurements loaded.");
        updateUndoButtonState();
    } catch (error) {
        errorService.handleError(error, "Error loading measurements");
    }
}

export async function addMeasurement() {
    console.log("Adding new measurement...");
    const holeId = document.getElementById('holeId')?.value || '';
    const depth = parseFloat(document.getElementById('depth')?.value || '0');
    const holeData = getHoleData(holeId, depth);
    const holeDip = holeData ? parseFloat(holeData.dip) : parseFloat(document.getElementById('holeDip')?.value || '0');
    const holeAzimuth = holeData ? parseFloat(holeData.azimuth) : parseFloat(document.getElementById('holeAzimuth')?.value || '0');
    const alpha = parseFloat(document.getElementById('alpha')?.value || '0');
    const beta = parseFloat(document.getElementById('beta')?.value || '0');
    const comment = document.getElementById('comment')?.value || '';

    console.log("Measurement input values:", { holeId, depth, holeDip, holeAzimuth, alpha, beta, comment });
    if (holeData) {
        console.log("Using imported survey data:", holeData);
    } else {
        console.log("Using manually entered hole data");
    }

    const errorElement = document.getElementById('error');
    if (errorElement) errorElement.textContent = '';

    try {
        const result = {
            holeId,
            depth: depth.toFixed(2),
        };

        if (!isNaN(holeDip)) result.holeDip = holeDip.toFixed(1);
        if (!isNaN(holeAzimuth)) result.holeAzimuth = holeAzimuth.toFixed(1);

        console.log("Calculating dip direction...");
        const [dip, dipDirection] = calculateDipDirection(alpha, beta, holeDip, holeAzimuth);
        console.log("Dip direction calculated:", { dip, dipDirection });

        console.log("Loading settings...");
        const settings = await loadSettings();
        console.log("Settings loaded:", settings);

        console.log("Calculating strike...");
        const strike = calculateStrike(dipDirection, settings.strikeMode);
        console.log("Strike calculated:", strike);

        result.alpha = alpha.toFixed(1);
        result.beta = beta.toFixed(1);
        result.dip = dip.toFixed(1);
        result.dipDirection = dipDirection.toFixed(1);
        result.strike = strike.toFixed(1);

        if (selectedType) result.type = selectedType;
        if (selectedGeneration) result.generation = selectedGeneration;
        if (Object.keys(selectedCustomTypes).length > 0) result.customTypes = { ...selectedCustomTypes };
        if (comment) result.comment = comment;

        console.log("New measurement result:", result);

        measurements.push(result);
        lastAddedMeasurement = { ...result, index: measurements.length - 1 };
        console.log("Saving measurements...");
        await saveMeasurements(measurements);
        console.log("Measurements saved.");

        console.log("Saving drill hole info...");
        await saveDrillHoleInfo({ holeId, holeDip, holeAzimuth });
        console.log("Drill hole info saved.");

        console.log("Updating results table...");
        await updateResultsTable();
        console.log("Results table updated.");

        console.log("Resetting input fields and selections...");
        resetInputFields();
        resetSelections();
        console.log("Input fields and selections reset.");

        console.log("Updating preview...");
        updatePreview();
        console.log("Preview updated.");

        console.log("Enabling undo button...");
        enableUndoButton();
        console.log("Undo button enabled.");

        console.log("New measurement added:", result);

        console.log("Dispatching measurementAdded event...");
        document.dispatchEvent(new CustomEvent('measurementAdded'));
        console.log("measurementAdded event dispatched.");
    } catch (error) {
        console.error("Error in addMeasurement:", error);
        console.error("Error stack:", error.stack);
        console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Log input values
        console.log("Input values:", {
            holeId,
            depth,
            holeDip,
            holeAzimuth,
            alpha,
            beta,
            comment,
            selectedType,
            selectedGeneration,
            selectedCustomTypes
        });
        
        // Check if any required functions or modules are undefined
        console.log("Function checks:", {
            calculateDipDirection: typeof calculateDipDirection,
            loadSettings: typeof loadSettings,
            calculateStrike: typeof calculateStrike,
            saveMeasurements: typeof saveMeasurements,
            saveDrillHoleInfo: typeof saveDrillHoleInfo,
            updateResultsTable: typeof updateResultsTable,
            resetInputFields: typeof resetInputFields,
            resetSelections: typeof resetSelections,
            updatePreview: typeof updatePreview,
            enableUndoButton: typeof enableUndoButton
        });
        
        errorService.handleError(error, "An error occurred while adding the measurement. Check console for details.");
    }
}

export function calculateDipDirection(inputAlpha, inputBeta, inputHoleDip, inputHoleAzimuth) {
    console.log("Calculating dip direction with inputs:", { inputAlpha, inputBeta, inputHoleDip, inputHoleAzimuth });

    // Handle the case where both alpha and beta are 0
    if (inputAlpha === 0 && inputBeta === 0) {
        console.log("Alpha and Beta are both 0, returning hole dip and azimuth");
        return [-inputHoleDip, inputHoleAzimuth];
    }

    const alphaRad = toRadians(inputAlpha);
    const betaRad = toRadians(inputBeta);
    const holeDipRad = toRadians(-inputHoleDip);
    const holeAzimuthRad = toRadians(inputHoleAzimuth);

    console.log("Radians:", { alphaRad, betaRad, holeDipRad, holeAzimuthRad });

    const sinBeta = -Math.sin(betaRad);
    const cosBeta = -Math.cos(betaRad);
    const tanAlpha = -1 / Math.tan(alphaRad);

    console.log("Trigonometric values:", { sinBeta, cosBeta, tanAlpha });

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

    console.log("Normal vector:", { normalX, normalY, normalZ });

    const rotatedX = normalX;
    const rotatedY = normalY * Math.cos(Math.PI / 2 - holeDipRad) - normalZ * Math.sin(Math.PI / 2 - holeDipRad);
    const rotatedZ = normalY * Math.sin(Math.PI / 2 - holeDipRad) + normalZ * Math.cos(Math.PI / 2 - holeDipRad);

    console.log("Rotated vector:", { rotatedX, rotatedY, rotatedZ });

    const finalX = rotatedX * Math.cos(-holeAzimuthRad) - rotatedY * Math.sin(-holeAzimuthRad);
    const finalY = rotatedX * Math.sin(-holeAzimuthRad) + rotatedY * Math.cos(-holeAzimuthRad);
    const finalZ = rotatedZ;

    console.log("Final vector:", { finalX, finalY, finalZ });

    const dipDirectionX = finalZ * finalX;
    const dipDirectionY = finalZ * finalY;
    const dipComponent = -(finalX ** 2 + finalY ** 2);

    console.log("Dip direction components:", { dipDirectionX, dipDirectionY, dipComponent });

    const isNonStandardOrientation = (dipDirectionX === 0 && dipDirectionY === 0 && dipComponent === 0) ? 3 : 1;

    let dipOutputFINAL, dipdirectionOutputFINAL;

    if (isNonStandardOrientation > 1) {
        if (isNonStandardOrientation === 2) {
            dipOutputFINAL = 90;
            dipdirectionOutputFINAL = inputHoleAzimuth;
        } else {
            dipOutputFINAL = 0;
            dipdirectionOutputFINAL = 0;
        }
    } else {
        const dipDirectionAngle = Math.atan(Math.abs(dipDirectionX / dipDirectionY));
        const quadrant1 = toDegrees(dipDirectionAngle);
        const quadrant2 = toDegrees(Math.PI - dipDirectionAngle);
        const quadrant3 = toDegrees(Math.PI + dipDirectionAngle);
        const quadrant4 = toDegrees(2 * Math.PI - dipDirectionAngle);

        console.log("Quadrants:", { quadrant1, quadrant2, quadrant3, quadrant4 });

        if (dipDirectionX > 0) {
            dipdirectionOutputFINAL = dipDirectionY > 0 ? quadrant1 : quadrant2;
        } else {
            dipdirectionOutputFINAL = dipDirectionY > 0 ? quadrant4 : quadrant3;
        }

        dipOutputFINAL = toDegrees(Math.atan(-dipComponent / Math.sqrt(dipDirectionX ** 2 + dipDirectionY ** 2)));
    }

    console.log("Final output:", { dipOutputFINAL, dipdirectionOutputFINAL });

    return [dipOutputFINAL, dipdirectionOutputFINAL];
}
export async function undoLastMeasurement() {
    console.log("Undoing last measurement...");
    if (lastAddedMeasurement) {
        measurements.pop();
        await saveMeasurements(measurements);
        await updateResultsTable();

        // Restore the state of the last measurement
        document.getElementById('holeId').value = lastAddedMeasurement.holeId;
        document.getElementById('holeDip').value = lastAddedMeasurement.holeDip;
        document.getElementById('holeDipSlider').value = lastAddedMeasurement.holeDip;
        document.getElementById('holeAzimuth').value = lastAddedMeasurement.holeAzimuth;
        document.getElementById('holeAzimuthSlider').value = lastAddedMeasurement.holeAzimuth;
        document.getElementById('depth').value = lastAddedMeasurement.depth;
        document.getElementById('alpha').value = lastAddedMeasurement.alpha;
        document.getElementById('alphaSlider').value = lastAddedMeasurement.alpha;
        document.getElementById('beta').value = lastAddedMeasurement.beta;
        document.getElementById('betaSlider').value = lastAddedMeasurement.beta;
        document.getElementById('comment').value = lastAddedMeasurement.comment;

        selectedType = lastAddedMeasurement.type;
        selectedGeneration = lastAddedMeasurement.generation;
        selectedCustomTypes = { ...lastAddedMeasurement.customTypes };

        updatePreview();
        restoreUISelections();
        lastAddedMeasurement = null;
        updateUndoButtonState();
        console.log("Last measurement undone");
    } else {
        console.log("No measurement to undo");
    }
}

function restoreUISelections() {
    resetUISelections(); // First, reset all selections

    // Restore type selection
    const typeButton = document.querySelector(`.type-button[data-type="${selectedType}"]`);
    if (typeButton) typeButton.classList.add('active');

    // Restore generation selection
    const generationButton = document.querySelector(`.generation-button[data-generation="${selectedGeneration}"]`);
    if (generationButton) generationButton.classList.add('active');

    // Restore custom type selections
    Object.entries(selectedCustomTypes).forEach(([typeName, option]) => {
        const customTypeButton = document.querySelector(`.custom-option-button[data-custom-option="${option}"]`);
        if (customTypeButton) customTypeButton.classList.add('active');
    });
}

function updateUndoButtonState() {
    if (measurements.length > 0) {
        enableUndoButton();
    } else {
        disableUndoButton();
    }
}

function resetInputFields() {
    const elements = ['alpha', 'beta', 'alphaSlider', 'betaSlider', 'comment'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'comment') {
                element.value = '';
            } else {
                element.value = '0';
            }
        } else {
            console.warn(`Element with id '${id}' not found.`);
        }
    });
}

function resetSelections() {
    selectedType = '';
    selectedGeneration = '';
    selectedCustomTypes = {};
    resetUISelections();
}

export async function copyResults() {
    console.log("Copying results to clipboard...");
    const csvContent = await getCSVContent();

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(csvContent);
            const copyStatus = document.getElementById('copyStatus');
            if (copyStatus) {
                copyStatus.textContent = 'Results copied to clipboard!';
            }
            console.log("Results copied to clipboard successfully.");
        } else {
            await fallbackCopyTextToClipboard(csvContent);
        }
    } catch (err) {
        errorService.handleError(err, 'Failed to copy results to clipboard.');
    }
}

async function fallbackCopyTextToClipboard(text) {
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
        const copyStatus = document.getElementById('copyStatus');
        if (copyStatus) {
            copyStatus.textContent = msg;
        }
        console.log(msg);
    } catch (err) {
        errorService.handleError(err, 'Unable to copy results');
    } finally {
        document.body.removeChild(textArea);
    }
}

export async function saveAsCSV() {
    console.log("Saving results as CSV...");
    const csvContent = await getCSVContent();
    const filename = `drill_hole_measurements_${new Date().toISOString().slice(0,10)}.csv`;

    try {
        const blob = new Blob([csvContent], { type: CSV_MIME_TYPE });
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        const copyStatus = document.getElementById('copyStatus');
        if (copyStatus) {
            copyStatus.textContent = 'File download initiated.';
        }
        console.log("File download initiated.");
    } catch (err) {
        console.error("Error in primary save method, attempting fallback...");
        fallbackSaveAsCSV(csvContent, filename);
    }
}

function fallbackSaveAsCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: CSV_MIME_TYPE });
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
    const copyStatus = document.getElementById('copyStatus');
    if (copyStatus) {
        copyStatus.textContent = 'File download initiated.';
    }
    console.log("File download initiated.");
}

async function getCSVContent() {
    const settings = await loadSettings();
    const customTypeNames = settings.customTypes.map(ct => ct.name);
    
    let csvRows = [];
    if (settings.includeHeaderInExport) {
        const headers = ["HoleID", "HoleDip", "HoleAzimuth", "Depth", "Type", "Generation", "Alpha", "Beta", "Dip", "DipDirection", "Strike", "Comment", ...customTypeNames];
        csvRows.push(headers);
    }
    
    measurements.forEach(function(measurement) {
        let row = [
            measurement.holeId,
            measurement.holeDip,
            measurement.holeAzimuth,
            measurement.depth,
            measurement.type || '',
            measurement.generation || '',
            measurement.alpha,
            measurement.beta,
            measurement.dip,
            measurement.dipDirection,
            measurement.strike,
            measurement.comment || ''
        ];
        
        customTypeNames.forEach(name => {
            row.push(measurement.customTypes && measurement.customTypes[name] || '');
        });
        
        csvRows.push(row);
    });

    return csvRows.map(row => 
        row.map(value => 
            `"${(value + '').replace(/"/g, '""')}"`
        ).join(',')
    ).join('\n');
}

export async function clearMeasurementsWithConfirmation() {
    console.log("Clearing measurements with confirmation...");
    if (confirm("Are you sure you want to clear all measurements? This action cannot be undone.")) {
        try {
            measurements = [];
            lastAddedMeasurement = null;
            await saveMeasurements(measurements);
            await updateResultsTable();
            const copyStatus = document.getElementById('copyStatus');
            if (copyStatus) {
                copyStatus.textContent = 'All measurements cleared.';
            }
            await resetDrillHoleInfo();
            updateUndoButtonState();
            console.log("All measurements cleared.");
        } catch (error) {
            errorService.handleError(error, "An error occurred while clearing measurements.");
        }
    } else {
        console.log("Measurement clearing cancelled.");
    }
}

async function resetDrillHoleInfo() {
    const elements = {
        holeId: document.getElementById('holeId'),
        holeDip: document.getElementById('holeDip'),
        holeAzimuth: document.getElementById('holeAzimuth'),
        holeDipSlider: document.getElementById('holeDipSlider'),
        holeAzimuthSlider: document.getElementById('holeAzimuthSlider')
    };

    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            element.value = key === 'holeId' ? '' : '0';
        } else {
            console.warn(`Element with id '${key}' not found.`);
        }
    });

    await saveDrillHoleInfo({ holeId: '', holeDip: 0, holeAzimuth: 0 });
}

export function setSelectedType(type) {
    selectedType = type === null ? '' : type;
    console.log("Selected type set to:", selectedType);
}

export function setSelectedGeneration(gen) {
    selectedGeneration = gen === null ? '' : gen;
    console.log("Selected generation set to:", selectedGeneration);
}

export function setSelectedCustomType(typeName, option) {
    if (option === null) {
        delete selectedCustomTypes[typeName];
    } else {
        selectedCustomTypes[typeName] = option;
        console.log(`Selected custom type ${typeName} set to:`, selectedCustomTypes[typeName]);
    }
}

export async function exportData() {
    try {
        const csvContent = await getCSVContent();
        await copyResults();
        await saveAsCSV();
    } catch (error) {
        errorService.handleError(error, "An error occurred while exporting data.");
    }
}

export { measurements, selectedType, selectedGeneration, selectedCustomTypes };
