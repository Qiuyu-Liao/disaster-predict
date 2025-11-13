// server/server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const REGION = {
    usa: [24.5, -125.0, 49.5, -66.5],
    japan: [24.0, 122.0, 46.0, 146.0],
    philippines: [4.0, 116.0, 22.0, 127.0],
    world: [-90, -180, 90, 180],
};

function usgsUrl({ startISO, minLat, minLng, maxLat, maxLng, minMag }) {
    const u = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
    u.searchParams.set("format", "geojson");
    u.searchParams.set("starttime", startISO);
    u.searchParams.set("minlatitude", minLat);
    u.searchParams.set("minlongitude", minLng);
    u.searchParams.set("maxlatitude", maxLat);
    u.searchParams.set("maxlongitude", maxLng);
    if (minMag != null) u.searchParams.set("minmagnitude", String(minMag));
    return u.toString();
}

function eonetUrl({ bbox, days }) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    const u = new URL("https://eonet.gsfc.nasa.gov/api/v3/events");
    u.searchParams.set("category", "severeStorms");
    u.searchParams.set("status", "open");
    u.searchParams.set("days", String(days));
    u.searchParams.set("bbox", `${minLng},${minLat},${maxLng},${maxLat}`);
    return u.toString();
}

async function upsertEvent(e) {
    const sql = `
    INSERT INTO disaster_events
    (source, source_id, disaster_type, title, magnitude, event_time, url, lat, lng, region)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      title=VALUES(title),
      magnitude=VALUES(magnitude),
      event_time=VALUES(event_time),
      url=VALUES(url),
      lat=VALUES(lat),
      lng=VALUES(lng),
      region=VALUES(region)
  `;
    await pool.query(sql, [
        e.source,
        e.source_id,
        e.disaster_type,
        e.title,
        e.magnitude,
        e.event_time,
        e.url,
        e.lat,
        e.lng,
        e.region,
    ]);
}

app.get("/api/sync", async (req, res) => {
    try {
        const { type = "earthquake", region = "usa", days = "7", minMag = "0" } = req.query;
        const bbox = REGION[region] || REGION.world;
        const startISO = new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString();

        let rows = [];

        if (type === "earthquake") {
            const url = usgsUrl({
                startISO,
                minLat: bbox[0],
                minLng: bbox[1],
                maxLat: bbox[2],
                maxLng: bbox[3],
                minMag: Number(minMag),
            });
            const r = await fetch(url);
            if (!r.ok) throw new Error(`USGS HTTP ${r.status}`);
            const j = await r.json();
            rows = (j.features || []).map((f) => ({
                source: "USGS",
                source_id: f.id,
                disaster_type: "earthquake",
                title: f.properties?.place ?? "Unknown",
                magnitude: f.properties?.mag ?? null,
                event_time: f.properties?.time ?? 0,
                url: f.properties?.url ?? "#",
                lat: f.geometry?.coordinates?.[1],
                lng: f.geometry?.coordinates?.[0],
                region,
            }));
        } else if (type === "hurricane") {
            const url = eonetUrl({ bbox, days: Number(days) });
            const r = await fetch(url);
            if (!r.ok) throw new Error(`EONET HTTP ${r.status}`);
            const j = await r.json();
            rows = (j.events || []).map((e) => {
                const g = e.geometry?.[0];
                const c = g?.coordinates;
                return {
                    source: "EONET",
                    source_id: e.id,
                    disaster_type: "hurricane",
                    title: e.title ?? "Unknown Storm",
                    magnitude: null,
                    event_time: g?.date ? new Date(g.date).getTime() : 0,
                    url: e.sources?.[0]?.url ?? "#",
                    lat: Array.isArray(c) ? c[1] : null,
                    lng: Array.isArray(c) ? c[0] : null,
                    region,
                };
            });
        }

        rows = rows.filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));

        for (const e of rows) {
            await upsertEvent(e);
        }

        await pool.query(
            "INSERT INTO api_fetch_log (source, disaster_type, region, fetched) VALUES (?,?,?,?)",
            [type === "earthquake" ? "USGS" : "EONET", type, region, rows.length]
        );

        res.json({ ok: true, count: rows.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.get("/api/history", async (req, res) => {
    try {
        const { type = "earthquake", region, limit = "200" } = req.query;
        const sql = `
      SELECT source, source_id, disaster_type, title, magnitude, event_time, url, lat, lng, region
      FROM disaster_events
      WHERE disaster_type = ?
        AND (? IS NULL OR region = ?)
      ORDER BY event_time DESC
      LIMIT ?`;
        const [rows] = await pool.query(sql, [type, region || null, region || null, Number(limit)]);
        res.json({ ok: true, rows });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?,?,?)",
            [username, email, hash]
        );
        res.json({ ok: true, message: "User registered" });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [username]);
        if (rows.length === 0) {
            return res.status(401).json({ ok: false, error: "User not found" });
        }
        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ ok: false, error: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "2h" }
        );
        res.json({ ok: true, token });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`API server running at http://localhost:${port}`);
});
