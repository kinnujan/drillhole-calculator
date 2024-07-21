import { handleError } from './utils.js';
import { loadSettings } from './storage.js';

export async function importCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
                const data = {};

                const settings = await loadSettings();
                const csvImportFields = settings.csvImportFields;

                // Get column indices based on user-selected fields
                const holeIdIndex = headers.indexOf(csvImportFields.holeId.toLowerCase());
                const depthIndex = headers.indexOf(csvImportFields.depth.toLowerCase());
                const azimuthIndex = headers.indexOf(csvImportFields.azimuth.toLowerCase());
                const dipIndex = headers.indexOf(csvImportFields.dip.toLowerCase());

                if (holeIdIndex === -1 || depthIndex === -1 || azimuthIndex === -1 || dipIndex === -1) {
                    throw new Error('One or more required columns not found in CSV');
                }

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
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
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

export function getImportedDrillHoleData() {
    const data = localStorage.getItem('importedDrillHoleData');
    return data ? JSON.parse(data) : null;
}

export function getHoleData(holeId) {
    const data = getImportedDrillHoleData();
    return data && data[holeId] ? data[holeId] : null;
}
