import {weather} from './weather.js'
import { appConfig } from './config.js'
import { formatEnvDataForHour, common, getLevelData, compactModeHours } from './common.js';
import { calculateParcelPath, getRelativeHumidity } from './tools.js';
import { drawSounding } from './sounding.js';

// Définition des niveaux de pression et d'altitude pour le tableau et le graphique
const LEVELS = [
    { alt: "11800m", hpa: "200" },
    { alt: "10500m", hpa: "250" },
    { alt: "9000m",  hpa: "300" },
    { alt: "7000m",  hpa: "400" },
    { alt: "5500m",  hpa: "500" },
    { alt: "4000m",  hpa: "600" },
    { alt: "3000m",  hpa: "700" },
    { alt: "2000m",  hpa: "800" },
    { alt: "1500m",  hpa: "850" },
    { alt: "1000m",  hpa: "900" },
    { alt: "500m",   hpa: "950" },
    { alt: "0m",     hpa: "1000" }
];

let currentDate = new Date();
let selectedHourIndex = currentDate.getHours();
let callBackOnClick = null;

function setSelectedHourIndex(index) {
    selectedHourIndex = index;
}

function setCallBackOnClick(callBack) {
    callBackOnClick = callBack;
}

// Fonctions de rendu du tableau et du graphique
// --------------------------------------------------------------------------------------------------------------------------------------------
function centerTable() {
    const container = document.querySelector('.grid-container');
    const table = document.getElementById('wind-grid');

    if (!container || !table) return;

    const target = table.querySelector(`#hour-header-${selectedHourIndex}`);

    if (!target) return;

    const tableLeft = table.offsetLeft;
    const targetLeft = target.offsetLeft;
    const targetWidth = target.offsetWidth;

    const desiredScroll = targetLeft - (container.clientWidth / 2) + (targetWidth / 2);

    container.scrollLeft = desiredScroll;
}     

function getWindColorClass(speed) {
    if (speed < appConfig.windLight) return 'wind-light';
    if (speed < appConfig.windMod) return 'wind-mod';
    if (speed < appConfig.windStrong) return 'wind-strong';
    if (speed < appConfig.windGale) return 'wind-gale';
    return 'wind-hurricane'; 
}

