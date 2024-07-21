import { handleError } from './utils.js';

export async function importCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].split(',');
                const data = {};

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    if (values.length === headers.length) {
                        const holeId = values[0].trim();
                        data[holeId] = {
                            depth: parseFloat(values[1]),
                            azimuth: parseFloat(values[2]),
                            dip: parseFloat(values[3])
                        };
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
