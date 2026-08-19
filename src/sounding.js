import { weather } from './weather.js';
import { common, formatEnvDataForHour, getEnvAtZ } from './common.js';
import { calculateParcelPath } from './tools.js';
import { appConfig, lapseRateColor } from './config.js';
import { selectedHourIndex } from './table.js';

let soundingChartInstance = null;

function drawSounding(autoScroll = true) {
    const hourIndex = selectedHourIndex;
    const hourStr = `${(new Date(weather.weatherData.time[hourIndex])).getHours()}h`;
    const chartSection = document.getElementById('chart-section');
    chartSection.style.display = 'block';

    document.querySelectorAll('.hour-header').forEach(el => el.classList.remove('active'));
    const activeHeader = document.getElementById(`hour-header-${hourIndex}`);
    if (activeHeader) activeHeader.classList.add('active');

    document.querySelectorAll('#wind-grid td.active-col').forEach(el => el.classList.remove('active-col'));
    document.querySelectorAll(`#wind-grid td[data-hour="${hourIndex}"]`).forEach(el => el.classList.add('active-col'));

    // Calculate parcel path and cloud zone based on the selected hour
    const envData = formatEnvDataForHour(hourIndex);

    const zBase = weather.elevation;
    const tBase = weather.weatherData.temperature_2m[hourIndex];
    const tdBase = weather.weatherData.dewpoint_2m[hourIndex];
    const tParcelBase = (tBase !== undefined && tBase !== null) ? tBase + appConfig.parcelOffset : null;

    const parcel = calculateParcelPath(zBase, tParcelBase, tdBase, envData);
    const parcelPath = parcel.parcelPath;
    const cloudBaseAlt = parcel.cloudZone[0];
    const cloudEndAlt = parcel.cloudZone[1];

    const pBottom = getEnvAtZ(envData, zBase).hpa;

    const skew = appConfig.skewFactor;
    function applySkew(t, hpa) {
        if (t === null || hpa === null) return null;
        return skew === 0 ? t : t + (pBottom - hpa) * skew;
    }

    const envPoints = envData.map(d => ({ x: applySkew(d.t, d.hpa), y: d.z, t: d.t })).filter(d => d.x !== null);
    const dewPoints = envData.map(d => ({ x: applySkew(d.td, d.hpa), y: d.z })).filter(d => d.x !== null);
    const parcelChartPoints = parcelPath.map(p => ({ x: applySkew(p.t, p.hpa), y: p.z })).filter(d => d.x !== null);

    const canvas = document.getElementById('sondageChart');
    // Force la destruction de tout graphique Chart.js attaché à ce canvas
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    const ctx = canvas.getContext('2d');
    
    const datasets = [
        {
            label: 'Température (°C)',
            data: envPoints,
            borderColor: '#333',
            backgroundColor: '#333',
            borderWidth: 2,
            tension: 0,
            pointRadius: 0, 
            pointHitRadius: 10,
            segment: {
                borderColor: ctx => {
                    // On sécurise l'accès aux données interpolées par Chart.js
                    if (!ctx.p0 || !ctx.p1 || !ctx.p0.parsed || !ctx.p1.parsed) return '#333';
                    
                    const z0 = ctx.p0.parsed.y;
                    const z1 = ctx.p1.parsed.y;
                    
                    // On recalcule la température brute d'origine via notre fonction
                    const env0 = getEnvAtZ(envData, z0);
                    const env1 = getEnvAtZ(envData, z1);
                    
                    if (!env0 || !env1 || env0.t === undefined || env1.t === undefined) return '#333';

                    const dz = z1 - z0;
                    const dt = env0.t - env1.t;
                    if (dz <= 0) return '#333';

                    // Calcul du gradient thermique (°C / 100m)
                    const lapseRate = (dt / dz) * 100;
                    
                    if (lapseRate >= appConfig.lapse5) return lapseRateColor.lapse5; // Violet
                    if (lapseRate >= appConfig.lapse4) return lapseRateColor.lapse4; // Rouge
                    if (lapseRate >= appConfig.lapse3) return lapseRateColor.lapse3; // Orange
                    if (lapseRate >= appConfig.lapse2) return lapseRateColor.lapse2; // Jaune
                    if (lapseRate >= appConfig.lapse1) return lapseRateColor.lapse1; // Vert
                    return '#000000'; // Noir (< 0.6)
                }
            }
        }
    ];

    if (!common.isCompactView) {
        // On ajoute la Parcelle uniquement en mode complet
        datasets.push({
            label: 'Parcelle (Sèche/Humide)',
            data: parcelChartPoints,
            borderColor: '#f39c12',
            backgroundColor: '#f39c12',
            borderWidth: 1,
            tension: 0,
            pointRadius: 0,
            borderDash: [5, 2],
            pointHitRadius: 10
        });

        // On ajoute le Point de Rosée uniquement en mode complet
        datasets.push({
            label: 'Pt Rosée (°C)',
            data: dewPoints,
            borderColor: '#3498db',
            backgroundColor: '#3498db',
            borderWidth: 2,
            tension: 0,
            pointRadius: 0,
            pointHitRadius: 10
        });
    }

    soundingChartInstance = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    min: Math.floor(weather.elevation / 500) * 500,
                    ticks: {
                        stepSize: 500,
                        font: { size: 10 },
                        callback: function(value) { return value + "m"; }
                    }
                }
            },
            plugins: {
                legend: { labels: { boxWidth: 10, font: { size: 11 } }, display: true, position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const yVal = context.parsed.y;
                            let envAtZ = getEnvAtZ(envData, yVal);
                            let rawTemp = context.parsed.x; 
                            const skew = appConfig.skewFactor;
                            const hpa = envAtZ.hpa;
                            // Utilisation de pBottom pour inverser la déformation proprement
                            const unskewed = skew === 0 ? rawTemp : rawTemp - (pBottom - hpa) * skew;
                            return `${context.dataset.label}: ${unskewed.toFixed(1)}°C à ${Math.round(yVal)}m`;
                        }
                    }
                }
            }
        },
        plugins: [
            {
                id: 'cloudZonePlugin',
                beforeDraw: (chart) => {
                    const { ctx, chartArea, scales: { x, y } } = chart; // Ajout du 'x' ici
                    if (!chartArea) return;

                    // --- NOUVEAU : Dessiner la grille de température inclinée (Isothermes) ---
                    const skew = appConfig.skewFactor;
                    ctx.save();
                    ctx.strokeStyle = '#eee'; // Couleur identique à la grille par défaut
                    ctx.lineWidth = 1;
                    
                    const zBottom = y.min;
                    const envBottom = getEnvAtZ(envData, zBottom);
                    const pBottom = envBottom.hpa;

                    // On parcourt chaque "tick" (étiquette de l'axe X) pour tracer sa ligne
                    x.ticks.forEach(tick => {
                        const xTickValue = tick.value;
                        ctx.beginPath();
                        
                        // On trace la ligne de bas en haut (tous les 200m pour suivre la courbe de pression)
                        for (let z = zBottom; z <= y.max; z += 200) {
                            const envZ = getEnvAtZ(envData, z);
                            // Décalage X proportionnel à la baisse de pression
                            const xVal = xTickValue + (pBottom - envZ.hpa) * skew;
                            const px = x.getPixelForValue(xVal);
                            const py = y.getPixelForValue(z);
                            
                            if (z === zBottom) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        
                        // Point final pour joindre exactement le plafond du graphique
                        const envMax = getEnvAtZ(envData, y.max);
                        const xValMax = xTickValue + (pBottom - envMax.hpa) * skew;
                        ctx.lineTo(x.getPixelForValue(xValMax), y.getPixelForValue(y.max));
                        
                        ctx.stroke();
                    });
                    ctx.restore();
                    // --- FIN NOUVEAU ---

                    // Vérifie si le thermique décolle vraiment (au moins 50m au-dessus du sol)
                    let hasThermal = cloudBaseAlt > zBase + 50;
                    // Le plafond exploitable est le plus bas entre le sommet du thermique et la base du nuage
                    let plafondAlt = cloudBaseAlt;

                    // 1. Tracer la ligne du Plafond Thermique (uniquement s'il y a un thermique)
                    if (hasThermal) {
                        const yPlafond = y.getPixelForValue(plafondAlt);
                        ctx.save();
                        if (yPlafond >= chartArea.top && yPlafond <= chartArea.bottom) {
                            ctx.beginPath();
                            ctx.setLineDash([5, 5]);
                            ctx.moveTo(chartArea.left, yPlafond);
                            ctx.lineTo(chartArea.right, yPlafond);
                            ctx.strokeStyle = '#e74c3c'; // Ligne rouge comme dans le tableau
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                            
                            ctx.fillStyle = '#e74c3c';
                            ctx.font = 'bold 11px sans-serif';
                            ctx.fillText('Plafond', chartArea.left, yPlafond + 8);
                        }
                        ctx.restore();
                    }

                    // 2. Dessiner le nuage (zone grise) SI la particule dépasse le LCL
                    if (cloudEndAlt) {
                        const yBottom = y.getPixelForValue(cloudBaseAlt); 
                        const yTop = y.getPixelForValue(cloudEndAlt);    
                        
                        ctx.save();
                        ctx.fillStyle = 'rgba(170, 180, 190, 0.4)';
                        ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, yBottom - yTop);
                        
                        ctx.fillStyle = '#444';
                        ctx.font = 'bold 60px sans-serif';
                        ctx.fillText('☁️', (chartArea.left + 10), yTop + Math.max(15, (yBottom - yTop)/2));
                        ctx.restore();
                    }
                }, // <--- Attention à bien ajouter cette virgule
                
                // --- NOUVEAU : Affichage des valeurs de gradients sur la droite ---
                afterDraw: (chart) => {
                    const { ctx, chartArea, scales: { y } } = chart;
                    if (!chartArea) return;

                    ctx.save();
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.lineJoin = 'round';

                    // On parcourt les segments de bas en haut
                    for (let i = 0; i < envData.length - 1; i++) {
                        const d0 = envData[i];
                        const d1 = envData[i+1];
                        const dz = d1.z - d0.z;
                        const dt = d0.t - d1.t; 
                        
                        if (dz > 0) {
                            const lapseRate = (dt / dz) * 100;
                            
                            // Détermination de la couleur selon vos seuils
                            let color = '#000000';
                            if (lapseRate >= appConfig.lapse5) color = lapseRateColor.lapse5;
                            else if (lapseRate >= appConfig.lapse4) color = lapseRateColor.lapse4;
                            else if (lapseRate >= appConfig.lapse3) color = lapseRateColor.lapse3;
                            else if (lapseRate >= appConfig.lapse2) color = lapseRateColor.lapse2;
                            else if (lapseRate >= appConfig.lapse1) color = lapseRateColor.lapse1;

                            // Calcul de la position verticale (au milieu du segment)
                            const py0 = y.getPixelForValue(d0.z);
                            const py1 = y.getPixelForValue(d1.z);
                            const pyMid = (py0 + py1) / 2;
                            
                            const text = lapseRate.toFixed(2);
                            
                            // Contour blanc de protection pour la lisibilité
                            ctx.lineWidth = 3;
                            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                            ctx.strokeText(text, chartArea.right - 5, pyMid);
                            
                            // Texte coloré
                            ctx.fillStyle = color;
                            ctx.fillText(text, chartArea.right - 5, pyMid);
                        }
                    }
                    ctx.restore();
                }
            }
        ]
    });

    if (autoScroll) { 
        // On force le défilement uniquement à l'intérieur du panneau droit
        const rightPanel = document.getElementById('right-panel');
        rightPanel.scrollTo({ 
            top: rightPanel.scrollHeight, 
            behavior: 'smooth' 
        }); 
    }
}

export { drawSounding, soundingChartInstance };