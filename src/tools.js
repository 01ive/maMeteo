// Fonctions de calculs météorologiques
// --------------------------------------------------------------------------------------------------------------------------------------------
function getRelativeHumidity(t, td) {
    if (t === null || td === null || t === undefined || td === undefined) return 0;
    const eT = 6.112 * Math.exp((17.67 * t) / (t + 243.5));
    const eTd = 6.112 * Math.exp((17.67 * td) / (td + 243.5));
    return (eTd / eT) * 100;
}

function interpolateValue(z, z1, val1, z2, val2) {
    if (val1 === null || val2 === null || val1 === undefined || val2 === undefined) return null;
    if (z1 === z2) return val1;
    return val1 + (val2 - val1) * ((z - z1) / (z2 - z1));
}

function interpolateDirection(z, z1, dir1, z2, dir2) {
    if (dir1 === null || dir2 === null || dir1 === undefined || dir2 === undefined) return null;
    let diff = ((dir2 - dir1 + 540) % 360) - 180;
    return (dir1 + diff * ((z - z1) / (z2 - z1)) + 360) % 360;
}

function getCardinalDirection(angle) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    return directions[Math.round(angle / 45)];
}