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

function getCloudBaseAltitude(zBase, tBase, tBaseDew) {
    if (tBase === null || tBaseDew === null || tBase === undefined || tBaseDew === undefined) return null;
    return (zBase + Math.max(0, (tBase - tBaseDew) * 125));
}

function calculateParcelPath(zBase, tBase, tBaseDew, envData) {
    let cloudBaseAlt = getCloudBaseAltitude(zBase, tBase, tBaseDew);
    let cloudZone = null;
    let parcelPath = [];
    let ceilingZ = zBase; 
    
    if (tBase !== null) {
        let pT = tBase;
        let maxZ = envData[envData.length - 1].z;
        
        parcelPath.push({ z: zBase, t: pT, hpa: getEnvAtZ(envData, zBase).hpa });
        
        for (let currZ = zBase + 20; currZ <= maxZ; currZ += 20) {
            let isCloud = currZ >= cloudBaseAlt;
            let envAtZ = getEnvAtZ(envData, currZ);
            let lapse;
            
            if (isCloud) {
                // Calcul dynamique du gradient pseudo-adiabatique humide
                const Tk = pT + 273.15; // Température en Kelvin
                const es = 6.112 * Math.exp((17.67 * pT) / (pT + 243.5)); // Pression de vapeur saturante
                const ws = 0.622 * es / (envAtZ.hpa - es); // Rapport de mélange
                const L = 2501000 - 2370 * pT; // Chaleur latente de vaporisation
                
                const num = 1 + (L * ws) / (287.05 * Tk);
                const den = 1 + (0.622 * L * L * ws) / (1004 * 287.05 * Tk * Tk);
                
                lapse = -(9.80665 / 1004) * (num / den); // Résultat exact en °C/m
            } else {
                lapse = -0.0098; // Gradient adiabatique sec -0.0098°/m (-0.98°C/100m)
            }
            
            pT += lapse * 20;
            
            // --- AJOUT DE L'ENTRAÎNEMENT (DILUTION DU THERMIQUE) ---
            // On intègre 1% d'air ambiant à la particule tous les 20m.
            // Cela détruit progressivement l'excédent de température (flottabilité).
            const entrainment = 0.01; 
            pT = pT * (1 - entrainment) + envAtZ.t * entrainment;
            // --------------------------------------------------------

            parcelPath.push({ z: currZ, t: pT, hpa: envAtZ.hpa });
            ceilingZ = currZ; 
            
            // Si la température de la particule devient inférieure à l'environnement, la partcule arrete de s'élèver.
            if (pT <= envAtZ.t) {
                break; 
            }
        }

        if (ceilingZ > cloudBaseAlt + 20) {
            cloudZone = [cloudBaseAlt, ceilingZ];
        } else {
            cloudZone = [ceilingZ, null];
        }
    }

    return { cloudZone, parcelPath };
}