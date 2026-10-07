/**
 * VAULT-01 / THE WORKSHOP TURNKEY LAUNCHER
 * Orchestrates turnkey startup across any new PC:
 * 1. Verifies dependencies
 * 2. Ensures environment variables (.dev.vars)
 * 3. Initializes local SQLite D1 database if missing
 * 4. Syncs runtime assets
 * 5. Starts Vault Manager DB service (8790) & 3D Site Server (8788)
 * 6. Launches default browser
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = __dirname;
const IS_WIN = process.platform === 'win32';
const NPM_CMD = IS_WIN ? 'npm.cmd' : 'npm';
const NPX_CMD = IS_WIN ? 'npx.cmd' : 'npx';

console.log('====================================================');
console.log('       VAULT-01 // TURNKEY SYSTEM LAUNCHER         ');
console.log('====================================================');

// 1. Verify dependencies
if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
  console.log('[SETUP] node_modules not detected. Installing dependencies (npm install)...');
  execSync(`${NPM_CMD} install`, { stdio: 'inherit', cwd: ROOT_DIR });
} else {
  console.log('[SETUP] Dependencies verified in node_modules.');
}

// 2. Ensure .dev.vars exists
const devVarsPath = path.join(ROOT_DIR, '.dev.vars');
if (!fs.existsSync(devVarsPath)) {
  console.log('[SETUP] Creating default .dev.vars for local development...');
  const defaultVars = [
    'GOOGLE_CLIENT_ID="REDACTED"',
    'GOOGLE_CLIENT_SECRET="REDACTED"',
    'GOOGLE_REFRESH_TOKEN="REDACTED"',
    'OWNER_EMAIL="bigbro211220@gmail.com"',
    'DEVICE_BINDING_SECRET="dev-only-binding-secret-change-in-production-32chars!"',
    'BIOMETRIC_KEK_V1="dev-only-biometric-kek-v1-change-in-production-32chars"',
    'VAULT_ORIGIN="http://localhost:8788"',
    ''
  ].join('\n');
  fs.writeFileSync(devVarsPath, defaultVars, 'utf-8');
}

// 3. Ensure local D1 database is initialized
const d1Dir = path.join(ROOT_DIR, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
let hasSqlite = false;
if (fs.existsSync(d1Dir)) {
  const sqliteFiles = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite'));
  if (sqliteFiles.length > 0) hasSqlite = true;
}
if (!hasSqlite) {
  console.log('[SETUP] Initializing local D1 database from schema.sql...');
  try {
    execSync(`${NPX_CMD} wrangler d1 execute WORKSHOP_DB --local --file=./functions/schema.sql`, {
      stdio: 'inherit',
      cwd: ROOT_DIR
    });
    console.log('[SETUP] Local D1 database initialized successfully.');
  } catch (e) {
    console.warn('[SETUP] D1 initialization notice:', e.message);
  }
} else {
  console.log('[SETUP] Local SQLite database verified. Ensuring all schema tables exist...');
  try {
    require('./scripts/ensure-schema.cjs');
  } catch (e) {
    console.warn('[SETUP] Schema sync notice:', e.message);
  }
}

// 4. Synchronize index.html and lab.js to dist/
try {
  const syncFiles = ['index.html', 'lab.js', 'realism.js', 'cave3.js', 'transition.js', 'about.html'];
  for (const f of syncFiles) {
    const src = path.join(ROOT_DIR, f);
    const dst = path.join(ROOT_DIR, 'dist', f);
    if (fs.existsSync(src)) {
      const srcStat = fs.statSync(src);
      const dstStat = fs.existsSync(dst) ? fs.statSync(dst) : null;
      if (!dstStat || srcStat.mtimeMs > dstStat.mtimeMs) {
        fs.copyFileSync(src, dst);
        console.log(`[SETUP] Synchronized ${f} -> dist/${f}`);
      }
    }
  }
} catch (e) {
  console.warn('[SETUP] Sync warning:', e.message);
}

// 5. Spawn services
const children = [];

console.log('[START] Spawning Private Local Database App (port 8790)...');
const dbProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'vault-manager-app.cjs')], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  env: process.env,
});
children.push(dbProcess);

console.log('[START] Spawning Cloudflare Pages Local Server (port 8788)...');
const pagesProcess = spawn(
  NPX_CMD,
  ['wrangler', 'pages', 'dev', './dist', '--d1=WORKSHOP_DB', '--kv=WORKSHOP_CACHE', '--local', '--port', '8788'],
  {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  }
);
children.push(pagesProcess);

function shutdown() {
  console.log('\n[SHUTDOWN] Terminating all child services...');
  for (const child of children) {
    try {
      if (IS_WIN) {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 6. Check readiness and launch browser
function checkReady(port, cb, retries = 60) {
  if (retries <= 0) return cb(false);
  const req = http.get(`http://127.0.0.1:${port}/`, res => {
    if (res.statusCode < 500) return cb(true);
    setTimeout(() => checkReady(port, cb, retries - 1), 500);
  });
  req.on('error', () => {
    setTimeout(() => checkReady(port, cb, retries - 1), 500);
  });
}

function openBrowser(url) {
  console.log(`[READY] Site is live at ${url}`);
  console.log(`[LAUNCH] Opening browser at ${url} ...`);
  const cmd = IS_WIN ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {}
}

checkReady(8788, ok => {
  if (ok) {
    openBrowser('http://localhost:8788');
  } else {
    console.log('[INFO] Server starting. Access manually at http://localhost:8788');
  }
});
