interface Env {
  WORKSHOP_DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  CALENDAR_ID?: string;
}

const TTL_SECONDS = 300;
const WINDOW_DAYS = 30;

async function getAccessToken(env: Env): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('token_refresh_failed');
  const j = await res.json<{ access_token: string }>();
  return j.access_token;
}

async function fetchFreshFreeBusy(env: Env) {
  const accessToken = await getAccessToken(env);
  const calendarId = env.CALENDAR_ID || 'primary';
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + WINDOW_DAYS * 86400000);

  const [fbRes, evRes] = await Promise.all([
    fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: calendarId }] }),
    }),
    fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  ]);

  if (!fbRes.ok) throw new Error('freebusy_query_failed');
  const j = await fbRes.json<any>();

  let events: any[] = [];
  if (evRes.ok) {
    const evJson = await evRes.json<any>();
    events = (evJson.items || []).map((e: any) => ({
      id: e.id,
      summary: e.summary || 'Reserved / Meeting',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      status: e.status || 'confirmed',
      location: e.location || '',
      description: e.description || ''
    }));
  }

  const rawBusy = j.calendars?.[calendarId]?.busy ?? j.calendars?.primary?.busy ?? [];
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

  return { busy: Array.from(busyMap.values()), events, syncedAt: Date.now() };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const db = env.WORKSHOP_DB;

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    return new Response(JSON.stringify({ configured: false }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }

  try {
    const row = await db.prepare('SELECT payload, cached_at FROM calendar_cache WHERE id = ?')
      .bind('freebusy').first<{ payload: string; cached_at: number }>();
    const nowSec = Math.floor(Date.now() / 1000);
    let payload: { busy: any[]; syncedAt: number };

    if (row && (nowSec - row.cached_at) < TTL_SECONDS) {
      payload = JSON.parse(row.payload);
    } else {
      payload = await fetchFreshFreeBusy(env);
      await db.prepare(
        'INSERT INTO calendar_cache (id, payload, cached_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, cached_at = excluded.cached_at'
      ).bind('freebusy', JSON.stringify(payload), nowSec).run();
    }

    const etag = `"fb-${Math.floor(payload.syncedAt / 1000)}"`;
    if (context.request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 });

    return new Response(JSON.stringify({ configured: true, ...payload }), {
      headers: { 'Content-Type': 'application/json', 'ETag': etag, 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
    });
  } catch {
    return new Response(JSON.stringify({ configured: true, error: 'sync_failed', busy: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
};
