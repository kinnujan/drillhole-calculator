export function saveMeasurements(measurements) {
    localStorage.setItem('drillHoleMeasurements', JSON.stringify(measurements));
}

export function loadMeasurementsFromStorage() {
    const savedMeasurements = localStorage.getItem('drillHoleMeasurements');
    return savedMeasurements ? JSON.parse(savedMeasurements) : [];
}

export function saveDrillHoleInfo(info) {
    localStorage.setItem('drillHoleInfo', JSON.stringify(info));
}

export function loadDrillHoleInfo() {
    const savedDrillHoleInfo = localStorage.getItem('drillHoleInfo');
    return savedDrillHoleInfo ? JSON.parse(savedDrillHoleInfo) : null;
}

export function saveSettings(settings) {
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

export function loadSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
        darkMode: false,
        measurementTypes: ['bedding', 'foliation', 'fault', 'shear'],
        generationTypes: ['S0', 'S0/1', 'S1', 'S2', 'S3'],
        units: 'metric'
    };
}
