import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface DevVars {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  OWNER_EMAIL?: string;
  DEV_GEO_LAT?: string;
  DEV_GEO_LON?: string;
  DEV_GEO_CITY?: string;
  DEV_GEO_COUNTRY?: string;
  DEV_GEO_TIMEZONE?: string;
  [key: string]: string | undefined;
}

function loadDevVars(): DevVars {
  const envPath = path.resolve(process.cwd(), '.dev.vars');
  if (!fs.existsSync(envPath)) return {};
  const envText = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [k, ...v] = trimmed.split('=');
    env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const DEFAULT_APPROVED_PROJECTS = [
  {
    id: 'gh:PriyanshGadia/Cave',
    source: 'github',
    repo_full: 'PriyanshGadia/Cave',
    title: 'Cave',
    tagline: 'VAULT-01 real-time procedural WebGL engine. Zero raster images, 60 FPS PBR renderer.',
    tags: ['WebGL', 'Three.js', 'TypeScript', 'Procedural', 'PBR'],
    stats: { stars: 0, forks: 0, lang: 'TypeScript' },
    diagram_spec: {
      shapes: [
        { type: 'rect', x: 15, y: 25, w: 60, h: 50, label: 'CAVERN' },
        { type: 'rect', x: 105, y: 25, w: 60, h: 50, label: 'VAULT' },
        { type: 'line', from: [75, 50], to: [105, 50] },
        { type: 'circle', x: 90, y: 50, r: 8, label: 'DOOR' },
        { type: 'circle', x: 135, y: 50, r: 14, label: 'PEDESTAL' },
        { type: 'dim', from: [15, 105], to: [165, 105], text: 'TUNNEL 25m' },
        { type: 'rect', x: 25, y: 130, w: 130, h: 45, label: 'PBR SHADER STACK' }
      ]
    },
    sort_order: 1
  },
  {
    id: 'gh:PriyanshGadia/Argus',
    source: 'github',
    repo_full: 'PriyanshGadia/Argus',
    title: 'Argus',
    tagline: 'Autonomous telemetry & visual anomaly surveillance engine.',
    tags: ['Python', 'Computer Vision', 'Telemetry', 'Surveillance'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'circle', x: 50, y: 50, r: 24, label: 'OPTIC SENSOR' },
        { type: 'circle', x: 50, y: 50, r: 8 },
        { type: 'line', from: [74, 50], to: [110, 50] },
        { type: 'rect', x: 110, y: 28, w: 55, h: 44, label: 'CNN FILTER' },
        { type: 'line', from: [137, 72], to: [137, 115] },
        { type: 'rect', x: 95, y: 115, w: 75, h: 45, label: 'ALERT BUS' },
        { type: 'dim', from: [20, 180], to: [165, 180], text: '<15ms LATENCY' }
      ]
    },
    sort_order: 2
  }
];

