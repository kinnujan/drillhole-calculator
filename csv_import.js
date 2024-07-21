import { handleError } from './utils.js';
import { loadSettings } from './storage.js';

export async function importCSV(csvData) {
    try {
        const settings = await loadSettings();
        const csvImportFields = settings.csvImportFields;
        const headers = csvData[0].map(h => h.toLowerCase().trim());
        const data = {};

        // Get column indices based on user-selected fields
        const holeIdIndex = headers.indexOf(csvImportFields.holeId.toLowerCase());
        const depthIndex = headers.indexOf(csvImportFields.depth.toLowerCase());
        const azimuthIndex = headers.indexOf(csvImportFields.azimuth.toLowerCase());
        const dipIndex = headers.indexOf(csvImportFields.dip.toLowerCase());

        if (holeIdIndex === -1 || depthIndex === -1 || azimuthIndex === -1 || dipIndex === -1) {
            throw new Error('One or more required columns not found in CSV');
        }

        for (let i = 1; i < csvData.length; i++) {
            const values = csvData[i];
            if (values.length >= Math.max(holeIdIndex, depthIndex, azimuthIndex, dipIndex) + 1) {
                const holeId = values[holeIdIndex].trim();
                if (!data[holeId]) {
                    data[holeId] = {
                        depth: parseFloat(values[depthIndex]),
                        azimuth: parseFloat(values[azimuthIndex]),
                        dip: parseFloat(values[dipIndex])
                    };
                }
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
