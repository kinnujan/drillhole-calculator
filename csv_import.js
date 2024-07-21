import { handleError } from './utils.js';
import { loadSettings } from './storage.js';

export async function importCSV(csvData) {
    console.log("Starting CSV import...");
    try {
        const settings = await loadSettings();
        const surveyImportFields = settings.surveyImportFields;
        console.log("Survey import fields:", surveyImportFields);

        if (!Array.isArray(csvData) || csvData.length === 0) {
            throw new Error('Invalid CSV data: empty or not an array');
        }

        const headers = csvData[0].map(h => h.toLowerCase().trim());
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
                    continue;
                }
                
                data[holeId].push({ depth, azimuth, dip });
            } else {
                console.warn(`Skipping row ${i + 1} due to insufficient data`);
            }
        }

        console.log("Processed data:", data);
        localStorage.setItem('importedDrillHoleData', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error("Error in importCSV:", error);
        throw error;
    }
}

export function getImportedDrillHoleData() {
    const data = localStorage.getItem('importedDrillHoleData');
    return data ? JSON.parse(data) : null;
}

export function getHoleData(holeId) {
    const data = getImportedDrillHoleData();
    return data && data[holeId] ? data[holeId] : null;
}
