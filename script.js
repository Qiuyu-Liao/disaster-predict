const API_BASE = "http://localhost:3000";

const REGION_BBOX = {
    usa: [24.5, -125.0, 49.5, -66.5],
    japan: [24.0, 122.0, 46.0, 146.0],
    philippines: [4.0, 116.0, 22.0, 127.0],
    world: [-90, -180, 90, 180],
};

const $ = (s) => document.querySelector(s);
function setStatus(t) {
    $("#status").textContent = t || "";
}

let map, dataLayer;
let authToken = null;
let currentUser = null;

function initMap() {
    map = L.map("map").setView([37.5, -96], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    dataLayer = L.layerGroup().addTo(map);
}

function renderEarthquakes(rows) {
    dataLayer.clearLayers();

    rows.forEach((r) => {
        L.circleMarker([r.lat, r.lng], {
            radius: Math.max(3, (r.mag || 0) * 2.0),
            color: "red",
            fillColor: "#f03",
            fillOpacity: 0.7,
        })
            .bindPopup(
                `<b>M ${Number(r.mag || 0).toFixed(1)}</b><br>${r.title}<br>${new Date(
                    r.time
                ).toLocaleString()}`
            )
            .addTo(dataLayer);
    });

    const list = $("#dataList");
    list.innerHTML = "";
    rows.slice(0, 200).forEach((e) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>M ${Number(e.mag || 0).toFixed(1)}</b> — ${e.title
            }<br><small>${new Date(e.time).toLocaleString()}</small>`;
        li.addEventListener("click", () => map.flyTo([e.lat, e.lng], 6));
        list.appendChild(li);
    });
}

function renderHurricanes(rows) {
    dataLayer.clearLayers();

    rows.forEach((r) => {
        L.circleMarker([r.lat, r.lng], {
            radius: 8,
            color: "blue",
            fillColor: "#30f",
            fillOpacity: 0.7,
        })
            .bindPopup(
                `<b>${r.title}</b><br>${new Date(r.time).toLocaleString()}`
            )
            .addTo(dataLayer);
    });

    const list = $("#dataList");
    list.innerHTML = "";
    rows.slice(0, 200).forEach((e) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${e.title}</b><br><small>${new Date(
            e.time
        ).toLocaleString()}</small>`;
        li.addEventListener("click", () => map.flyTo([e.lat, e.lng], 6));
        list.appendChild(li);
    });
}

async function fetchFromBackend(disasterType, regionKey, days, minMag) {
    setStatus("Syncing with server…");
    const syncUrl =
        `${API_BASE}/api/sync?type=${encodeURIComponent(
            disasterType
        )}` +
        `&region=${encodeURIComponent(regionKey)}` +
        `&days=${encodeURIComponent(days)}` +
        `&minMag=${encodeURIComponent(minMag)}`;

    const syncRes = await fetch(syncUrl);
    const syncJson = await syncRes.json();
    if (!syncRes.ok || !syncJson.ok) {
        throw new Error(syncJson.error || "Sync failed");
    }

    setStatus("Loading from database…");
    const historyUrl =
        `${API_BASE}/api/history?type=${encodeURIComponent(
            disasterType
        )}` +
        `&region=${encodeURIComponent(regionKey)}` +
        `&limit=200`;

    const histRes = await fetch(historyUrl);
    const histJson = await histRes.json();
    if (!histRes.ok || !histJson.ok) {
        throw new Error(histJson.error || "History failed");
    }

    return (histJson.rows || []).map((r) => ({
        mag: r.magnitude,
        title: r.title,
        time: r.event_time,
        url: r.url,
        lat: r.lat,
        lng: r.lng,
    }));
}

function updateUI(disasterType) {
    const isEarthquake = disasterType === "earthquake";
    $("#mainTitle").textContent = isEarthquake
        ? "🌎 Earthquake Management"
        : "🌀 Hurricane Management";
    $("#minMagContainer").style.display = isEarthquake
        ? "inline-block"
        : "none";
}

async function runSearch() {
    const disasterType = document.querySelector(
        'input[name="disasterType"]:checked'
    ).value;

    const q = $("#q").value.trim().toLowerCase();
    const bbox = REGION_BBOX[q];
    if (!bbox) {
        alert("Unknown region. Try: USA, Japan, Philippines, or World");
        return;
    }

    const days = $("#days").value;
    const minMag = Number($("#minMag").value) || 0;

    $("#regionTitle").textContent = $("#q").value.trim().toUpperCase();
    map.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
    ]);

    try {
        setStatus("Loading…");
        const rows = await fetchFromBackend(disasterType, q, days, minMag);

        if (disasterType === "earthquake") {
            renderEarthquakes(rows);
        } else {
            renderHurricanes(rows);
        }

        setStatus(`Events found: ${rows.length}`);
    } catch (e) {
        console.error(e);
        setStatus("Error: " + e.message);
    }
}

async function handleRegister() {
    const username = $("#username").value.trim();
    const password = $("#password").value.trim();

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email: null, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
            throw new Error(json.error || "Register failed");
        }
        alert("Register success, now you can login.");
    } catch (err) {
        alert("Register error: " + err.message);
    }
}

async function handleLogin() {
    const username = $("#username").value.trim();
    const password = $("#password").value.trim();

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
            throw new Error(json.error || "Login failed");
        }

        authToken = json.token;
        currentUser = username;
        $("#authStatus").textContent = "Hi, " + currentUser;
        alert("Login success!");
    } catch (err) {
        alert("Login error: " + err.message);
    }
}

window.addEventListener("load", () => {
    initMap();

    const form = $("#searchForm");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        runSearch();
    });

    document
        .querySelectorAll('input[name="disasterType"]')
        .forEach((radio) => {
            radio.addEventListener("change", (e) => {
                updateUI(e.target.value);
                runSearch();
            });
        });

    const btnLogin = $("#btnLogin");
    const btnRegister = $("#btnRegister");
    if (btnLogin) btnLogin.addEventListener("click", handleLogin);
    if (btnRegister) btnRegister.addEventListener("click", handleRegister);

    $("#q").value = "USA";
    updateUI("earthquake");
    form.requestSubmit();
});
