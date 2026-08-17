import { LEVELS } from './table.js'

// Variables globales pour stocker les données meteo
const weather = {
    elevation: 0,
    weatherData: null,
    dailyData: null, // Variable pour lever/coucher du soleil
    model: null
};

async function fetchWeatherData(model, currentDate, currentLat, currentLon) {

    function getApiDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const dateStr = getApiDateString(currentDate);
    // Ajout du paramètre &daily=sunrise,sunset
    const windSpeedVars = LEVELS.map(l => `windspeed_${l.hpa}hPa`).join(',');
    const windDirVars = LEVELS.map(l => `winddirection_${l.hpa}hPa`).join(',');
    const tempVars = LEVELS.map(l => `temperature_${l.hpa}hPa`).join(',');
    const dewVars = LEVELS.map(l => `dewpoint_${l.hpa}hPa`).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&hourly=${windSpeedVars},${windDirVars},${tempVars},${dewVars},temperature_2m,dewpoint_2m,precipitation,cloud_cover_low,cloud_cover_mid,cloud_cover_high&daily=sunrise,sunset&models=${model}&start_date=${dateStr}&end_date=${dateStr}&timezone=Europe%2FParis`;
  
    weather.model = model;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) throw new Error(data.reason);

        if (!data.hourly || !data.hourly.temperature_1000hPa || data.hourly.temperature_1000hPa.every(value => value === null)) {
            alert("Le modèle sélectionné ne retourne pas de données pour cette zone. Basculement sur GFS.");
            weather.model = 'gfs_seamless';
            await fetchWeatherData('gfs_seamless', currentDate, currentLat, currentLon);
            return;
        }

        weather.elevation = data.elevation || 0; 
        weather.weatherData = data.hourly;
        weather.dailyData = data.daily; // Sauvegarde des données journalières
    } catch (error) {
        console.error("Erreur API :", error);
        throw error;
    }
}

export {
    weather,
    fetchWeatherData
}