interface Env {
  WORKSHOP_DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  OWNER_EMAIL?: string;
  CALENDAR_ID?: string;
}

const COOLDOWN_SECONDS = 180;
const MIN_MINUTES = 15, MAX_MINUTES = 90;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const db = env.WORKSHOP_DB;

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN || !env.OWNER_EMAIL) {
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const { name, email, location, description, startIso, endIso } = body || {};
  if (!name || !email || !location || !description || !startIso || !endIso) return json({ ok: false, error: 'missing_fields' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);
  if (String(name).length > 100 || String(location).length > 200 || String(description).length > 1000) return json({ ok: false, error: 'too_long' }, 400);

  const start = new Date(startIso), end = new Date(endIso);
  const durMin = (end.getTime() - start.getTime()) / 60000;
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || !(start.getTime() > Date.now()) || !(durMin >= MIN_MINUTES && durMin <= MAX_MINUTES)) {
    return json({ ok: false, error: 'bad_slot' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const keyHash = await sha256Hex(`${ip}:calendar_request`);
  const nowSec = Math.floor(Date.now() / 1000);

  const existing = await db.prepare('SELECT window_expires_at FROM rate_limits WHERE key_hash = ?')
    .bind(keyHash).first<{ window_expires_at: number }>();
  if (existing && existing.window_expires_at > nowSec) {
    return json({ ok: false, error: 'rate_limited', retryAfter: existing.window_expires_at - nowSec }, 429);
  }
  await db.prepare(
    'INSERT INTO rate_limits (key_hash, request_count, window_expires_at) VALUES (?, 1, ?) ' +
    'ON CONFLICT(key_hash) DO UPDATE SET request_count = request_count + 1, window_expires_at = excluded.window_expires_at'
  ).bind(keyHash, nowSec + COOLDOWN_SECONDS).run();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  if (!tokenRes.ok) return json({ ok: false, error: 'auth_failed' }, 502);
  const { access_token } = await tokenRes.json<{ access_token: string }>();

  // Re-validate against FRESH busy data — never trust the client-submitted slot
  const calendarId = env.CALENDAR_ID || 'primary';
  const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: start.toISOString(), timeMax: end.toISOString(), items: [{ id: calendarId }] }),
  });
  if (!fbRes.ok) return json({ ok: false, error: 'freebusy_check_failed' }, 502);
  const fbJson = await fbRes.json<any>();
  const busy: { start: string; end: string }[] = fbJson.calendars?.[calendarId]?.busy ?? fbJson.calendars?.primary?.busy ?? [];
  const overlaps = busy.some(b => new Date(b.start) < end && new Date(b.end) > start);
  if (overlaps) return json({ ok: false, error: 'slot_taken' }, 409);

  const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: `Meeting request: ${name}`,
      description: `${description}\n\nRequested via holo-calendar by ${name} (${email}).`,
      location,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: [{ email: env.OWNER_EMAIL }, { email }],
      status: 'tentative',
      guestsCanModify: false,
    }),
  });

  const id = crypto.randomUUID();
  const ipHash = await sha256Hex(ip);
  if (!evRes.ok) {
    await db.prepare(
      'INSERT INTO booking_requests (id, visitor_name, visitor_email, location, description, start_iso, end_iso, status, ip_hash) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(id, name, email, location, description, startIso, endIso, 'failed', ipHash).run();
    return json({ ok: false, error: 'insert_failed' }, 502);
  }
  const evJson = await evRes.json<any>();
  await db.prepare(
    'INSERT INTO booking_requests (id, visitor_name, visitor_email, location, description, start_iso, end_iso, google_event_id, status, ip_hash) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, name, email, location, description, startIso, endIso, evJson.id, 'created', ipHash).run();

  await db.prepare('DELETE FROM calendar_cache WHERE id = ?').bind('freebusy').run();
  return json({ ok: true, id });
};
