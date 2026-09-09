// scripts/mint-google-token.mjs
// One-time interactive OAuth loopback script to mint a Google Calendar refresh token
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

let clientId = process.env.GOOGLE_CLIENT_ID;
let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
if ((!clientId || !clientSecret) && fs.existsSync(devVarsPath)) {
  const content = fs.readFileSync(devVarsPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) {
      if (m[1] === 'GOOGLE_CLIENT_ID' && !clientId) clientId = m[2].trim();
      if (m[1] === 'GOOGLE_CLIENT_SECRET' && !clientSecret) clientSecret = m[2].trim();
    }
  }
}

async function main() {
  if (!clientId || !clientSecret) {
    console.error('Error: Please provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET via environment variables or .dev.vars.');
    process.exit(1);
  }
  console.log('\n=== [GOOGLE CALENDAR REFRESH TOKEN MINT TOOL] ===\n');
  console.log(`Using Client ID: ${clientId}`);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (reqUrl.pathname !== '/oauth2callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h2>Authorization Failed</h2><p>${error}</p>`);
        console.error(`\nOAuth Error: ${error}`);
        server.close();
        process.exit(1);
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h2>Missing authorization code</h2>');
        return;
      }

      console.log('\nReceived authorization code! Exchanging for tokens...');

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h2>Token Exchange Failed</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
        console.error('\nToken exchange error:', tokenData);
        server.close();
        process.exit(1);
      }

      const refreshToken = tokenData.refresh_token;
      const accessToken = tokenData.access_token;

      // Fetch user's email
      let userEmail = 'YOUR_EMAIL@gmail.com';
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          const uJson = await userRes.json();
          if (uJson.email) userEmail = uJson.email;
        }
      } catch {}

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family:monospace;padding:32px;background:#05141e;color:#5fe8ff;border-radius:8px;max-width:600px;margin:40px auto;border:1px solid #39d6ff;">
          <h2 style="color:#4dff8a;">&#10004; Authorization Successful!</h2>
          <p>Google Calendar has been authorized for: <strong>${userEmail}</strong></p>
          <p>Your tokens have been captured. You can close this browser tab now.</p>
        </div>
      `);

      console.log('\n======================================================');
      console.log('SUCCESS! Google Calendar Tokens Minted:');
      console.log('------------------------------------------------------');
      console.log(`OWNER_EMAIL:          ${userEmail}`);
      console.log(`GOOGLE_CLIENT_ID:     ${clientId}`);
      console.log(`GOOGLE_CLIENT_SECRET: ${clientSecret}`);
      console.log(`GOOGLE_REFRESH_TOKEN: ${refreshToken}`);
      console.log('------------------------------------------------------\n');

      // Write .dev.vars for local testing
      const devVarsContent = [
        `GOOGLE_CLIENT_ID="${clientId}"`,
        `GOOGLE_CLIENT_SECRET="${clientSecret}"`,
        `GOOGLE_REFRESH_TOKEN="${refreshToken}"`,
        `OWNER_EMAIL="${userEmail}"`
      ].join('\n') + '\n';

      fs.writeFileSync(path.resolve(process.cwd(), '.dev.vars'), devVarsContent, 'utf8');
      console.log('Saved secrets to .dev.vars for local testing.\n');

      console.log('Run these commands to set production secrets in Cloudflare Pages:');
      console.log(`echo "${clientId}" | wrangler pages secret put GOOGLE_CLIENT_ID`);
      console.log(`echo "${clientSecret}" | wrangler pages secret put GOOGLE_CLIENT_SECRET`);
      console.log(`echo "${refreshToken}" | wrangler pages secret put GOOGLE_REFRESH_TOKEN`);
      console.log(`echo "${userEmail}" | wrangler pages secret put OWNER_EMAIL\n`);

      server.close();
      process.exit(0);
    } catch (e) {
      res.writeHead(500);
      res.end('Server error: ' + e.message);
      console.error(e);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`\nLocal listener active on: ${REDIRECT_URI}`);
    console.log('\n--- CLICK OR OPEN THIS LINK TO COMPLETE AUTHORIZATION ---');
    console.log(authUrl.toString());
    console.log('---------------------------------------------------------\n');
    console.log('Waiting for browser approval...\n');
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
