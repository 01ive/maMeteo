const compactModeRows = ["0m", "1000m", "2000m", "3000m", "4000m", "5500m"];
const compactModeHours = [9, 13, 17];

let isCompactView = false;
let selectedHourIndex = null;

// Fonctions de rendu du tableau et du graphique
// --------------------------------------------------------------------------------------------------------------------------------------------
function getLevelData(level, hourIndex, hourlyData) {
    if (!level.isSurface) {
        return {
            temp: hourlyData[`temperature_${level.hpa}hPa`][hourIndex],
            dew: hourlyData[`dewpoint_${level.hpa}hPa`][hourIndex],
            windSpeed: hourlyData[`windspeed_${level.hpa}hPa`][hourIndex],
            windDir: hourlyData[`winddirection_${level.hpa}hPa`][hourIndex],
            hpa: parseInt(level.hpa)
        };
    }
    
    let levelAbove = [...LEVELS].reverse().find(l => parseInt(l.alt) > globalElevation);
    let levelBelow = LEVELS.find(l => parseInt(l.alt) <= globalElevation);
    
    if (!levelAbove || !levelBelow) {
        let closest = levelAbove || levelBelow || LEVELS[LEVELS.length - 1];
        return {
            temp: hourlyData[`temperature_${closest.hpa}hPa`][hourIndex],
            dew: hourlyData[`dewpoint_${closest.hpa}hPa`][hourIndex],
            windSpeed: hourlyData[`windspeed_${closest.hpa}hPa`][hourIndex],
            windDir: hourlyData[`winddirection_${closest.hpa}hPa`][hourIndex],
            hpa: parseInt(closest.hpa)
        };
    }
    
    let zA = parseInt(levelAbove.alt);
    let zB = parseInt(levelBelow.alt);
    
    let tA = hourlyData[`temperature_${levelAbove.hpa}hPa`][hourIndex];
    let tB = hourlyData[`temperature_${levelBelow.hpa}hPa`][hourIndex];
    let dspA = hourlyData[`windspeed_${levelAbove.hpa}hPa`][hourIndex];
    let dspB = hourlyData[`windspeed_${levelBelow.hpa}hPa`][hourIndex];
    let dirA = hourlyData[`winddirection_${levelAbove.hpa}hPa`][hourIndex];
    let dirB = hourlyData[`winddirection_${levelBelow.hpa}hPa`][hourIndex];
    let dewA = hourlyData[`dewpoint_${levelAbove.hpa}hPa`][hourIndex];
    let dewB = hourlyData[`dewpoint_${levelBelow.hpa}hPa`][hourIndex];
    
    let pA = parseInt(levelAbove.hpa);
    let pB = parseInt(levelBelow.hpa);

    return {
        temp: interpolateValue(globalElevation, zA, tA, zB, tB),
        dew: interpolateValue(globalElevation, zA, dewA, zB, dewB),
        windSpeed: interpolateValue(globalElevation, zA, dspA, zB, dspB),
        windDir: interpolateDirection(globalElevation, zA, dirA, zB, dirB),
        hpa: interpolateValue(globalElevation, zA, pA, zB, pB)
    };
}

function updateActiveLevels() {
    activeLevels = [];

    LEVELS.forEach(l => {
        if (parseInt(l.alt) > globalElevation) {
            activeLevels.push({ ...l, z: parseInt(l.alt) });
        }
    });
    activeLevels.push({ 
        alt: Math.round(globalElevation) + "m (Sol)", 
        isSurface: true, 
        z: globalElevation 
    });
    activeLevels = isCompactView
        ? activeLevels.filter(level => compactModeRows.includes(level.alt) || level.isSurface)
        : activeLevels;
}

function getEnvAtZ(envData, z) {
    let l1 = [...envData].reverse().find(d => d.z <= z);
    let l2 = envData.find(d => d.z >= z);
    if (!l1) return l2 || envData[0];
    if (!l2) return l1;
    if (l1.z === l2.z) return l1;
    let ratio = (z - l1.z) / (l2.z - l1.z);
    return {
        z: z,
        hpa: l1.hpa + ratio * (l2.hpa - l1.hpa),
        t: l1.t + ratio * (l2.t - l1.t),
        td: l1.td + ratio * (l2.td - l1.td)
    };
}

function formatEnvDataForHour(hourIndex) {
    const reversedLevels = [...activeLevels].reverse();
    const levelDataArray = reversedLevels.map(l => getLevelData(l, hourIndex, globalWeatherData));
    
    let envData = reversedLevels.map((level, i) => ({
        z: level.z,
        hpa: levelDataArray[i].hpa,
        t: levelDataArray[i].temp,
        td: levelDataArray[i].dew
    }));

    return envData;
}