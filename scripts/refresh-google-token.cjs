/**
 * scripts/refresh-google-token.cjs
 * Diagnostic & update tool for Google OAuth tokens in .dev.vars
 *
 * Usage:
 *   node scripts/refresh-google-token.cjs --test
 *   node scripts/refresh-google-token.cjs --set-refresh-token <NEW_REFRESH_TOKEN>
 */

const fs = require('fs');
const path = require('path');

const devVarsPath = path.resolve(__dirname, '../.dev.vars');
if (!fs.existsSync(devVarsPath)) {
  console.error('[TOKEN-TOOL] .dev.vars not found at', devVarsPath);
  process.exit(1);
}

let devVars = fs.readFileSync(devVarsPath, 'utf8');

function getVar(name) {
  const m = devVars.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'));
  return m ? m[1] : null;
}

const clientId = getVar('GOOGLE_CLIENT_ID');
const clientSecret = getVar('GOOGLE_CLIENT_SECRET');
let refreshToken = getVar('GOOGLE_REFRESH_TOKEN');

const args = process.argv.slice(2);
const setIdx = args.indexOf('--set-refresh-token');
if (setIdx !== -1 && args[setIdx + 1]) {
  const newToken = args[setIdx + 1].trim();
  devVars = devVars.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN="${newToken}"`);
  fs.writeFileSync(devVarsPath, devVars, 'utf8');
  console.log('[TOKEN-TOOL] Updated GOOGLE_REFRESH_TOKEN in .dev.vars.');
  refreshToken = newToken;
}

async function testOAuth() {
  console.log('[TOKEN-TOOL] Testing Google OAuth credentials...');
  console.log('Client ID:', clientId ? `${clientId.slice(0, 16)}...` : 'MISSING');
  console.log('Client Secret:', clientSecret ? 'PRESENT' : 'MISSING');
  console.log('Refresh Token:', refreshToken ? `${refreshToken.slice(0, 16)}...` : 'MISSING');

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('[TOKEN-TOOL] Incomplete credentials in .dev.vars');
    return;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      console.log('✅ Google OAuth SUCCESS! Fresh access token acquired.');
      console.log('Access token expires in:', data.expires_in, 'seconds');
    } else {
      console.warn('❌ Google OAuth Returned Error:', res.status, data);
      console.log('\nTo update with a fresh refresh token, run:');
      console.log('  node scripts/refresh-google-token.cjs --set-refresh-token <YOUR_NEW_TOKEN>');
    }
  } catch (err) {
    console.error('[TOKEN-TOOL] Network error:', err.message);
  }
}

testOAuth();
