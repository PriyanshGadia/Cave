import fs from 'fs';
import path from 'path';

async function test() {
  const envPath = path.resolve(process.cwd(), '.dev.vars');
  if (!fs.existsSync(envPath)) {
    console.error('.dev.vars not found');
    return;
  }
  const envText = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [k, ...v] = trimmed.split('=');
    env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }

  console.log('Testing Google Calendar token refresh...');
  console.log('Client ID:', env.GOOGLE_CLIENT_ID?.slice(0, 20) + '...');
  console.log('Owner email:', env.OWNER_EMAIL);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Token refresh error:', tokenData);
    return;
  }
  console.log('Token refresh SUCCESS! Access token obtained.');

  const now = new Date();
  const max = new Date(Date.now() + 30 * 86400000);
  const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: max.toISOString(),
      items: [{ id: 'primary' }],
    }),
  });

  const fbData = await fbRes.json();
  if (!fbRes.ok) {
    console.error('Freebusy API error:', fbData);
    return;
  }
  console.log('Google Calendar Freebusy API SUCCESS!');
  console.log('Busy blocks found:', fbData.calendars?.primary?.busy?.length ?? 0);
  console.log('Freebusy data sample:', JSON.stringify(fbData, null, 2));

  // Now test events list
  console.log('\nTesting Google Calendar Events List API...');
  const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${max.toISOString()}&singleEvents=true&orderBy=startTime`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  console.log('Events API status:', evRes.status);
  const evData = await evRes.json();
  if (!evRes.ok) {
    console.error('Events API error:', evData);
  } else {
    console.log('Events found:', evData.items?.length ?? 0);
    console.log('Events list sample:', JSON.stringify(evData.items?.map(e => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      status: e.status
    })), null, 2));
  }
}

test().catch(console.error);
