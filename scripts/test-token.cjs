const fs = require('fs');

const vars = fs.readFileSync('.dev.vars', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([^=]+)=\"?([^\"]*)\"?$/);
  if (m) acc[m[1].trim()] = m[2].trim();
  return acc;
}, {});

console.log('Testing refresh token with Google OAuth...');
fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: vars.GOOGLE_CLIENT_ID,
    client_secret: vars.GOOGLE_CLIENT_SECRET,
    refresh_token: vars.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  })
}).then(r => r.json()).then(async data => {
  console.log('OAuth Response:', data);
  if (data.access_token) {
    console.log('SUCCESS! Access token retrieved.');
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    const cals = await calRes.json();
    console.log('Calendars:', cals.items ? cals.items.map(c => c.summary) : cals);
  }
}).catch(console.error);
