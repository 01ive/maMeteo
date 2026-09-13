const elevationUrl = 'https://api.open-meteo.com/v1/elevation';

const resultDefaultHTML =  `<span>↔ <b>---</b></span>
                            <span>🏔️ <b>---</b></span>
                            <span>🪂 <b>---</b></span>`

function createMeasureTool(map) {
    const state = {
        active: false,
        points: [],
        pointLayer: L.layerGroup().addTo(map),
        lineLayer: L.layerGroup().addTo(map),
        elevationRequestId: 0
    };

    const control = L.control({ position: 'bottomleft' });
    control.onAdd = () => {
        const container = L.DomUtil.create('div', 'leaflet-control measure-control');
        const button = L.DomUtil.create('button', 'measure-toggle', container);
        button.type = 'button';
        button.title = 'Mesurer une distance';
        button.setAttribute('aria-label', 'Mesurer une distance');
        button.innerText = '📏';

        const panel = L.DomUtil.create('div', 'measure-panel', container);
        panel.innerHTML =  `<strong>📏 Mesures</strong>
                            <span class="measure-result">` + resultDefaultHTML + 
                            `</span>`;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(button, 'click', () => setActive(!state.active));
        state.button = button;
        state.panel = panel;
        state.result = panel.querySelector('.measure-result');
        return container;
    };
    control.addTo(map);

    function setActive(active) {
        state.active = active;
        state.panel.classList.toggle('visible', active);
        if(state.points.length > 0) {
            clear();
        }
        map.getContainer().classList.toggle('measure-mode', active);
        state.button.classList.toggle('active', active);
    }

    function clear() {
        state.points = [];
        state.pointLayer.clearLayers();
        state.lineLayer.clearLayers();
        state.result.innerHTML = resultDefaultHTML;
    }

    async function getElevations(points) {
        const requestId = ++state.elevationRequestId;
        const latitudes = points.map(point => point.lat).join(',');
        const longitudes = points.map(point => point.lng).join(',');
        const response = await fetch(`${elevationUrl}?latitude=${latitudes}&longitude=${longitudes}`);
        if (!response.ok) throw new Error(`Elevation request failed: ${response.status}`);
        const data = await response.json();
        if (requestId !== state.elevationRequestId) return null;
        return data.elevation || [];
    }

    async function addPoint(latlng, index = state.points.length) {
        const point = { lat: latlng.lat, lng: latlng.lng, elevation: null };
        state.points.splice(index, 0, point);
        render();
        try {
            const elevations = await getElevations(state.points);
            if (elevations) {
                state.points.forEach((item, elevationIndex) => {
                    item.elevation = elevations[elevationIndex] ?? null;
                });
                render();
            }
        } catch (error) {
            console.error('Erreur altitude mesure :', error);
            state.result.innerText = 'Altitude indisponible';
        }
    }

    function formatDistance(distance) {
        return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(2)} km`;
    }

    function formatElevation(elevation) {
        if (elevation === null) return '...';
        return `${elevation >= 0 ? '+' : ''}${Math.round(elevation)} m`;
    }

    function render() {
        state.pointLayer.clearLayers();
        state.lineLayer.clearLayers();
        let totalDistance = 0;
        let totalElevation = null;
        const latlngs = state.points.map(point => L.latLng(point.lat, point.lng));

        state.points.forEach((point, index) => {
            const marker = L.marker(latlngs[index], {
                draggable: true,
                icon: L.divIcon({
                    className: `measure-point ${index === 0 ? 'measure-start' : ''}`,
                    html: '<span></span>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(state.pointLayer);
            marker.bindTooltip(`${index + 1}. ${formatElevation(point.elevation)}`, { direction: 'top' });
            marker.on('click', event => L.DomEvent.stopPropagation(event));
            marker.on('dragend', event => {
                const position = event.target.getLatLng();
                point.lat = position.lat;
                point.lng = position.lng;
                point.elevation = null;
                render();
                refreshElevations();
            });
        });

        if (latlngs.length > 1) {
            L.polyline(latlngs, { color: '#000000', weight: 2, opacity: 0.85 }).addTo(state.lineLayer);
            for (let index = 0; index < latlngs.length - 1; index += 1) {
                const middle = L.latLng(
                    (latlngs[index].lat + latlngs[index + 1].lat) / 2,
                    (latlngs[index].lng + latlngs[index + 1].lng) / 2
                );
                const midpoint = L.marker(middle, {
                    icon: L.divIcon({ className: 'measure-midpoint', html: '+', iconSize: [22, 22], iconAnchor: [11, 11] })
                }).addTo(state.lineLayer);
                midpoint.bindTooltip('Ajouter un point');
                midpoint.on('click', event => {
                    L.DomEvent.stopPropagation(event);
                    addPoint(middle, index + 1);
                });
                totalDistance += latlngs[index].distanceTo(latlngs[index + 1]);
            }
            if (state.points.every(point => point.elevation !== null)) {
                totalElevation = state.points[state.points.length - 1].elevation - state.points[0].elevation;
            }
        }

        state.result.innerHTML = latlngs.length > 1
            ? `<span>↔ <b>${formatDistance(totalDistance)}</b></span><span>🏔️ <b>${formatElevation(totalElevation)}</b></span><span>🪂 <b>${Math.round(totalDistance/totalElevation)}</b></span>`
            : resultDefaultHTML;
        state.panel.classList.toggle('visible', state.active || state.points.length > 0);
    }

    async function refreshElevations() {
        try {
            const elevations = await getElevations(state.points);
            if (elevations) {
                state.points.forEach((point, index) => {
                    point.elevation = elevations[index] ?? null;
                });
                render();
            }
        } catch (error) {
            console.error('Erreur altitude mesure :', error);
            state.result.innerText = 'Altitude indisponible';
        }
    }

    map.on('click', event => {
        if (state.active) addPoint(event.latlng);
    });

    window.distanceMeasure = {
        isActive: () => state.active
    };
}

window.createMeasureTool = createMeasureTool;