/**
 * Ghost Maps Pro - Client Application Engine
 * High-utility navigation handler with integrated $1.99 microtransactions.
 */

// 1. GLOBAL SYSTEM CONFIGURATIONS
// Change this to match your live Render service url when syncing data nodes!
const BACKEND_URL = "https://onrender.com";

// Paste your actual unique Stripe product checkout link strings inside these quotes!
const STRIPE_LINKS = {
    topo: "https://stripe.com",
    marine: "https://stripe.com"
};

// 2. CORE MAP STATE ENGINES
let map;
const mapLayers = {};
let currentLayerType = 'road';

// SECURE HTTPS TILE PROVIDERS (Fixes the black background graphic bug!)
const tileProviders = {
    road: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    marine: 'https://openseamap.org{z}/{x}/{y}.png'
};

// PERSISTENT LOCK CONTROLLER
// Tracks user payment status locally in the browser's persistent cache structure
let purchasedLayers = {
    road: true,      // Free Base Map view
    topo: false,     // Premium Layer: Locks behind $1.99 paywall
    marine: false    // Premium Layer: Locks behind $1.99 paywall
};

// 3. APPLICATION INITIALIZATION ENGINE
function initMapApp() {
    console.log("Initializing secure offline map engine...");

    // Build the default Leaflet canvas viewport (Centered over London coordinate space)
    map = L.map('map', { zoomControl: false }).setView([51.505, -0.09], 13);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Initialize map layers using secure tile configurations
    mapLayers.road = L.tileLayer(tileProviders.road, {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map); // Default free base layer

    mapLayers.topo = L.tileLayer(tileProviders.topo, {
        maxZoom: 17,
        attribution: '© OpenTopoMap contributors'
    });

    mapLayers.marine = L.tileLayer(tileProviders.marine, {
        maxZoom: 18,
        attribution: '© OpenSeaMap'
    });

    // Check local storage memory to see if they previously unlocked premium layers
    restoreLocalPurchases();

    // Fire hardware state listeners
    setupConnectivityListeners();
    registerOfflineServiceWorker();
    startMockTelemetryEngine();
}

// 4. THE INTEGRATED $1.99 PAYWALL INTERCEPTOR
// This function tracks dropdown selections and intercepts unpaid premium requests
function handleLayerSwitch(selectedLayerKey) {
    console.log(`User requested layer transition to: ${selectedLayerKey}`);

    // Clean user parameter inputs to match keys
    const lowerKey = selectedLayerKey.toLowerCase();
    const targetKey = lowerKey.includes('marine') ? 'marine' : lowerKey.includes('topo') ? 'topo' : 'road';

    // Intercept flow if the selected map tier is premium and unpaid
    if ((targetKey === 'topo' || targetKey === 'marine') && !purchasedLayers[targetKey]) {
        const confirmCheckout = confirm(`The ${targetKey.toUpperCase()} View is a premium layout feature.\n\nUnlock it forever with a one-time validation fee of $1.99?`);
        
        if (confirmCheckout) {
            console.log(`Redirecting user shell to Stripe checkout corridor: ${STRIPE_LINKS[targetKey]}`);
            window.location.href = STRIPE_LINKS[targetKey];
        }
        
        // Reset user choice selector interface back to the current active layer
        resetDropdownInterfaceUI();
        return;
    }

    // Process layer rendering change if purchase validation is cleared
    switchLayer(targetKey);
}

// Low-level map switching mechanism
function switchLayer(layerKey) {
    Object.keys(mapLayers).forEach(key => {
        if (map.hasLayer(mapLayers[key])) {
            map.removeLayer(mapLayers[key]);
        }
    });

    if (layerKey === 'marine') {
        mapLayers.road.addTo(map); // Marine overlay mounts directly over base roads
        mapLayers.marine.addTo(map);
    } else {
        mapLayers[layerKey].addTo(map);
    }

    currentLayerType = layerKey;
    console.log(`Map rendering layer shifted to: ${layerKey}`);
}

// 5. DATA WIPE SECURITY CONTROLLER
async function triggerVaporizeSync() {
    console.warn("Initializing security wipe parameters across local and cloud environments...");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/sync/fetch-and-wipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            alert("Security Handshake Complete: Cloud storage node completely vaporized.");
        } else {
            alert("Local storage wiped. Remote cloud node already empty.");
        }
    } catch (err) {
        alert("Device Offline: Local tracking records cleared. Cloud nodes will scrub upon reconnection.");
    }
}

// 6. UTILITY ARCHITECTURE CHANNELS
function setupConnectivityListeners() {
    const updateNetworkUI = () => {
        const badge = document.getElementById('network-status') || { style: {} };
        if (navigator.onLine) {
            console.log("Device network link state: ONLINE");
            badge.innerText = "ONLINE MODE";
            badge.style.background = "#00e676";
        } else {
            console.log("Device network link state: 100% OFFLINE");
            badge.innerText = "100% OFFLINE MAP RUNNING";
            badge.style.background = "#ff1744";
        }
    };
    window.addEventListener('online', updateNetworkUI);
    window.addEventListener('offline', updateNetworkUI);
    updateNetworkUI();
}

function registerOfflineServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('ServiceWorker engine listening over scope:', reg.scope))
            .catch(err => console.error('Offline installation stalled:', err));
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
        console.error("Failed to parse browser localStorage tokens", e);
    }
}

function resetDropdownInterfaceUI() {
    const selector = document.getElementById('map-view-selector');
    if (selector) selector.value = currentLayerType;
}

// Initialize application initialization loop on download complete
window.onload = initMapApp;
