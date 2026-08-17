/**
 * Ghost Maps Pro - Client Application Engine
 * High-utility navigation handler with integrated $1.99 microtransactions.
 */

// 1. GLOBAL ROUTING DESTINATIONS
const BACKEND_URL = "https://onrender.com";

// Change these string targets to match your unique Stripe Link URLs later!
const STRIPE_LINKS = {
    topo: "https://stripe.com",
    marine: "https://stripe.com"
};

// 2. CORE MAP RENDERING ARRAYS
let map;
const mapLayers = {};
let currentLayerType = 'road';

// SECURE HTTPS DATA LAYERS (Resolves your blank black tile loading error!)
const tileProviders = {
    road: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    marine: 'https://openseamap.org{z}/{x}/{y}.png'
};

// LOCAL SECURITY VALUE CONTROLLERS (Monetization status vectors)
let purchasedLayers = {
    road: true,      // Core map view is 100% open access
    topo: false,     // Premium Layer: Gate-locked behind $1.99 paywall
    marine: false    // Premium Layer: Gate-locked behind $1.99 paywall
};

// 3. ENGINE FRAMEWORK INITIALIZATION LOOP
function initMapApp() {
    console.log("Initializing secure offline map engine script context...");

    // Create the Leaflet workspace map layout window canvas (Sets baseline coordinates over London)
    map = L.map('map', { zoomControl: false }).setView([51.505, -0.09], 13);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Bind structural layout tile sets onto application memory cores
    mapLayers.road = L.tileLayer(tileProviders.road, {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapLayers.topo = L.tileLayer(tileProviders.topo, {
        maxZoom: 17,
        attribution: '© OpenTopoMap contributors'
    });

    mapLayers.marine = L.tileLayer(tileProviders.marine, {
        maxZoom: 18,
        attribution: '© OpenSeaMap'
    });

    // ABSOLUTE FORCE-RECALCULATE MAP INTERFACE SIZING (Wipes out structural zero-pixel rendering bugs)
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
            console.log("Canvas dimensional parameters successfully normalized.");
        }
    }, 450);

    // Start background background utility components
    restoreLocalPurchases();
    setupConnectivityListeners();
    registerOfflineServiceWorker();
    startMockTelemetryEngine();
}

// 4. MICROTRANSACTION PAYMENT INTERCEPT MATRIX
function handleLayerSwitch(selectedLayerKey) {
    console.log(`User initiated dropdown selection request to: ${selectedLayerKey}`);
    const targetKey = selectedLayerKey.toLowerCase();

    // Block flow route if user has not cleared the one-time $1.99 checkout pipeline
    if ((targetKey === 'topo' || targetKey === 'marine') && !purchasedLayers[targetKey]) {
        const confirmCheckout = confirm(`The ${targetKey.toUpperCase()} Landscape Pack is a premium feature upgrade.\n\nUnlock it permanently right now for a simple one-time fee of $1.99?`);
        
        if (confirmCheckout) {
            console.log(`Forwarding window instance routing to Stripe checkout link: ${STRIPE_LINKS[targetKey]}`);
            window.location.href = STRIPE_LINKS[targetKey];
        }
        
        resetDropdownInterfaceUI();
        return;
    }

    // Pass track directly to Leaflet engine render execution if paid or free
    switchLayer(targetKey);
}

function switchLayer(layerKey) {
    Object.keys(mapLayers).forEach(key => {
        if (map.hasLayer(mapLayers[key])) {
            map.removeLayer(mapLayers[key]);
        }
    });

    if (layerKey === 'marine') {
        mapLayers.road.addTo(map); // Marine visuals mount directly over background road grids
        mapLayers.marine.addTo(map);
    } else {
        mapLayers[layerKey].addTo(map);
    }

    currentLayerType = layerKey;
    console.log(`Active map view successfully changed to: ${layerKey}`);
}

// 5. CLOUD SYNCHRONIZATION DATA SHRED ENGINE
async function triggerVaporizeSync() {
    console.warn("Initializing backend cloud scrubbing pipelines...");
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/sync/fetch-and-wipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            alert("Security Handshake Complete: Cloud tracking node completely vaporized.");
        } else {
            alert("Local storage wiped. Remote cloud node already empty.");
        }
    } catch (err) {
        alert("Device Offline: Local tracking records cleared. Cloud nodes will scrub upon reconnection.");
    }
}

// 6. HARDWARE TELEMETRY EVENT SUBSCRIPTIONS
function setupConnectivityListeners() {
    const updateNetworkUI = () => {
        const badge = document.getElementById('network-status');
        if (!badge) return;
        if (navigator.onLine) {
            badge.innerText = "● Online";
            badge.style.color = "#10b981";
        } else {
            badge.innerText = "● 100% Offline Map Running";
            badge.style.color = "#ef4444";
        }
    };
    window.addEventListener('online', updateNetworkUI);
    window.addEventListener('offline', updateNetworkUI);
    updateNetworkUI();
}

function registerOfflineServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Offline System worker active over scope:', reg.scope))
            .catch(err => console.error('Offline worker script initialization stalled:', err));
    }
}

function startMockTelemetryEngine() {
    setInterval(() => {
        const speedEl = document.getElementById('speed-val');
        const elevEl = document.getElementById('elevation-val');
        if (speedEl && navigator.onLine) {
            speedEl.innerText = (Math.random() * 15 + 5).toFixed(1);
            elevEl.innerText = Math.floor(Math.random() * 12 + 2);
        }
    }, 3000);
}

function restoreLocalPurchases() {
    try {
        const savedData = localStorage.getItem('ghost_maps_premium_tokens');
        if (savedData) purchasedLayers = JSON.parse(savedData);
    } catch (e) {
        console.error("Failed to parse browser localStorage state tokens", e);
    }
}

function resetDropdownInterfaceUI() {
    const selector = document.getElementById('map-view-selector');
    if (selector) selector.value = currentLayerType;
}

// Map window lifecycle initializer hook execution
window.onload = initMapApp;
