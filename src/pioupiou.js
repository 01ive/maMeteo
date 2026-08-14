// Fonctions des Pioupious
// --------------------------------------------------------------------------------------------------------------------------------------------
function openPioupiouWidget(stationId) {
    const container = document.getElementById('pioupiou-widget-container');
    const widgetId = `PP${stationId}`; 
    container.style.display = 'block';
    container.innerHTML = `
        <div style="padding: 5px; text-align: right; background: #f8f8f8;">
            <button onclick="document.getElementById('pioupiou-widget-container').style.display='none'" style="cursor:pointer;">✕</button>
        </div>
        <div class="owm-widget" data-id="${widgetId}" data-show-live="yes" data-show-2h="yes" data-show-24h="no"></div>
    `;
    const script = document.createElement('script');
    script.src = "https://www.openwindmap.org/js/widget-v1.js";
    script.async = true;
    document.body.appendChild(script);
}

async function loadPioupiouStations() {
    const API_URL = 'https://api.pioupiou.fr/v1/live/all';
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result && result.data) {
            pioupiouLayer.clearLayers();
            
            result.data.forEach(station => {
                if (!station.location || !station.location.latitude || !station.location.longitude) return;

                const lat = station.location.latitude;
                const lon = station.location.longitude;
                
                const speedVal = station.measurements && station.measurements.wind_speed_avg !== null 
                    ? Math.round(station.measurements.wind_speed_avg) : null;
                const speed = speedVal !== null ? speedVal : '-';
                const heading = station.measurements && station.measurements.wind_heading !== null 
                    ? station.measurements.wind_heading : 0;
                const name = station.meta && station.meta.name 
                    ? station.meta.name : `Pioupiou #${station.id}`;
                const colorClass = speedVal !== null ? getWindColorClass(speedVal) : '';

                const iconHtml = `
                    <div style="position: absolute; transform: translate(-50%, -50%);">
                        <div class="${colorClass}" style="background: rgba(255,255,255,0.95); border: 1px solid #ccc; border-radius: 12px; padding: 3px 8px; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 6px; box-shadow: 0px 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">
                            <span style="display: inline-block; transform: rotate(${heading}deg); font-size: 15px;">↓</span>
                            <span>${speed}</span>
                        </div>
                    </div>
                `;

                const pioupiouIcon = L.divIcon({ className: 'pioupiou-marker', html: iconHtml, iconSize: [0, 0], popupAnchor: [0, -15] });

                const min = station.measurements && station.measurements.wind_speed_min !== null ? station.measurements.wind_speed_min : '-';
                const max = station.measurements && station.measurements.wind_speed_max !== null ? station.measurements.wind_speed_max : '-';
                const dirDegrees = station.measurements && station.measurements.wind_heading !== null ? station.measurements.wind_heading : 0;
                const cardinal = getCardinalDirection(dirDegrees);

                const marker = L.marker([lat, lon], { icon: pioupiouIcon }).addTo(pioupiouLayer);

                // Définition de la popup standard
                // Construction du contenu de la popup avec le nom cliquable
                const popupContent = `
                    <div style="text-align: center; font-family: sans-serif; line-height: 1.4;">
                        <strong style="font-size: 14px; color: #2980b9; cursor: pointer; text-decoration: underline;" onclick="openPioupiouWidget(${station.id})">${name}</strong><br>
                        <div style="font-size: 12px; margin-top: 5px;">
                            Vent : <span class="${colorClass}"><b>${speed} km/h</b></span> (${cardinal})<br>
                            <div style="display: flex; justify-content: space-between; gap: 10px; font-size: 11px; color: #555; margin-top: 5px;">
                                <span>Min: ${min}</span>
                                <span>Max: ${max}</span>
                            </div>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                
                marker.on('click', function(e) {
                    this.openPopup();
                });                        
            });
        }
    } catch (error) { console.error("Erreur lors du chargement des balises Pioupiou :", error); }
}