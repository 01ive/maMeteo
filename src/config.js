import { weather } from './weather.js';
import { drawSounding } from './sounding.js';
import { renderGrid } from './table.js'
import { updateActiveLevels } from './common.js'

// Default configuration values
const lapseRateColor = {
    lapse1: '#2ecc71', // Vert
    lapse2: '#f1c40f', // Jaune
    lapse3: '#e67e22', // Orange
    lapse4: '#e74c3c', // Rouge
    lapse5: '#9b59b6'  // Violet
}

let appConfig = {
    altitudeMax: 7000,
    windLight: 15,
    windMod: 30,
    windStrong: 50,
    windGale: 100,
    lapse1: 0.6,
    lapse2: 0.8,
    lapse3: 1.0,
    lapse4: 1.2,
    lapse5: 1.4,
    skewFactor: 0.08,
    parcelOffset: 0.0
};

// Fonctions du menu de configuration
// --------------------------------------------------------------------------------------------------------------------------------------------
function openConfig() {
    document.getElementById('cfg-altitude-max').value = appConfig.altitudeMax;
    document.getElementById('cfg-wind-light').value = appConfig.windLight;
    document.getElementById('cfg-wind-mod').value = appConfig.windMod;
    document.getElementById('cfg-wind-strong').value = appConfig.windStrong;
    document.getElementById('cfg-wind-gale').value = appConfig.windGale;
    document.getElementById('cfg-lapse1').value = appConfig.lapse1;
    document.getElementById('cfg-lapse2').value = appConfig.lapse2;
    document.getElementById('cfg-lapse3').value = appConfig.lapse3;
    document.getElementById('cfg-lapse4').value = appConfig.lapse4;
    document.getElementById('cfg-lapse5').value = appConfig.lapse5;
    document.getElementById('cfg-skew').value = appConfig.skewFactor;
    document.getElementById('cfg-offset').value = appConfig.parcelOffset;
    document.getElementById('config-modal').style.display = 'block';
}

function closeConfig() { document.getElementById('config-modal').style.display = 'none'; }

function saveConfig() {
    appConfig.altitudeMax = parseFloat(document.getElementById('cfg-altitude-max').value);
    appConfig.windLight = parseFloat(document.getElementById('cfg-wind-light').value);
    appConfig.windMod = parseFloat(document.getElementById('cfg-wind-mod').value);
    appConfig.windStrong = parseFloat(document.getElementById('cfg-wind-strong').value);
    appConfig.windGale = parseFloat(document.getElementById('cfg-wind-gale').value);
    appConfig.lapse1 = parseFloat(document.getElementById('cfg-lapse1').value);
    appConfig.lapse2 = parseFloat(document.getElementById('cfg-lapse2').value);
    appConfig.lapse3 = parseFloat(document.getElementById('cfg-lapse3').value);
    appConfig.lapse4 = parseFloat(document.getElementById('cfg-lapse4').value);
    appConfig.lapse5 = parseFloat(document.getElementById('cfg-lapse5').value);
    appConfig.skewFactor = parseFloat(document.getElementById('cfg-skew').value);
    appConfig.parcelOffset = parseFloat(document.getElementById('cfg-offset').value);
    
    closeConfig();
    
    if (weather.weatherData) {
        updateActiveLevels();
        renderGrid();
        drawSounding(false);
    }
}

export {
    lapseRateColor,
    appConfig,
    openConfig,
    closeConfig,
    saveConfig
};