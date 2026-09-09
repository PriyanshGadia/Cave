import fs from 'fs';
import path from 'path';

async function cleanup() {
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

  const now = new Date(Date.now() - 7 * 86400000); // 7 days back to 60 days forward
  const max = new Date(Date.now() + 60 * 86400000);
  const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${max.toISOString()}&singleEvents=true&orderBy=startTime`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const evData = await evRes.json();
  if (!evRes.ok) {
    console.error('Failed to fetch events:', evData);
    return;
  }

  const allEvents = evData.items || [];
  console.log(`Total events fetched in window: ${allEvents.length}`);

  const testEvents = allEvents.filter(e => {
    const summary = e.summary || '';
    const desc = e.description || '';
    const hasTestEmail = (e.attendees || []).some(a => a.email && a.email.includes('example.com'));
    return summary.includes('Agentic Verification Test') ||
           summary.includes('Test') ||
           desc.includes('test-agent@example.com') ||
           hasTestEmail;
  });

  console.log(`Matching test events found: ${testEvents.length}`);
  for (const t of testEvents) {
    console.log(`- ID: ${t.id} | Summary: "${t.summary}" | Start: ${t.start?.dateTime || t.start?.date} | Attendees: ${JSON.stringify(t.attendees?.map(a => a.email))}`);
  }

  // Delete matching test events
  for (const t of testEvents) {
    console.log(`Deleting test event ${t.id}...`);
    const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${t.id}?sendUpdates=none`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (delRes.status === 204 || delRes.ok) {
      console.log(`✓ Successfully deleted event ${t.id}`);
    } else {
      console.error(`✗ Failed to delete event ${t.id}: status ${delRes.status}`);
    }
  }

  console.log('Cleanup finished.');
}

cleanup().catch(err => console.error(err));
