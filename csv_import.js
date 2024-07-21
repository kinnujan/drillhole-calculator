import { handleError } from './utils.js';
import { loadSettings } from './storage.js';

export async function importCSV(csvData) {
    try {
        const settings = await loadSettings();
        const surveyImportFields = settings.surveyImportFields;
        const headers = csvData[0].map(h => h.toLowerCase().trim());
        const data = {};

        // Get column indices based on user-selected fields
        const holeIdIndex = headers.indexOf(surveyImportFields.holeId.toLowerCase());
        const depthIndex = headers.indexOf(surveyImportFields.depth.toLowerCase());
        const azimuthIndex = headers.indexOf(surveyImportFields.azimuth.toLowerCase());
        const dipIndex = headers.indexOf(surveyImportFields.dip.toLowerCase());

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
                data[holeId].push({
                    depth: parseFloat(values[depthIndex]),
                    azimuth: parseFloat(values[azimuthIndex]),
                    dip: parseFloat(values[dipIndex])
                });
            }
        }

        localStorage.setItem('importedDrillHoleData', JSON.stringify(data));
        return data;
    } catch (error) {
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