function renderGrid() {
    let windGrid = document.getElementById('wind-grid');
    windGrid.innerHTML = '';
    const table = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    
    const emptyTh = document.createElement('th');
    emptyTh.innerText = "Hour";
    emptyTh.style.fontSize = "11px";
    emptyTh.style.zIndex = "3"; 
    headerRow.appendChild(emptyTh);

    const visibleHourIndices = common.isCompactView
        ? weather.weatherData.time.reduce((acc, t, i) => {
            const hour = new Date(t).getHours();
            if (compactModeHours.includes(hour)) acc.push(i);
            return acc;
        }, [])
        : Array.from({ length: weather.weatherData.time.length }, (_, i) => i);
    
    visibleHourIndices.forEach(i => {
        const th = document.createElement('th');
        const date = new Date(weather.weatherData.time[i]);
        const hourStr = `${date.getHours()}h`;
        
        th.innerText = hourStr;
        th.className = 'hour-header';
        th.id = `hour-header-${i}`; 
        
        // --- Vérification Nuit / Jour ---
        if (weather.dailyData && weather.dailyData.sunrise && weather.dailyData.sunset) {
            const sunriseTime = new Date(weather.dailyData.sunrise[0]).getHours();
            const sunsetTime = new Date(weather.dailyData.sunset[0]).getHours();
            const hourTime = date.getHours();
            
            // Si l'heure est strictement avant le lever ou à partir du coucher du soleil
            if (hourTime < sunriseTime || hourTime >= sunsetTime) {
                th.classList.add('night-hour');
            }
        }
        
        th.onclick = () => { 
            selectedHourIndex = i;
            if(callBackOnClick) callBackOnClick();
            drawSounding(); 
        };

        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    const thermalTops = [];      
    const exactThermalTops = []; 
    
    for (let i = 0; i < weather.weatherData.time.length; i++) {        
        // Calculate parcel path and cloud zone based on the selected hour
        const envData = formatEnvDataForHour(i);
        
        const parcel = calculateParcelPath(weather.elevation, weather.weatherData.temperature_2m[i] + appConfig.parcelOffset, weather.weatherData.dewpoint_2m[i], envData);
        const parcelPath = parcel.parcelPath;
        const cloudBaseAlt = parcel.cloudZone[0];
        const ceilingZ = parcel.cloudZone[1];

        const isCloudCapped = ceilingZ !== null;

        let currentTopIdx = common.activeLevels.findIndex(l => l.z <= cloudBaseAlt);
        if(currentTopIdx === -1) currentTopIdx = common.activeLevels.length - 1;

        thermalTops.push(currentTopIdx);
        exactThermalTops.push({ alt: Math.round(cloudBaseAlt), cloud: isCloudCapped });
    }

    const topRow = document.createElement('tr');
    const thTop = document.createElement('th');
    thTop.className = 'y-axis';
    thTop.innerText = 'Thermal\nceiling (m)';
    thTop.style.color = '#e74c3c';
    topRow.appendChild(thTop);

    visibleHourIndices.forEach(i => {
        const td = document.createElement('td');
        td.dataset.hour = i;
        const ceilData = exactThermalTops[i];
        
        if (ceilData.alt > weather.elevation + 50) {
            const cloudIcon = ceilData.cloud ? ' <span style="font-size:10px;" title="Bloqué par les nuages">☁️</span>' : '<div style="color: #00dbff">⬆</div>';
            td.innerHTML = `<div style="color: #e74c3c; font-weight: bold; font-size: 13px;">${ceilData.alt}${cloudIcon}</div>`;
        } else {
            td.innerHTML = `<div style="color: #999; font-size: 11px;"></div>`;
        }
        topRow.appendChild(td);
    });
    table.appendChild(topRow);

    const visibleLevels = common.activeLevels;

    visibleLevels.forEach(level => {
        const row = document.createElement('tr');
        const thY = document.createElement('th');
        thY.className = 'y-axis';
        thY.innerText = level.alt;
        
        if (level.isSurface) {
            thY.style.color = '#2980b9';
            thY.style.fontWeight = 'bold';
            row.style.borderBottom = '2px solid #2980b9';
        }
        row.appendChild(thY);

        const levelIndex = common.activeLevels.indexOf(level);

        visibleHourIndices.forEach(i => {
            const td = document.createElement('td');
            td.dataset.hour = i;
            const data = getLevelData(level, i, weather.weatherData);
            
            if (data.windSpeed === null || data.windSpeed === undefined) {
                td.innerText = "-";
                row.appendChild(td);
                return;
            }

            const speed = Math.round(data.windSpeed);
            const direction = data.windDir;
            const temp = data.temp;
            const dew = data.dew;
            let isCloudy = false;

            // --- À remplacer dans renderGrid ---
            if (temp !== null && dew !== null) {
                const rh = getRelativeHumidity(temp, dew);
                
                // Modèle empirique de couverture nuageuse basé sur l'HR
                // Si HR < 80% -> 0% de nuage
                // Si HR approche 100% -> couverture maximale
                let cloudCoverPercent = 0;
                if (rh >= 80) {
                    cloudCoverPercent = (rh - 80) * 5; // Mise à l'échelle pour l'opacité visuelle
                    if (cloudCoverPercent > 100) cloudCoverPercent = 100;
                }

                if (cloudCoverPercent > 0) {
                    // On utilise le pourcentage calculé pour gérer l'opacité du gris
                    td.style.backgroundColor = `rgba(170, 180, 190, ${cloudCoverPercent / 100})`;
                    isCloudy = true;
                    if (cloudCoverPercent > 50) {
                        td.style.color = 'white'; // Texte en blanc si le nuage est très dense
                    }
                } else {
                    td.style.backgroundColor = 'transparent';
                }
            }

            if (levelIndex === thermalTops[i]) {
                td.style.boxShadow = 'inset 0 -4px 0 #e74c3c';
                if (isCloudy) td.style.color = 'white'; 
            }

            if (isNaN(speed)) {
                td.innerHTML = "-";
            } else {
                const colorClass = getWindColorClass(speed);
                td.innerHTML = `
                    <div class="cell-content ${colorClass}">
                        <span class="arrow" style="transform: rotate(${direction}deg);">↓</span>
                        <span>${speed}</span>
                    </div>
                `;
            }
            row.appendChild(td);
        });
        table.appendChild(row);
    });

    // --- NOUVELLES LIGNES : COUVERTURE NUAGEUSE ---
    // const cloudRows = [
    //     { key: 'cloud_cover_low', label: '☁️ Bas (%)', data: weather.weatherData.cloud_cover_low },
    //     { key: 'cloud_cover_mid', label: '☁️ Moy (%)', data: weather.weatherData.cloud_cover_mid },
    //     { key: 'cloud_cover_high', label: '☁️ Hauts (%)', data: weather.weatherData.cloud_cover_high }
    // ];

    // cloudRows.forEach(cloudLayer => {
    //     const tr = document.createElement('tr');
    //     const th = document.createElement('th');
    //     th.className = 'y-axis';
    //     th.innerText = cloudLayer.label;
    //     tr.appendChild(th);

    //     visibleHourIndices.forEach(i => {
    //         const td = document.createElement('td');
    //         const val = cloudLayer.data ? cloudLayer.data[i] : 0;
            
    //         if (val > 0) {
    //             td.innerText = val;
    //             td.style.fontSize = '11px';
    //             td.style.fontWeight = 'bold';
    //             td.style.backgroundColor = `rgba(170, 180, 190, ${val / 100})`;
    //             if (val > 50) td.style.color = 'white';
    //         } else {
    //             td.innerText = '';
    //         }
    //         tr.appendChild(td);
    //     });
    //     table.appendChild(tr);
    // });
    // --- FIN DES LIGNES NUAGEUSES ---

    const rainRow = document.createElement('tr');
    const thRain = document.createElement('th');
    thRain.className = 'y-axis';
    thRain.innerText = '💧 mm';
    rainRow.appendChild(thRain);

    visibleHourIndices.forEach(i => {
        const td = document.createElement('td');
        td.dataset.hour = i;
        const precip = weather.weatherData.precipitation ? weather.weatherData.precipitation[i] : 0;
        if (precip > 0) td.innerHTML = `<div style="color: #3498db; font-weight: bold; font-size: 12px;">${precip}</div>`;
        else td.innerHTML = "";
        rainRow.appendChild(td);
    });
    table.appendChild(rainRow);

    windGrid.appendChild(table);

    setTimeout(centerTable, 0);
}

export { LEVELS, selectedHourIndex, setSelectedHourIndex, setCallBackOnClick, renderGrid, getWindColorClass, centerTable };