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

// Fonctions de rendu du tableau et du graphique
// --------------------------------------------------------------------------------------------------------------------------------------------

function centerTable() {
    const container = document.querySelector('.grid-container');
    const table = document.getElementById('wind-grid');
    if (container && table) {
        const scrollPos = (table.offsetWidth - container.clientWidth) / 2;
        container.scrollLeft = scrollPos;
    }
}        

function getWindColorClass(speed) {
    if (speed < appConfig.windLight) return 'wind-light';
    if (speed < appConfig.windMod) return 'wind-mod';
    if (speed < appConfig.windStrong) return 'wind-strong';
    if (speed < appConfig.windGale) return 'wind-gale';
    return 'wind-hurricane'; 
}

function renderGrid(hourlyData) {
    windGrid.innerHTML = '';
    const table = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    
    const emptyTh = document.createElement('th');
    emptyTh.innerText = "Heure";
    emptyTh.style.fontSize = "11px";
    emptyTh.style.zIndex = "3"; 
    headerRow.appendChild(emptyTh);

    const visibleHourIndices = isCompactView
        ? hourlyData.time.reduce((acc, t, i) => {
            const hour = new Date(t).getHours();
            if (compactModeHours.includes(hour)) acc.push(i);
            return acc;
        }, [])
        : Array.from({ length: 24 }, (_, i) => i);
    
    visibleHourIndices.forEach(i => {
        const th = document.createElement('th');
        const date = new Date(hourlyData.time[i]);
        const hourStr = `${date.getHours()}h`;
        
        th.innerText = hourStr;
        th.className = 'hour-header';
        th.id = `hour-header-${i}`; 
        
        // --- Vérification Nuit / Jour ---
        if (globalDailyData && globalDailyData.sunrise && globalDailyData.sunset) {
            const sunriseTime = new Date(globalDailyData.sunrise[0]).getTime();
            const sunsetTime = new Date(globalDailyData.sunset[0]).getTime();
            const hourTime = date.getTime();
            console.log(`Lever du soleil: ${globalDailyData.sunrise[0]}, Coucher du soleil: ${globalDailyData.sunset[0]}`);
            
            // Si l'heure est strictement avant le lever ou à partir du coucher du soleil
            if (hourTime < sunriseTime || hourTime >= sunsetTime) {
                th.classList.add('night-hour');
            }
        }
        
        th.onclick = () => drawSounding(i, true);
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    const thermalTops = [];      
    const exactThermalTops = []; 

    for (let i = 0; i < 24; i++) {
        let currentTopIdx = activeLevels.length - 1; 
        let exactAlt = Math.round(globalElevation);
        let isCloudCapped = false; 
        
        if (hourlyData.temperature_2m && hourlyData.temperature_2m[i] !== undefined) {
            let tBase = hourlyData.temperature_2m[i];
            let tdBase = hourlyData.dewpoint_2m[i]; 
            let zBase = globalElevation;
            let tParcelBase = tBase + appConfig.parcelOffset; 
            
            // Formule d'approximation du plafond nuageux : zBase + (tBase - tdBase) * 125
            let cloudBaseAlt = zBase + Math.max(0, (tParcelBase - tdBase) * 125);
            
            // 1. Préparer le profil de l'environnement pour cette heure spécifique
            const reversedLevels = [...activeLevels].reverse();
            const levelDataArray = reversedLevels.map(l => getLevelData(l, i, hourlyData));
            let envData = reversedLevels.map((level, idx) => ({
                z: level.z,
                hpa: levelDataArray[idx].hpa,
                t: levelDataArray[idx].temp
            }));

            function getEnvAtZForHour(z) {
                let l1 = [...envData].reverse().find(d => d.z <= z);
                let l2 = envData.find(d => d.z >= z);
                if (!l1) return l2 || envData[0];
                if (!l2) return l1;
                if (l1.z === l2.z) return l1;
                let ratio = (z - l1.z) / (l2.z - l1.z);
                return { 
                    hpa: l1.hpa + ratio * (l2.hpa - l1.hpa), 
                    t: l1.t + ratio * (l2.t - l1.t) 
                };
            }

            // 2. Simuler l'ascension de la particule exactement comme dans l'émagramme
            let pT = tParcelBase;
            let maxZ = envData[envData.length - 1].z;
            exactAlt = zBase;

            for (let currZ = zBase + 20; currZ <= maxZ; currZ += 20) {
                let isCloud = currZ >= cloudBaseAlt;
                let envAtZ = getEnvAtZForHour(currZ);
                let lapse;
                
                if (isCloud) {
                    const Tk = pT + 273.15;
                    const es = 6.112 * Math.exp((17.67 * pT) / (pT + 243.5));
                    const ws = 0.622 * es / (envAtZ.hpa - es);
                    const L = 2501000 - 2370 * pT;
                    const num = 1 + (L * ws) / (287.05 * Tk);
                    const den = 1 + (0.622 * L * L * ws) / (1004 * 287.05 * Tk * Tk);
                    lapse = -(9.80665 / 1004) * (num / den);
                } else {
                    lapse = -0.0098;
                }
                
                pT += lapse * 20;
                
                // Entraînement (dilution de 1% tous les 20m)
                const entrainment = 0.01; 
                pT = pT * (1 - entrainment) + envAtZ.t * entrainment;

                exactAlt = currZ;
                
                if (pT <= envAtZ.t) {
                    break; 
                }
            }

            // 3. Bloquer le plafond exploitable à la base du nuage s'il y rentre
            if (exactAlt > cloudBaseAlt) {
                exactAlt = Math.max(cloudBaseAlt, zBase); 
                isCloudCapped = true;
            }
            
            currentTopIdx = activeLevels.findIndex(l => l.z <= exactAlt);
            if(currentTopIdx === -1) currentTopIdx = activeLevels.length - 1;
        }
        
        thermalTops.push(currentTopIdx);
        exactThermalTops.push({ alt: Math.round(exactAlt), cloud: isCloudCapped });
    }

    const topRow = document.createElement('tr');
    const thTop = document.createElement('th');
    thTop.className = 'y-axis';
    thTop.innerText = 'Plafond (m)';
    thTop.style.color = '#e74c3c';
    topRow.appendChild(thTop);

    visibleHourIndices.forEach(i => {
        const td = document.createElement('td');
        td.dataset.hour = i;
        const ceilData = exactThermalTops[i];
        
        if (ceilData.alt > globalElevation + 50) {
            const cloudIcon = ceilData.cloud ? ' <span style="font-size:10px;" title="Bloqué par les nuages">☁️</span>' : '<div style="color: #00dbff">⬆</div>';
            td.innerHTML = `<div style="color: #e74c3c; font-weight: bold; font-size: 13px;">${ceilData.alt}${cloudIcon}</div>`;
        } else {
            td.innerHTML = `<div style="color: #999; font-size: 11px;"></div>`;
        }
        td.style.backgroundColor = '#fdf2f0'; 
        topRow.appendChild(td);
    });
    table.appendChild(topRow);

    const visibleLevels = activeLevels;

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

        const levelIndex = activeLevels.indexOf(level);

        visibleHourIndices.forEach(i => {
            const td = document.createElement('td');
            td.dataset.hour = i;
            const data = getLevelData(level, i, hourlyData);
            
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
    //     { key: 'cloud_cover_low', label: '☁️ Bas (%)', data: hourlyData.cloud_cover_low },
    //     { key: 'cloud_cover_mid', label: '☁️ Moy (%)', data: hourlyData.cloud_cover_mid },
    //     { key: 'cloud_cover_high', label: '☁️ Hauts (%)', data: hourlyData.cloud_cover_high }
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
        const precip = hourlyData.precipitation ? hourlyData.precipitation[i] : 0;
        if (precip > 0) td.innerHTML = `<div style="color: #3498db; font-weight: bold; font-size: 12px;">${precip}</div>`;
        else td.innerHTML = "";
        rainRow.appendChild(td);
    });
    table.appendChild(rainRow);

    windGrid.appendChild(table);

    const chosenHourIndex = visibleHourIndices.includes(selectedHourIndex)
        ? selectedHourIndex : visibleHourIndices[0];
    const chosenDate = new Date(hourlyData.time[chosenHourIndex]);

    setTimeout(centerTable, 0);
}