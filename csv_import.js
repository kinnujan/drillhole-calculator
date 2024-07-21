import { handleError } from './utils.js';
import { loadSettings } from './storage.js';

export async function importCSV(csvData) {
    console.log("Starting CSV import...");
    try {
        const settings = await loadSettings();
        const surveyImportFields = settings.surveyImportFields;
        const skipInvalidRows = settings.skipInvalidCSVRows;
        console.log("Survey import fields:", surveyImportFields);
        console.log("Skip invalid rows:", skipInvalidRows);

        if (!Array.isArray(csvData) || csvData.length === 0) {
            throw new Error('Invalid CSV data: empty or not an array');
        }

        const headers = csvData[0].map(h => h.trim().toLowerCase());
        console.log("CSV headers:", headers);

        const data = {};

        // Get column indices based on user-selected fields
        const holeIdIndex = headers.indexOf(surveyImportFields.holeId.toLowerCase());
        const depthIndex = headers.indexOf(surveyImportFields.depth.toLowerCase());
        const azimuthIndex = headers.indexOf(surveyImportFields.azimuth.toLowerCase());
        const dipIndex = headers.indexOf(surveyImportFields.dip.toLowerCase());

        console.log("Column indices:", { holeIdIndex, depthIndex, azimuthIndex, dipIndex });

        if (holeIdIndex === -1 || depthIndex === -1 || azimuthIndex === -1 || dipIndex === -1) {
            throw new Error('One or more required columns not found in CSV');
        }

        for (let i = 1; i < csvData.length; i++) {
            const values = csvData[i];
            if (values.length >= Math.max(holeIdIndex, depthIndex, azimuthIndex, dipIndex) + 1) {
                const holeId = values[holeIdIndex].trim();
                if (!data[holeId]) {
                    data[holeId] = [];
                }
                const depth = parseFloat(values[depthIndex]);
                const azimuth = parseFloat(values[azimuthIndex]);
                const dip = parseFloat(values[dipIndex]);
                
                if (isNaN(depth) || isNaN(azimuth) || isNaN(dip)) {
                    console.warn(`Invalid data in row ${i + 1}: depth=${values[depthIndex]}, azimuth=${values[azimuthIndex]}, dip=${values[dipIndex]}`);
                    if (!skipInvalidRows) {
                        throw new Error(`Invalid data in row ${i + 1}`);
                    }
                    continue;
                }
                
                data[holeId].push({ depth, azimuth, dip });
            } else {
                console.warn(`Skipping row ${i + 1} due to insufficient data`);
                if (!skipInvalidRows) {
                    throw new Error(`Insufficient data in row ${i + 1}`);
                }
            }
        }

        console.log("Processed data:", data);
        localStorage.setItem('importedDrillHoleData', JSON.stringify(data));
        setupHoleIdDropdown(data);
        return data;
    } catch (error) {
        console.error("Error in importCSV:", error);
        throw error;
    }
}

export function setupHoleIdDropdown(data) {
    const holeIdSelect = document.getElementById('holeIdSelect');
    if (!holeIdSelect) {
        console.error('Hole ID select element not found. Make sure the element with id "holeIdSelect" exists in your HTML.');
        return;
    }

    holeIdSelect.innerHTML = '<option value="">Select Hole ID</option>';
    
    if (data) {
        Object.keys(data).forEach(holeId => {
            holeIdSelect.appendChild(new Option(holeId, holeId));
        });
    }

    holeIdSelect.addEventListener('change', updateHoleInfo);
    console.log('Hole ID dropdown setup complete.');
}

function updateHoleInfo() {
    const holeId = document.getElementById('holeIdSelect').value;
    const holeData = getHoleData(holeId);
    
    if (holeData && holeData.length > 0) {
        const firstEntry = holeData[0];
        document.getElementById('holeId').value = holeId;
        document.getElementById('holeDip').value = firstEntry.dip;
        document.getElementById('holeDipSlider').value = firstEntry.dip;
        document.getElementById('holeAzimuth').value = firstEntry.azimuth;
        document.getElementById('holeAzimuthSlider').value = firstEntry.azimuth;
        updateDrillHoleInfoSummary();
        updatePreview();
    }
}

export function getImportedDrillHoleData() {
    const data = localStorage.getItem('importedDrillHoleData');
    return data ? JSON.parse(data) : null;
}

function findClosestSurveyPoint(holeData, targetDepth) {
    if (!holeData || holeData.length === 0) return null;
    
    return holeData.reduce((closest, current) => {
        if (!closest) return current;
        return Math.abs(current.depth - targetDepth) < Math.abs(closest.depth - targetDepth) ? current : closest;
    }, null);
}

export function getHoleData(holeId, depth) {
    const data = getImportedDrillHoleData();
    if (!data || !data[holeId]) return null;
    
    const holeData = data[holeId];
    if (!depth) return holeData[0]; // Return first entry if no depth is provided
    
    return findClosestSurveyPoint(holeData, depth);
}
