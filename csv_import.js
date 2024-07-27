import errorService from './errorService.js';
import { loadSettings } from './storage.js';
import { updateHoleInfo as updateHoleInfoUI } from './ui.js';

export async function importCSV(csvData) {
    console.log("Starting CSV import...");
    try {
        const settings = await loadSettings();
        const surveyImportFields = settings.surveyImportFields;
        console.log("Survey import fields:", surveyImportFields);

        if (!Array.isArray(csvData) || csvData.length === 0) {
            throw new Error('Invalid CSV data: empty or not an array');
        }

        const headers = csvData[0].map(h => h.trim().toLowerCase());
        console.log("CSV headers:", headers);

        const data = {};

        // Automatically map fields with more robust matching
        const holeIdIndex = findHeaderIndex(headers, ['hole', 'id', 'holeid', 'hole_id', 'hole id']);
        const depthIndex = findHeaderIndex(headers, ['depth', 'dep']);
        const azimuthIndex = findHeaderIndex(headers, ['azimuth', 'azi', 'azimuth_utm', 'azimuth utm']);
        const dipIndex = findHeaderIndex(headers, ['dip', 'inclination', 'incl']);

        console.log("Automatically mapped column indices:", { holeIdIndex, depthIndex, azimuthIndex, dipIndex });

        if (holeIdIndex === -1 || depthIndex === -1 || azimuthIndex === -1 || dipIndex === -1) {
            throw new Error('One or more required columns not found in CSV');
        }

        for (let i = 1; i < csvData.length; i++) {
            const values = csvData[i];
            if (values.length >= Math.max(holeIdIndex, depthIndex, azimuthIndex, dipIndex) + 1) {
                const holeId = values[holeIdIndex].trim();
                if (!holeId) {
                    console.warn(`Skipping row ${i + 1} due to empty Hole ID`);
                    continue;
                }
                if (!data[holeId]) {
                    data[holeId] = [];
                }
                const depth = parseFloat(values[depthIndex]);
                const azimuth = parseFloat(values[azimuthIndex]);
                const dip = parseFloat(values[dipIndex]);
                
                if (isNaN(depth) || isNaN(azimuth) || isNaN(dip)) {
                    console.warn(`Invalid data in row ${i + 1}: depth=${values[depthIndex]}, azimuth=${values[azimuthIndex]}, dip=${values[dipIndex]}`);
                    continue;
                }
                
                data[holeId].push({ depth, azimuth, dip });
            } else {
                console.warn(`Skipping row ${i + 1} due to insufficient data`);
            }
        }

        if (Object.keys(data).length === 0) {
            throw new Error('No valid data found in CSV');
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

// This function is already defined earlier in the file, so we'll remove this duplicate declaration


export function getImportedDrillHoleData() {
    const data = localStorage.getItem('importedDrillHoleData');
    return data ? JSON.parse(data) : null;
}

function findClosestSurveyPoint(holeData, targetDepth) {
    if (!holeData || !Array.isArray(holeData) || holeData.length === 0) {
        console.warn('Invalid or empty holeData provided to findClosestSurveyPoint');
        return null;
    }
    
    if (typeof targetDepth !== 'number' || isNaN(targetDepth)) {
        console.warn('Invalid targetDepth provided to findClosestSurveyPoint');
        return null;
    }
    
    return holeData.reduce((closest, current) => {
        if (!closest) return current;
        if (typeof current.depth !== 'number' || isNaN(current.depth)) {
            console.warn('Invalid depth in survey point', current);
            return closest;
        }
        return Math.abs(current.depth - targetDepth) < Math.abs(closest.depth - targetDepth) ? current : closest;
    }, null);
}

export function getHoleData(holeId, depth) {
    if (typeof holeId !== 'string' || holeId.trim() === '') {
        console.error('Invalid holeId provided to getHoleData');
        return null;
    }

    const data = getImportedDrillHoleData();
    if (!data || typeof data !== 'object') {
        console.error('Invalid or missing imported drill hole data');
        return null;
    }

    if (!data[holeId]) {
        console.warn(`No data found for holeId: ${holeId}`);
        return null;
    }
    
    const holeData = data[holeId];
    if (!Array.isArray(holeData) || holeData.length === 0) {
        console.warn(`Invalid or empty data for holeId: ${holeId}`);
        return null;
    }

    if (depth === undefined || depth === null) {
        return holeData[0]; // Return first entry if no depth is provided
    }
    
    if (typeof depth !== 'number' || isNaN(depth)) {
        console.error('Invalid depth provided to getHoleData');
        return null;
    }
    
    return findClosestSurveyPoint(holeData, depth);
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
    const holeIdSelect = document.getElementById('holeIdSelect');
    const selectedHoleId = holeIdSelect.value;
    const holeData = getHoleData(selectedHoleId);
    
    if (holeData) {
        updateHoleInfoUI(holeData);
    } else {
        console.warn('No data found for selected Hole ID');
    }
}
function findHeaderIndex(headers, possibleMatches) {
    for (const match of possibleMatches) {
        const index = headers.findIndex(h => 
            h.includes(match) || 
            h.replace(/[_\s]/g, '').includes(match.replace(/[_\s]/g, ''))
        );
        if (index !== -1) return index;
    }
    return -1;
}
