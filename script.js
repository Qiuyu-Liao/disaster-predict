const REGION_BBOX = {
    "usa": [24.5, -125.0, 49.5, -66.5],
    "japan": [24.0, 122.0, 46.0, 146.0],
    "philippines": [4.0, 116.0, 22.0, 127.0],
    "world": [-90, -180, 90, 180]
};

const $ = (s) => document.querySelector(s);
function setStatus(t) { $('#status').textContent = t || ''; }

let map, dataLayer;

function initMap() {
    map = L.map('map').setView([37.5, -96], 4); // Centered on the USA
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    dataLayer = L.layerGroup().addTo(map);
}

function usgsUrl({ startISO, minLat, minLng, maxLat, maxLng, minMag }) {
    const u = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    u.searchParams.set('format', 'geojson');
    u.searchParams.set('starttime', startISO);
    u.searchParams.set('minlatitude', minLat);
    u.searchParams.set('minlongitude', minLng);
    u.searchParams.set('maxlatitude', maxLat);
    u.searchParams.set('maxlongitude', maxLng);
    if (minMag != null) u.searchParams.set('minmagnitude', String(minMag));
    return u.toString();
}

async function fetchEarthquakes(bbox, days, minMag) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    const start = new Date(Date.now() - Number(days) * 24 * 3600 * 1000);
    const startISO = start.toISOString();
    const url = usgsUrl({ startISO, minLat, minLng, maxLat, maxLng, minMag });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const json = await res.json();
    return (json.features || []).map(f => ({
        id: f.id,
        mag: f.properties?.mag ?? 0,
        title: f.properties?.place ?? 'Unknown',
        time: f.properties?.time ?? 0,
        url: f.properties?.url ?? '#',
        lat: f.geometry?.coordinates?.[1],
        lng: f.geometry?.coordinates?.[0]
    })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

function renderEarthquakes(rows) {
    rows.forEach(r => {
        L.circleMarker([r.lat, r.lng], {
            radius: Math.max(3, r.mag * 2.0),
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.7
        }).bindPopup(`<b>M ${r.mag.toFixed(1)}</b><br>${r.title}<br>${new Date(r.time).toLocaleString()}`)
          .addTo(dataLayer);
    });
    const list = $('#dataList');
    list.innerHTML = '';
    rows.slice(0, 200).forEach(e => {
        const li = document.createElement('li');
        li.innerHTML = `<b>M ${e.mag.toFixed(1)}</b> — ${e.title}<br><small>${new Date(e.time).toLocaleString()}</small>`;
        li.addEventListener('click', () => map.flyTo([e.lat, e.lng], 6));
        list.appendChild(li);
    });
}

function eonetUrl({ bbox, days }) {
    const u = new URL('https://eonet.gsfc.nasa.gov/api/v3/events');
    u.searchParams.set('category', 'severeStorms');
    u.searchParams.set('days', days);
    u.searchParams.set('status', 'open');
    u.searchParams.set('bbox', `${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`);
    return u.toString();
}

async function fetchHurricanes(bbox, days) {
    const url = eonetUrl({ bbox, days });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`EONET HTTP ${res.status}`);
    const json = await res.json();
    return (json.events || []).map(e => ({
        id: e.id,
        mag: 0, 
        title: e.title ?? 'Unknown Storm',
        time: e.geometry?.[0]?.date ? new Date(e.geometry[0].date).getTime() : 0,
        url: e.sources?.[0]?.url ?? '#',
        lat: e.geometry?.[0]?.coordinates?.[1],
        lng: e.geometry?.[0]?.coordinates?.[0]
    })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

function renderHurricanes(rows) {
    rows.forEach(r => {
        L.circleMarker([r.lat, r.lng], {
            radius: 8,
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.7
        }).bindPopup(`<b>${r.title}</b><br>${new Date(r.time).toLocaleString()}`)
          .addTo(dataLayer);
    });
    const list = $('#dataList');
    list.innerHTML = '';
    rows.slice(0, 200).forEach(e => {
        const li = document.createElement('li');
        li.innerHTML = `<b>${e.title}</b><br><small>${new Date(e.time).toLocaleString()}</small>`;
        li.addEventListener('click', () => map.flyTo([e.lat, e.lng], 6));
        list.appendChild(li);
    });
}

function updateUI(disasterType) {
    const isEarthquake = disasterType === 'earthquake';
    $('#mainTitle').textContent = isEarthquake ? '🌎 Earthquake Management' : '🌀 Hurricane Management';
    $('#minMagContainer').style.display = isEarthquake ? 'inline-block' : 'none';
}

async function runSearch() {
    const disasterType = document.querySelector('input[name="disasterType"]:checked').value;
    const q = $('#q').value.trim().toLowerCase();
    const bbox = REGION_BBOX[q];
    if (!bbox) { alert('Unknown region. Try: USA, Japan, Philippines, or World'); return; }

    const days = $('#days').value;
    $('#regionTitle').textContent = $('#q').value.trim().toUpperCase();
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]]);
    dataLayer.clearLayers();
    $('#dataList').innerHTML = '';

    try {
        setStatus('Loading…');
        let dataRows = [];
        if (disasterType === 'earthquake') {
            const minMag = Number($('#minMag').value) || 0;
            dataRows = await fetchEarthquakes(bbox, days, minMag);
            renderEarthquakes(dataRows);
        } else if (disasterType === 'hurricane') {
            dataRows = await fetchHurricanes(bbox, days);
            renderHurricanes(dataRows);
        }
        setStatus(`Events found: ${dataRows.length}`);
    } catch (e) {
        console.error(e);
        setStatus('Error: ' + e.message);
    }
}

window.addEventListener('load', () => {
    initMap();
    const form = $('#searchForm');
    form.addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });
    
    document.querySelectorAll('input[name="disasterType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateUI(e.target.value);
            runSearch();
        });
    });

    $('#q').value = 'USA';
    updateUI('earthquake');
    form.requestSubmit();
});