export function viteApiPlugin(): Plugin {
  let cachedFreebusy: { payload: any; cachedAt: number } | null = null;
  const TTL_MS = 60 * 1000; // 1 minute in dev

  return {
    name: 'vite-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost:3000') : null;
        if (!url || !url.pathname.startsWith('/api/')) {
          return next();
        }

        const devVars = loadDevVars();
        const clientId = devVars.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = devVars.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = devVars.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
        const ownerEmail = devVars.OWNER_EMAIL || process.env.OWNER_EMAIL || 'bigbro211220@gmail.com';

        // Strict inverted safe default: writing to primary requires explicit ALLOW_PRIMARY_CALENDAR_WRITES=true
        const ALLOW_REAL = (devVars.ALLOW_PRIMARY_CALENDAR_WRITES || process.env.ALLOW_PRIMARY_CALENDAR_WRITES) === 'true';
        const targetCalendarId = ALLOW_REAL ? 'primary' : (devVars.TEST_CALENDAR_ID || process.env.TEST_CALENDAR_ID || 'dry-run');
        const readCalendarId = (targetCalendarId === 'dry-run') ? 'primary' : targetCalendarId;

        // Diagnostic mode check for safety & tests
        if (url.pathname === '/api/calendar/mode' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            allowPrimaryWrites: ALLOW_REAL,
            targetCalendarId,
            readCalendarId,
            isDryRun: targetCalendarId === 'dry-run',
          }));
          return;
        }

        // 1. GET /api/calendar/freebusy
        if (url.pathname === '/api/calendar/freebusy' && req.method === 'GET') {
          if (!clientId || !clientSecret || !refreshToken) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ configured: false }));
            return;
          }

          try {
            const now = Date.now();
            if (cachedFreebusy && now - cachedFreebusy.cachedAt < TTL_MS) {
              const etag = `"fb-${Math.floor(cachedFreebusy.payload.syncedAt / 1000)}"`;
              if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
              }
              res.writeHead(200, {
                'Content-Type': 'application/json',
                ETag: etag,
                'Cache-Control': 'public, max-age=60',
              });
              res.end(JSON.stringify(cachedFreebusy.payload));
              return;
            }

            // Refresh token
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
              }),
            });
            const tokenData = await tokenRes.json() as any;
            if (!tokenRes.ok || !tokenData.access_token) {
              throw new Error('token_refresh_failed');
            }

            // Query freeBusy and events list in parallel
            const timeMin = new Date();
            const timeMax = new Date(Date.now() + 30 * 86400000);

            const [fbRes, evRes] = await Promise.all([
              fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  timeMin: timeMin.toISOString(),
                  timeMax: timeMax.toISOString(),
                  items: [{ id: readCalendarId }],
                }),
              }),
              fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(readCalendarId)}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
              })
            ]);

            const fbData = await fbRes.json() as any;
            if (!fbRes.ok) {
              throw new Error('freebusy_query_failed');
            }

            let events: any[] = [];
            if (evRes.ok) {
              const evData = await evRes.json() as any;
              events = (evData.items || []).map((e: any) => ({
                id: e.id,
                summary: e.summary || 'Reserved / Meeting',
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                status: e.status || 'confirmed',
                location: e.location || '',
                description: e.description || ''
              }));
            }

            const rawBusy = fbData.calendars?.[readCalendarId]?.busy ?? fbData.calendars?.primary?.busy ?? [];
            // Ensure any event in events list is also represented in busy blocks
            const busyMap = new Map<string, { start: string; end: string }>();
            for (const b of rawBusy) {
              busyMap.set(`${b.start}_${b.end}`, { start: b.start, end: b.end });
            }
            for (const e of events) {
              if (e.start && e.end) {
                const sIso = new Date(e.start).toISOString();
                const eIso = new Date(e.end).toISOString();
                busyMap.set(`${sIso}_${eIso}`, { start: sIso, end: eIso });
              }
            }

            const payload = {
              configured: true,
              busy: Array.from(busyMap.values()),
              events,
              syncedAt: Date.now(),
            };
            cachedFreebusy = { payload, cachedAt: Date.now() };

            const etag = `"fb-${Math.floor(payload.syncedAt / 1000)}"`;
            res.writeHead(200, {
              'Content-Type': 'application/json',
              ETag: etag,
              'Cache-Control': 'public, max-age=60',
            });
            res.end(JSON.stringify(payload));
            return;
          } catch (err) {
            console.error('[vite-api] freebusy error:', err);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ configured: true, error: 'sync_failed', busy: [], events: [] }));
            return;
          }
        }

        // 2. POST /api/calendar/request
        if (url.pathname === '/api/calendar/request' && req.method === 'POST') {
          if (!clientId || !clientSecret || !refreshToken || !ownerEmail) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'not_configured' }));
            return;
          }

          let bodyText = '';
          for await (const chunk of req) {
            bodyText += chunk;
          }

          let body: any;
          try {
            body = JSON.parse(bodyText);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'bad_json' }));
            return;
          }

          const { name, email, location, description, startIso, endIso } = body || {};
          if (!name || !email || !location || !description || !startIso || !endIso) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'missing_fields' }));
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'bad_email' }));
            return;
          }

          const start = new Date(startIso), end = new Date(endIso);
          const durMin = (end.getTime() - start.getTime()) / 60000;
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || !(start.getTime() > Date.now()) || !(durMin >= 15 && durMin <= 90)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'bad_slot' }));
            return;
          }

          try {
            // Get fresh access token
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
              }),
            });
            const tokenData = await tokenRes.json() as any;
            if (!tokenRes.ok || !tokenData.access_token) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'auth_failed' }));
              return;
            }

            // Conflict check
            const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                items: [{ id: targetCalendarId }],
              }),
            });
            if (!fbRes.ok) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'freebusy_check_failed' }));
              return;
            }
            const fbJson = await fbRes.json() as any;
            const busy: { start: string; end: string }[] = fbJson.calendars?.[targetCalendarId]?.busy ?? fbJson.calendars?.primary?.busy ?? [];
            const overlaps = busy.some(b => new Date(b.start) < end && new Date(b.end) > start);
            if (overlaps) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'slot_taken' }));
              return;
            }

            // Gated dry-run mode for automated CI/E2E testing without mutating Google Calendar or sending emails
            if (targetCalendarId === 'dry-run') {
              console.log(`[vite-api] [DRY RUN] Simulating Google Calendar event creation for ${name} (${email})`);
              const mockId = 'dry-run-' + Date.now();
              cachedFreebusy = null;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                ok: true,
                id: mockId,
                event: {
                  id: mockId,
                  summary: `Meeting request: ${name}`,
                  start: start.toISOString(),
                  end: end.toISOString(),
                  status: 'tentative',
                  location,
                  description
                }
              }));
              return;
            }

            // Create Event on target calendar
            const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?sendUpdates=all`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                summary: `Meeting request: ${name}`,
                description: `${description}\n\nRequested via holo-calendar by ${name} (${email}).`,
                location,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
                attendees: [{ email: ownerEmail }, { email }],
                status: 'tentative',
                guestsCanModify: false,
              }),
            });

            if (!evRes.ok) {
              const errBody = await evRes.text();
              console.error('[vite-api] Event create error:', errBody);
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'insert_failed' }));
              return;
            }

            const evJson = await evRes.json() as any;
            cachedFreebusy = null; // Invalidate cache

            console.log(`[vite-api] Successfully created Google Calendar event ${evJson.id} for ${name} (${email})`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: true,
              id: evJson.id,
              event: {
                id: evJson.id,
                summary: `Meeting request: ${name}`,
                start: start.toISOString(),
                end: end.toISOString(),
                status: 'tentative',
                location,
                description
              }
            }));
            return;
          } catch (err: any) {
            console.error('[vite-api] Request handler error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err?.message || 'internal_error' }));
            return;
          }
        }

        // 3. GET /api/geo/locate
        if (url.pathname === '/api/geo/locate' && req.method === 'GET') {
          const lat = devVars.DEV_GEO_LAT ? Number(devVars.DEV_GEO_LAT) : null;
          const lon = devVars.DEV_GEO_LON ? Number(devVars.DEV_GEO_LON) : null;
          const city = devVars.DEV_GEO_CITY || null;
          const country = devVars.DEV_GEO_COUNTRY || null;
          const timezone = devVars.DEV_GEO_TIMEZONE || null;
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' });
          res.end(JSON.stringify({ lat, lon, city, country, timezone }));
          return;
        }

        // 3b. GET /api/geo/satellites (Live ISS Ephemeris)
        if (url.pathname === '/api/geo/satellites' && req.method === 'GET') {
          (async () => {
            try {
              const issRes = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
                headers: { 'User-Agent': 'Cave-Vault-Intel/1.0' }
              });
              if (issRes.ok) {
                const data = await issRes.json() as any;
                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=5' });
                res.end(JSON.stringify({
                  name: 'ISS (ZARYA)',
                  id: 25544,
                  lat: Number(data.latitude),
                  lon: Number(data.longitude),
                  altitude_km: Number(data.altitude),
                  velocity_kmh: Number(data.velocity),
                  visibility: data.visibility || 'daylight',
                  footprint_km: Number(data.footprint),
                  timestamp: data.timestamp
                }));
                return;
              }
            } catch (e) {
              console.warn('[vite-api] ISS live fetch error:', e);
            }
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'upstream_unavailable' }));
          })();
          return;
        }

        // 3c. GET /api/geo/earthquakes (Live USGS Seismic Feed)
        if (url.pathname === '/api/geo/earthquakes' && req.method === 'GET') {
          (async () => {
            try {
              const qRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', {
                headers: { 'User-Agent': 'Cave-Vault-Intel/1.0' }
              });
              if (qRes.ok) {
                const data = await qRes.json() as any;
                const quakes = (data.features || [])
                  .filter((f: any) => f.properties && f.properties.mag != null && f.geometry?.coordinates?.length >= 2)
                  .slice(0, 80)
                  .map((f: any) => ({
                    id: f.id,
                    title: f.properties.title || 'Seismic Event',
                    mag: Number(f.properties.mag),
                    place: f.properties.place || 'Unknown Location',
                    lon: Number(f.geometry.coordinates[0]),
                    lat: Number(f.geometry.coordinates[1]),
                    depth_km: Number(f.geometry.coordinates[2] || 0),
                    time: f.properties.time
                  }));
                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
                res.end(JSON.stringify({ count: quakes.length, generated: data.metadata?.generated || Date.now(), earthquakes: quakes }));
                return;
              }
            } catch (e) {
              console.warn('[vite-api] USGS earthquakes fetch error:', e);
            }
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'upstream_unavailable', earthquakes: [] }));
          })();
          return;
        }

        // 3d. GET /api/geo/flights (Live Flight Transponders from OpenSky / adsb.lol)
        if (url.pathname === '/api/geo/flights' && req.method === 'GET') {
          (async () => {
            let flights: any[] = [];
            try {
              const osRes = await fetch('https://opensky-network.org/api/states/all', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
              });
              if (osRes.ok) {
                const osData = await osRes.json() as any;
                const states = osData.states || [];
                flights = states
                  .filter((s: any) => s[5] != null && s[6] != null && s[1] && s[1].trim())
                  .slice(0, 80)
                  .map((s: any) => ({
                    callsign: (s[1] || '').trim(),
                    country: s[2] || 'INTERNATIONAL',
                    lon: Number(s[5]),
                    lat: Number(s[6]),
                    alt_m: Number(s[7] || s[13] || 10000),
                    velocity_kmh: Math.round(Number(s[9] || 250) * 3.6),
                    heading: Number(s[10] || 0)
                  }));
              }
            } catch {}

            if (flights.length === 0) {
              try {
                const adsbRes = await fetch('https://api.adsb.lol/v2/ladd', {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                if (adsbRes.ok) {
                  const adsbData = await adsbRes.json() as any;
                  flights = (adsbData.ac || [])
                    .filter((a: any) => a.lat != null && a.lon != null && (a.flight || a.r))
                    .slice(0, 80)
                    .map((a: any) => ({
                      callsign: (a.flight || a.r || 'UNKN').trim(),
                      country: 'GLOBAL',
                      lon: Number(a.lon),
                      lat: Number(a.lat),
                      alt_m: Math.round(Number(a.alt_baro || 30000) * 0.3048),
                      velocity_kmh: Math.round(Number(a.gs || 450) * 1.852),
                      heading: Number(a.track || 0)
                    }));
                }
              } catch {}
            }

            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10' });
            res.end(JSON.stringify({ count: flights.length, timestamp: Date.now(), flights }));
          })();
          return;
        }

        // 3e. GET /api/geo/news (Global Live News Channels & Dispatches)
        if (url.pathname === '/api/geo/news' && req.method === 'GET') {
          (async () => {
            try {
              const { GLOBAL_NEWS_CHANNELS } = await import('../functions/api/geo/news.ts');
              const totalCountries = new Set(GLOBAL_NEWS_CHANNELS.map(c => c.country)).size;
              res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' });
              res.end(JSON.stringify({
                status: 'ok',
                totalChannels: GLOBAL_NEWS_CHANNELS.length,
                totalCountries,
                timestamp: new Date().toISOString(),
                channels: GLOBAL_NEWS_CHANNELS
              }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err?.message || 'news_unavailable' }));
            }
          })();
          return;
        }

        // 4. GET /api/projects
        if (url.pathname === '/api/projects' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ projects: DEFAULT_APPROVED_PROJECTS }));
          return;
        }

        // 4. Fallback for other /api routes
        if (url.pathname.startsWith('/api/state/')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({}));
          return;
        }

        return next();
      });
    },
  };
}
