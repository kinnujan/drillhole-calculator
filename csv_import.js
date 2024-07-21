import { handleError } from './utils.js';

export async function importCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
                const data = {};

                // Detect column indices
                const holeIdIndex = headers.findIndex(h => h.toLowerCase().includes('hole') && h.toLowerCase().includes('id'));
                const depthIndex = headers.findIndex(h => h.toLowerCase() === 'depth');
                const azimuthIndex = headers.findIndex(h => h.toLowerCase().includes('azimuth'));
                const dipIndex = headers.findIndex(h => h.toLowerCase() === 'dip');

                if (holeIdIndex === -1 || depthIndex === -1 || azimuthIndex === -1 || dipIndex === -1) {
                    throw new Error('Required columns (Hole ID, Depth, Azimuth, Dip) not found in CSV');
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
