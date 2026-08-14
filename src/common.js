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