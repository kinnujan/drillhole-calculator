export function saveMeasurements(measurements) {
    console.log("Saving measurements to local storage...");
    try {
        localStorage.setItem('drillHoleMeasurements', JSON.stringify(measurements));
        console.log("Measurements saved successfully.");
    } catch (error) {
        console.error("Error saving measurements:", error);
    }
}

export function loadMeasurementsFromStorage() {
    console.log("Loading measurements from local storage...");
    try {
        const savedMeasurements = localStorage.getItem('drillHoleMeasurements');
        const parsedMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
        console.log("Measurements loaded successfully.");
        return parsedMeasurements;
    } catch (error) {
        console.error("Error loading measurements:", error);
        return [];
    }
}

export function saveDrillHoleInfo(info) {
    console.log("Saving drill hole info to local storage...");
    try {
        localStorage.setItem('drillHoleInfo', JSON.stringify(info));
        console.log("Drill hole info saved successfully.");
    } catch (error) {
        console.error("Error saving drill hole info:", error);
    }
}

export function loadDrillHoleInfo() {
    console.log("Loading drill hole info from local storage...");
    try {
        const savedDrillHoleInfo = localStorage.getItem('drillHoleInfo');
        const parsedDrillHoleInfo = savedDrillHoleInfo ? JSON.parse(savedDrillHoleInfo) : null;
        console.log("Drill hole info loaded successfully.");
        return parsedDrillHoleInfo;
    } catch (error) {
        console.error("Error loading drill hole info:", error);
        return null;
    }
}

export function saveSettings(settings) {
    console.log("Saving settings to local storage...");
    try {
        localStorage.setItem('appSettings', JSON.stringify(settings));
        console.log("Settings saved successfully.");
    } catch (error) {
        console.error("Error saving settings:", error);
    }
}

export function loadSettings() {
    console.log("Loading settings from local storage...");
    try {
        const savedSettings = localStorage.getItem('appSettings');
        const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {
            darkMode: false,
            measurementTypes: ['bedding', 'foliation', 'fault', 'shear'],
            generationTypes: ['S0', 'S0/1', 'S1', 'S2', 'S3'],
            customTypes: []
        };
        console.log("Settings loaded successfully.");
        return parsedSettings;
    } catch (error) {
        console.error("Error loading settings:", error);
        return {
            darkMode: false,
            measurementTypes: ['bedding', 'foliation', 'fault', 'shear'],
            generationTypes: ['S0', 'S0/1', 'S1', 'S2', 'S3'],
            customTypes: []
        };
    }
}

export function loadLastMeasurement() {
    console.log("Loading last measurement from local storage...");
    try {
        const savedMeasurements = localStorage.getItem('drillHoleMeasurements');
        const parsedMeasurements = savedMeasurements ? JSON.parse(savedMeasurements) : [];
        if (parsedMeasurements.length > 0) {
            const lastMeasurement = parsedMeasurements[parsedMeasurements.length - 1];
            console.log("Last measurement loaded successfully.");
            return lastMeasurement;
        }
        console.log("No last measurement found.");
        return null;
    } catch (error) {
        console.error("Error loading last measurement:", error);
        return null;
    }
}
