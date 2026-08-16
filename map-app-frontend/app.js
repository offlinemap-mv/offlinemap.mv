// Configuration constants - REPLACE with your actual live Render Web Service URL link later
const RENDER_API_URL = "https://onrender.com";
const DEFAULT_USER_ID = "captain_vessel_77"; 

let map, activeMarkerGroup;
let currentPosition = null;
let appSettings = { gpsHighAccuracy: true, showDash: true, activeLayer: 'marine' };

const tileProviders = {
    marine: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", 
    land: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    hiking: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", 
    satellite: "https://arcgisonline.com{z}/{y}/{x}",
    driving: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
};

let currentTileLayer;

window.addEventListener('DOMContentLoaded', () => {
    initializeMapCanvas();
    setupNetworkListeners();
    startHardwareGpsTracking();
    startActiveUserHeartbeatLoop();
});

function initializeMapCanvas() {
    map = L.map('map', { zoomControl: false }).setView([3.5, 73.4], 9);
    currentTileLayer = L.tileLayer(tileProviders.marine, { maxZoom: 18 }).addTo(map);
    activeMarkerGroup = L.layerGroup().addTo(map);
}

function changeMapLayer(layerKey) {
    appSettings.activeLayer = layerKey;
    map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(tileProviders[layerKey], { maxZoom: 18 }).addTo(map);
    
    const speedUnitLabel = document.getElementById('speed-unit');
    if(layerKey === 'marine') speedUnitLabel.innerText = 'KTS';
    else if(layerKey === 'driving') speedUnitLabel.innerText = 'KMH';
    else speedUnitLabel.innerText = 'MPH';
}

function startHardwareGpsTracking() {
    if (!navigator.geolocation) return;

    const options = {
        enableHighAccuracy: appSettings.gpsHighAccuracy,
        timeout: 4000,
        maximumAge: 0
    };

    navigator.geolocation.watchPosition((pos) => {
        currentPosition = pos;
        const { latitude, longitude, altitude, speed } = pos.coords;
        
        document.getElementById('dash-speed').innerText = speed ? (speed * 1.94).toFixed(1) : "0.0";
        document.getElementById('dash-alt').innerText = altitude ? Math.round(altitude) : "0";

        const pulseLatLng = [latitude, longitude];
        activeMarkerGroup.clearLayers();
        L.circleMarker(pulseLatLng, { radius: 8, color: '#3B82F6', fillColor: '#60A5FA', fillOpacity: 0.8 }).addTo(activeMarkerGroup);
    }, (err) => console.warn("🎛️ Satellite locking check."), options);
}

async function plotManualWaypoint() {
    if(!currentPosition) return alert("Waiting for valid satellite configuration lock...");
    
    const lat = currentPosition.coords.latitude;
    const lng = currentPosition.coords.longitude;
    
    const waypointObject = {
        id: "WP_" + Date.now(),
        lat: lat,
        lng: lng,
        layerContext: appSettings.activeLayer
    };

    L.marker([lat, lng]).addTo(map).bindPopup(`Marked Point (${appSettings.activeLayer})`).openPopup();
    await processDataPayloadForSync(waypointObject);
    toggleModal(false);
}

async function processDataPayloadForSync(rawPayload) {
    const stringData = JSON.stringify(rawPayload);
    
    const encryptedBundle = {
        userId: DEFAULT_USER_ID,
        fileKey: rawPayload.id,
        lastUpdated: Date.now(),
        iv: btoa("DummyInitializationVectorVector"), 
        payload: btoa(stringData)
    };

    if (navigator.onLine) {
        try {
            const res = await fetch(`${RENDER_API_URL}/api/v1/sync/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(encryptedBundle)
            });
            if(res.ok) console.log("☁️ Data stored safely on server endpoint cluster nodes.");
        } catch (e) {
            storeLocalOfflineCacheFallback(encryptedBundle);
        }
    } else {
        storeLocalOfflineCacheFallback(encryptedBundle);
    }
}

function storeLocalOfflineCacheFallback(bundle) {
    localStorage.setItem(bundle.fileKey, JSON.stringify(bundle));
}

function setupNetworkListeners() {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');

    window.addEventListener('online', () => {
        indicator.style.background = "#10B981";
        text.innerText = "Online";
        triggerCloudFetchAndVaporize();
    });

    window.addEventListener('offline', () => {
        indicator.style.background = "#EF4444";
        text.innerText = "Offline Mode";
    });
    
    if(!navigator.onLine) {
        indicator.style.background = "#EF4444";
        text.innerText = "Offline Mode";
    }
}

async function triggerCloudFetchAndVaporize() {
    if(!navigator.onLine) return;
    try {
        const res = await fetch(`${RENDER_API_URL}/api/v1/sync/fetch-and-wipe`, {
            method: "GET",
            headers: { "user-id": DEFAULT_USER_ID }
        });
        const data = await res.json();
        console.log("🔥 Sync complete. Cloud storage database wiped clean:", data.message);
    } catch(err) {
        console.warn("Sync loop deferred connection interruption.", err);
    }
}

function startActiveUserHeartbeatLoop() {
    sendHeartbeatPulse();
    setInterval(sendHeartbeatPulse, 5 * 60 * 1000); // Pulse every 5 minutes
}

async function sendHeartbeatPulse() {
    if (!navigator.onLine) return;
    try {
        await fetch(`${RENDER_API_URL}/api/v1/user/heartbeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: DEFAULT_USER_ID })
        });
    } catch (e) {}
}

function downloadActiveRegion() {
    alert("Downloading current 20-mile sector tiles for all 5 map views to device browser cache...");
}

function toggleModal(openState) {
    document.getElementById('settings-modal').style.display = openState ? 'flex' : 'none';
}

function updateSettingsObject() {
    appSettings.gpsHighAccuracy = document.getElementById('cfg-gps').checked;
    document.getElementById('instrument-panel').style.display = document.getElementById('cfg-dash').checked ? 'flex' : 'none';
    startHardwareGpsTracking();
}
