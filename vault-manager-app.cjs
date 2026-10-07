/**
 * VAULT-01 LOCAL DATABASE MANAGEMENT APPLICATION
 * Standalone Node.js desktop/local server connected directly to SQLite database.
 * Dedicated Port: 8790
 * Direct SQLite Engine: node:sqlite (DatabaseSync)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');

const PORT = 8790;

function resolveDatabasePath() {
  const miniflareDir = path.resolve(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (fs.existsSync(miniflareDir)) {
    const files = fs.readdirSync(miniflareDir).filter(f => f.endsWith('.sqlite'));
    if (files.length > 0) {
      const sorted = files.map(f => {
        const full = path.join(miniflareDir, f);
        return { full, size: fs.statSync(full).size };
      }).sort((a, b) => b.size - a.size);
      
      for (const item of sorted) {
        try {
          const testDb = new DatabaseSync(item.full);
          const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
          testDb.close();
          if (tables.includes('vault_users')) return item.full;
        } catch {}
      }
      return sorted[0].full;
    }
  }

  const fallbackDir = miniflareDir;
  fs.mkdirSync(fallbackDir, { recursive: true });
  const fallbackPath = path.join(fallbackDir, 'vault_local.sqlite');
  console.log(`[SQLITE] No existing D1 database found. Initializing new database at ${fallbackPath}...`);
  try {
    const bootstrapDb = new DatabaseSync(fallbackPath);
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'functions/schema.sql'), 'utf-8');
    bootstrapDb.exec(schemaSql);
    bootstrapDb.close();
    console.log('[SQLITE] Schema initialized successfully.');
    return fallbackPath;
  } catch (err) {
    console.warn('[SQLITE] Schema bootstrap fallback warning:', err.message);
    return fallbackPath;
  }
}

const DB_PATH = resolveDatabasePath();

let db;
try {
  db = new DatabaseSync(DB_PATH);
  console.log(`[SQLITE] Connected directly to site database: ${DB_PATH}`);
} catch (err) {
  console.error('[FATAL] Failed to open SQLite database:', err);
  process.exit(1);
}

// Ensure columns exist (fail-safe)
try {
  const userCols = db.prepare("PRAGMA table_info(vault_users)").all().map(c => c.name);
  if (!userCols.includes('photo_data_url')) {
    db.exec("ALTER TABLE vault_users ADD COLUMN photo_data_url TEXT;");
    console.log("[MIGRATE] Added photo_data_url to vault_users");
  }
  if (!userCols.includes('handle')) {
    db.exec("ALTER TABLE vault_users ADD COLUMN handle TEXT;");
    db.exec("UPDATE vault_users SET handle = lower(replace(display_name, ' ', '_')) WHERE handle IS NULL;");
    console.log("[MIGRATE] Added handle to vault_users");
  }
  if (!userCols.includes('role')) {
    db.exec("ALTER TABLE vault_users ADD COLUMN role TEXT DEFAULT 'OPERATIVE';");
    db.exec("UPDATE vault_users SET role = 'OPERATIVE' WHERE role IS NULL;");
    console.log("[MIGRATE] Added role to vault_users");
  }
  if (!userCols.includes('daily_quota')) {
    db.exec("ALTER TABLE vault_users ADD COLUMN daily_quota INTEGER DEFAULT 100;");
    db.exec("UPDATE vault_users SET daily_quota = 100 WHERE daily_quota IS NULL;");
    console.log("[MIGRATE] Added daily_quota to vault_users");
  }
  if (!userCols.includes('rate_limit_rpm')) {
    db.exec("ALTER TABLE vault_users ADD COLUMN rate_limit_rpm INTEGER DEFAULT 60;");
    db.exec("UPDATE vault_users SET rate_limit_rpm = 60 WHERE rate_limit_rpm IS NULL;");
    console.log("[MIGRATE] Added rate_limit_rpm to vault_users");
  }
  const devCols = db.prepare("PRAGMA table_info(vault_devices)").all().map(c => c.name);
  if (!devCols.includes('device_signals_json')) {
    db.exec("ALTER TABLE vault_devices ADD COLUMN device_signals_json TEXT;");
    console.log("[MIGRATE] Added device_signals_json to vault_devices");
  }
} catch (e) {
  console.warn("[MIGRATE] Schema check warning:", e.message);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit for photo data URLs
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  try {
    // 1. API: Stats
    if (pathname === '/api/stats' && method === 'GET') {
      const usersTotal = db.prepare("SELECT count(*) as c FROM vault_users").get().c;
      const usersActive = db.prepare("SELECT count(*) as c FROM vault_users WHERE status = 'active'").get().c;
      const usersSuspended = db.prepare("SELECT count(*) as c FROM vault_users WHERE status = 'suspended'").get().c;
      const usersRevoked = db.prepare("SELECT count(*) as c FROM vault_users WHERE status = 'revoked'").get().c;

      const devicesTotal = db.prepare("SELECT count(*) as c FROM vault_devices").get().c;
      const devicesActive = db.prepare("SELECT count(*) as c FROM vault_devices WHERE status = 'active'").get().c;

      const biometricsTotal = db.prepare("SELECT count(*) as c FROM vault_biometrics").get().c;
      const auditTotal = db.prepare("SELECT count(*) as c FROM vault_audit_log").get().c;
      const sessionsActive = db.prepare("SELECT count(*) as c FROM vault_sessions WHERE revoked_at IS NULL").get().c;

      return sendJson(res, 200, {
        success: true,
        stats: {
          users: { total: usersTotal, active: usersActive, suspended: usersSuspended, revoked: usersRevoked },
          devices: { total: devicesTotal, active: devicesActive },
          biometrics: { total: biometricsTotal },
          audit: { total: auditTotal },
          sessions: { active: sessionsActive },
          dbPath: DB_PATH,
          serverUptime: process.uptime(),
        }
      });
    }

    // 2. API: Get all users with devices & biometrics summary
    if (pathname === '/api/users' && method === 'GET') {
      const query = `
        SELECT 
          u.id, 
          u.display_name, 
          u.handle, 
          u.access_level, 
          u.status, 
          u.role, 
          u.rate_limit_rpm, 
          u.daily_quota, 
          u.created_at, 
          u.updated_at,
          u.photo_data_url,
          (SELECT count(*) FROM vault_devices d WHERE d.user_id = u.id AND d.status = 'active') AS active_device_count,
          (SELECT d.device_signals_json FROM vault_devices d WHERE d.user_id = u.id ORDER BY d.last_seen_at DESC LIMIT 1) AS latest_device_signals,
          (SELECT d.id FROM vault_devices d WHERE d.user_id = u.id ORDER BY d.last_seen_at DESC LIMIT 1) AS latest_device_id,
          (SELECT d.device_binding_hash FROM vault_devices d WHERE d.user_id = u.id ORDER BY d.last_seen_at DESC LIMIT 1) AS latest_binding_hash,
          (SELECT d.webauthn_credential_id FROM vault_devices d WHERE d.user_id = u.id ORDER BY d.last_seen_at DESC LIMIT 1) AS latest_webauthn_id,
          (SELECT b.template_version FROM vault_biometrics b WHERE b.user_id = u.id LIMIT 1) AS biometric_version,
          (SELECT b.created_at FROM vault_biometrics b WHERE b.user_id = u.id LIMIT 1) AS biometric_enrolled_at
        FROM vault_users u
        ORDER BY u.updated_at DESC, u.created_at DESC
      `;
      const users = db.prepare(query).all().map(row => {
        let parsedSignals = null;
        if (row.latest_device_signals) {
          try {
            parsedSignals = JSON.parse(row.latest_device_signals);
          } catch (e) {}
        }
        return {
          id: row.id,
          displayName: row.display_name,
          handle: row.handle,
          accessLevel: row.access_level,
          status: row.status,
          role: row.role,
          rateLimitRpm: row.rate_limit_rpm,
          dailyQuota: row.daily_quota,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          photoDataUrl: row.photo_data_url || null,
          activeDeviceCount: row.active_device_count,
          hasBiometrics: row.biometric_version != null,
          biometricVersion: row.biometric_version,
          biometricEnrolledAt: row.biometric_enrolled_at,
          latestDevice: row.latest_device_id ? {
            id: row.latest_device_id,
            bindingHash: row.latest_binding_hash,
            webauthnId: row.latest_webauthn_id,
            signals: parsedSignals
          } : null
        };
      });

      return sendJson(res, 200, { success: true, count: users.length, users });
    }

    // 3. API: Get single user details
    if (pathname.startsWith('/api/users/') && method === 'GET') {
      const userId = pathname.replace('/api/users/', '');
      const user = db.prepare("SELECT * FROM vault_users WHERE id = ?").get(userId);
      if (!user) {
        return sendJson(res, 404, { success: false, error: 'User not found' });
      }

      const devices = db.prepare("SELECT * FROM vault_devices WHERE user_id = ? ORDER BY last_seen_at DESC").all().map(d => {
        let signals = null;
        if (d.device_signals_json) {
          try { signals = JSON.parse(d.device_signals_json); } catch (e) {}
        }
        return { ...d, device_signals: signals };
      });

      const biometrics = db.prepare("SELECT user_id, template_version, encryption_key_version, source_type, created_at, updated_at FROM vault_biometrics WHERE user_id = ?").all();
      const recentAudit = db.prepare("SELECT * FROM vault_audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all();

      return sendJson(res, 200, {
        success: true,
        user,
        devices,
        biometrics,
        audit: recentAudit
      });
    }

    // 4. API: Update user operative
    if (pathname === '/api/users/update' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { id, displayName, accessLevel, role, status, dailyQuota, photoDataUrl } = body;
      if (!id) {
        return sendJson(res, 400, { success: false, error: 'User ID is required' });
      }

      const existing = db.prepare("SELECT * FROM vault_users WHERE id = ?").get(id);
      if (!existing) {
        return sendJson(res, 404, { success: false, error: 'User not found' });
      }

      const newName = displayName !== undefined ? displayName : existing.display_name;
      let newLevel = accessLevel !== undefined ? accessLevel : existing.access_level;
      if (newLevel === 'TOP_SECRET') newLevel = 'OWNER';
      else if (newLevel === 'RESTRICTED') newLevel = 'TRUSTED';
      else if (newLevel === 'CONFIDENTIAL') newLevel = 'GUEST';
      else if (newLevel === 'UNCLASSIFIED') newLevel = 'VISITOR';
      if (!['VISITOR','GUEST','TRUSTED','OWNER'].includes(newLevel)) newLevel = existing.access_level;

      const newRole = role !== undefined ? role : (existing.role || 'OPERATIVE');
      let newStatus = status !== undefined ? status : existing.status;
      if (newStatus === 'revoked') newStatus = 'deleted';
      if (!['active','suspended','deleted'].includes(newStatus)) newStatus = existing.status;

      const newQuota = dailyQuota !== undefined ? parseInt(dailyQuota, 10) : (existing.daily_quota || 100);
      const newPhoto = photoDataUrl !== undefined ? photoDataUrl : existing.photo_data_url;
      const now = Math.floor(Date.now() / 1000);

      db.prepare(`
        UPDATE vault_users
        SET display_name = ?, access_level = ?, role = ?, status = ?, daily_quota = ?, photo_data_url = ?, updated_at = ?
        WHERE id = ?
      `).run(newName, newLevel, newRole, newStatus, newQuota, newPhoto, now, id);

      // Audit log entry
      try {
        const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO vault_audit_log (id, user_id, event, result, created_at, metadata)
          VALUES (?, ?, 'USER_UPDATED', 'SUCCESS', ?, ?)
        `).run(auditId, id, now, JSON.stringify({ updatedBy: 'LOCAL_DB_APP', changes: { displayName: newName, accessLevel: newLevel, role: newRole, status: newStatus } }));
      } catch (e) {}

      return sendJson(res, 200, { success: true, message: 'Operative updated successfully' });
    }

    // 5. API: Create / Provision user
    if (pathname === '/api/users/create' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { displayName, handle, accessLevel, role, dailyQuota, photoDataUrl } = body;
      if (!displayName) {
        return sendJson(res, 400, { success: false, error: 'Display name is required' });
      }

      const id = 'usr_' + crypto.randomBytes(6).toString('base64url');
      const normalizedHandle = handle || displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 16);
      let level = accessLevel || 'TRUSTED';
      if (level === 'TOP_SECRET') level = 'OWNER';
      else if (level === 'RESTRICTED') level = 'TRUSTED';
      else if (level === 'CONFIDENTIAL') level = 'GUEST';
      else if (level === 'UNCLASSIFIED') level = 'VISITOR';
      if (!['VISITOR','GUEST','TRUSTED','OWNER'].includes(level)) level = 'TRUSTED';

      const userRole = role || 'OPERATIVE';
      const quota = dailyQuota ? parseInt(dailyQuota, 10) : 100;
      const now = Math.floor(Date.now() / 1000);

      db.prepare(`
        INSERT INTO vault_users (id, display_name, handle, access_level, status, role, daily_quota, created_at, updated_at, photo_data_url)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
      `).run(id, displayName, normalizedHandle, level, userRole, quota, now, now, photoDataUrl || null);

      // Create initial synthetic device with rich signals
      const devId = 'dev_' + crypto.randomBytes(6).toString('base64url');
      const bindingHash = crypto.randomBytes(32).toString('base64');
      const webauthnId = 'cred-' + Date.now() + '-' + Math.floor(Math.random() * 9000 + 1000);
      const syntheticSignals = JSON.stringify({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        platform: "Win32",
        hardwareConcurrency: 16,
        screenColorDepth: 24,
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        canvasHash: "cv_" + crypto.randomBytes(8).toString('hex'),
        webauthnAuthenticator: "Platform TPM 2.0 / Windows Hello",
        bindingHash
      });

      db.prepare(`
        INSERT INTO vault_devices (id, user_id, device_binding_hash, webauthn_credential_id, webauthn_public_key, sign_count, status, first_seen_at, last_seen_at, last_ip_hash, webauthn_alg, device_signals_json)
        VALUES (?, ?, ?, ?, 'synth-key', 0, 'active', ?, ?, '127.0.0.1-local-hash', -7, ?)
      `).run(devId, id, bindingHash, webauthnId, now, now, syntheticSignals);

      // Audit log entry
      try {
        const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO vault_audit_log (id, user_id, device_id, event, result, created_at, metadata)
          VALUES (?, ?, ?, 'USER_PROVISIONED', 'SUCCESS', ?, ?)
        `).run(auditId, id, devId, now, JSON.stringify({ provisionedBy: 'LOCAL_DB_APP', displayName }));
      } catch (e) {}

      return sendJson(res, 201, {
        success: true,
        message: 'Operative provisioned successfully',
        user: { id, displayName, handle: normalizedHandle, accessLevel: level, role: userRole }
      });
    }

    // 6. API: Delete / Revoke user
    if (pathname === '/api/users/delete' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { id, permanent } = body;
      if (!id) {
        return sendJson(res, 400, { success: false, error: 'User ID is required' });
      }

      const now = Math.floor(Date.now() / 1000);
      if (permanent === true) {
        db.prepare("DELETE FROM vault_biometrics WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM vault_devices WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM vault_sessions WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM vault_users WHERE id = ?").run(id);
      } else {
        db.prepare("UPDATE vault_users SET status = 'deleted', updated_at = ? WHERE id = ?").run(now, id);
        db.prepare("UPDATE vault_devices SET status = 'revoked' WHERE user_id = ?").run(id);
        db.prepare("UPDATE vault_sessions SET revoked_at = ? WHERE user_id = ?").run(now, id);
      }

      // Audit log
      try {
        const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO vault_audit_log (id, user_id, event, result, created_at, metadata)
          VALUES (?, ?, 'USER_REVOKED', 'SUCCESS', ?, ?)
        `).run(auditId, id, now, JSON.stringify({ revokedBy: 'LOCAL_DB_APP', permanent: Boolean(permanent) }));
      } catch (e) {}

      return sendJson(res, 200, { success: true, message: permanent ? 'Operative permanently deleted' : 'Operative revoked' });
    }

    // 7. API: Get all devices
    if (pathname === '/api/devices' && method === 'GET') {
      const query = `
        SELECT 
          d.*,
          u.display_name,
          u.handle,
          u.access_level
        FROM vault_devices d
        LEFT JOIN vault_users u ON d.user_id = u.id
        ORDER BY d.last_seen_at DESC
      `;
      const devices = db.prepare(query).all().map(d => {
        let signals = null;
        if (d.device_signals_json) {
          try { signals = JSON.parse(d.device_signals_json); } catch (e) {}
        }
        return {
          id: d.id,
          userId: d.user_id,
          displayName: d.display_name || 'UNASSIGNED',
          handle: d.handle,
          accessLevel: d.access_level,
          bindingHash: d.device_binding_hash,
          webauthnId: d.webauthn_credential_id,
          signCount: d.sign_count,
          status: d.status,
          firstSeenAt: d.first_seen_at,
          lastSeenAt: d.last_seen_at,
          lastIpHash: d.last_ip_hash,
          signals: signals
        };
      });

      return sendJson(res, 200, { success: true, count: devices.length, devices });
    }

    // 8. API: Get biometrics list
    if (pathname === '/api/biometrics' && method === 'GET') {
      const query = `
        SELECT 
          b.user_id,
          b.template_version,
          b.encryption_key_version,
          b.source_type,
          b.created_at,
          b.updated_at,
          b.template_iv,
          u.display_name,
          u.access_level,
          u.photo_data_url
        FROM vault_biometrics b
        LEFT JOIN vault_users u ON b.user_id = u.id
        ORDER BY b.created_at DESC
      `;
      const biometrics = db.prepare(query).all();
      return sendJson(res, 200, { success: true, count: biometrics.length, biometrics });
    }

    // 9. API: Get audit log
    if (pathname === '/api/audit' && method === 'GET') {
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '50', 10);
      const query = `
        SELECT 
          a.*,
          u.display_name
        FROM vault_audit_log a
        LEFT JOIN vault_users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT ?
      `;
      const logs = db.prepare(query).all(limit);
      return sendJson(res, 200, { success: true, count: logs.length, logs });
    }

    // 10. API: SQL Workbench Execute
    if (pathname === '/api/sql' && method === 'POST') {
      const body = await parseJsonBody(req);
      const sql = (body.query || '').trim();
      if (!sql) {
        return sendJson(res, 400, { success: false, error: 'SQL query is required' });
      }

      // Safety check: only allow SELECT or PRAGMA unless explicitly unlocked
      const upper = sql.toUpperCase();
      const isReadOnly = upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('EXPLAIN');
      if (!isReadOnly && !body.allowWrites) {
        return sendJson(res, 403, { success: false, error: 'Write queries require allowWrites=true flag for safety.' });
      }

      const t0 = performance.now();
      try {
        if (isReadOnly) {
          const stmt = db.prepare(sql);
          const rows = stmt.all();
          const durationMs = (performance.now() - t0).toFixed(2);
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          return sendJson(res, 200, { success: true, durationMs, rowCount: rows.length, columns, rows });
        } else {
          db.exec(sql);
          const durationMs = (performance.now() - t0).toFixed(2);
          return sendJson(res, 200, { success: true, durationMs, message: 'Executed successfully' });
        }
      } catch (sqlErr) {
        return sendJson(res, 400, { success: false, error: sqlErr.message });
      }
    }

    // 11. Root Application Web Interface
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderDashboardHtml());
    }

    // 404 handler
    sendJson(res, 404, { success: false, error: 'Endpoint not found' });
  } catch (err) {
    console.error('[HTTP ERROR]', err);
    sendJson(res, 500, { success: false, error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🔒 VAULT-01 LOCAL DATABASE APP IS ACTIVE (LOOPBACK ONLY)`);
  console.log(`🔗 Local URL:   http://127.0.0.1:${PORT}`);
  console.log(`📁 Connected:   ${DB_PATH}`);
  console.log(`🛡️ Access:      STRICT PERSONAL LOCAL MACHINE ONLY`);
  console.log(`======================================================\n`);
});

// HTML Generation for Cybernetic UI Dashboard
function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VAULT-01 · Local Database Commander</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Orbitron:wght@600;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-dark: #03070d;
    --bg-card: rgba(6, 18, 30, 0.85);
    --bg-card-hover: rgba(10, 26, 44, 0.95);
    --border: #143547;
    --border-highlight: #00f0ff;
    --cyan: #00f0ff;
    --cyan-dim: rgba(0, 240, 255, 0.15);
    --green: #4dff8a;
    --green-dim: rgba(77, 255, 138, 0.15);
    --amber: #ffd166;
    --amber-dim: rgba(255, 209, 102, 0.15);
    --red: #ff5555;
    --red-dim: rgba(255, 85, 85, 0.15);
    --text: #c2e2ec;
    --text-dim: #628fa1;
    --text-bright: #ffffff;
    --font-code: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    --font-heading: 'Orbitron', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: var(--bg-dark);
    color: var(--text);
    font-family: var(--font-code);
    font-size: 13px;
    line-height: 1.5;
    overflow-x: hidden;
    min-height: 100vh;
    background-image: 
      radial-gradient(circle at 15% 15%, rgba(0, 240, 255, 0.05) 0%, transparent 40%),
      radial-gradient(circle at 85% 85%, rgba(77, 255, 138, 0.04) 0%, transparent 45%),
      linear-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 240, 255, 0.02) 1px, transparent 1px);
    background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px;
  }
  a { color: var(--cyan); text-decoration: none; }
  button { font-family: inherit; cursor: pointer; }

  /* Top Navigation Bar */
  header {
    background: rgba(3, 10, 18, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1.5px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .brand-group {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-title {
    font-family: var(--font-heading);
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-title .shield {
    color: var(--cyan);
    font-size: 20px;
    text-shadow: 0 0 12px var(--cyan);
  }
  .engine-badge {
    background: rgba(77, 255, 138, 0.12);
    border: 1px solid var(--green);
    color: var(--green);
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .engine-badge .pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: pulse 1.8s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .btn-action {
    background: var(--cyan-dim);
    border: 1.5px solid var(--cyan);
    color: var(--cyan);
    border-radius: 4px;
    padding: 7px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.18s ease;
  }
  .btn-action:hover {
    background: var(--cyan);
    color: #030a12;
    box-shadow: 0 0 16px var(--cyan);
  }
  .btn-site-link {
    background: rgba(255, 209, 102, 0.15);
    border-color: var(--amber);
    color: var(--amber);
  }
  .btn-site-link:hover {
    background: var(--amber);
    color: #030a12;
    box-shadow: 0 0 16px var(--amber);
  }

  /* Main Container */
  .container {
    max-width: 1480px;
    margin: 0 auto;
    padding: 24px;
  }

  /* Key Metrics Cards */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .metric-card:hover {
    border-color: var(--border-highlight);
  }
  .metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--cyan);
  }
  .metric-card.green::before { background: var(--green); }
  .metric-card.amber::before { background: var(--amber); }
  .metric-card.red::before { background: var(--red); }
  .metric-label {
    font-size: 10.5px;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .metric-val {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    font-family: var(--font-heading);
    letter-spacing: 0.05em;
  }
  .metric-sub {
    font-size: 11px;
    color: var(--text-dim);
  }

  /* Navigation Tabs */
  .tabs-nav {
    display: flex;
    border-bottom: 1.5px solid var(--border);
    margin-bottom: 24px;
    gap: 4px;
    overflow-x: auto;
  }
  .tab-btn {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-dim);
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .tab-btn:hover {
    color: var(--cyan);
  }
  .tab-btn.active {
    color: var(--cyan);
    border-bottom-color: var(--cyan);
    background: var(--cyan-dim);
  }

  /* Controls Bar (Search & Filter) */
  .controls-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    background: rgba(6, 18, 30, 0.6);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 16px;
  }
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 260px;
  }
  .search-input {
    background: rgba(3, 10, 18, 0.9);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: #fff;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 12px;
    width: 100%;
    outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .filter-label {
    font-size: 11px;
    color: var(--text-dim);
    font-weight: 600;
  }
  .filter-select {
    background: rgba(3, 10, 18, 0.9);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 7px 10px;
    font-family: inherit;
    font-size: 11px;
    outline: none;
  }
  .view-toggle-btn {
    background: rgba(8, 24, 38, 0.8);
    border: 1px solid var(--border);
    color: var(--text-dim);
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .view-toggle-btn.active {
    background: var(--cyan-dim);
    border-color: var(--cyan);
    color: var(--cyan);
  }

  /* Operatives Grid View */
  .operatives-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    gap: 20px;
  }
  .op-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: all 0.2s ease;
    position: relative;
  }
  .op-card:hover {
    border-color: var(--cyan);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 240, 255, 0.12);
  }
  .op-card-header {
    display: flex;
    gap: 14px;
    padding: 16px;
    border-bottom: 1px solid rgba(20, 53, 71, 0.6);
  }
  .op-avatar-wrap {
    position: relative;
    width: 68px;
    height: 68px;
    border-radius: 6px;
    overflow: hidden;
    border: 1.5px solid var(--cyan);
    background: #020810;
    flex-shrink: 0;
    cursor: pointer;
  }
  .op-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .op-avatar-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 240, 255, 0.15);
    pointer-events: none;
  }
  .op-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    overflow: hidden;
  }
  .op-name {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .op-handle {
    font-size: 11px;
    color: var(--cyan);
    font-weight: 600;
  }
  .op-id {
    font-size: 9.5px;
    color: var(--text-dim);
    letter-spacing: 0.05em;
  }
  .op-card-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }
  .op-badge-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .badge {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 7px;
    border-radius: 3px;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .badge-top-secret { background: rgba(255, 85, 85, 0.2); border: 1px solid var(--red); color: #ff8888; }
  .badge-restricted { background: rgba(255, 209, 102, 0.2); border: 1px solid var(--amber); color: #ffe199; }
  .badge-confidential { background: rgba(0, 240, 255, 0.2); border: 1px solid var(--cyan); color: #80f4ff; }
  .badge-guest { background: rgba(140, 160, 180, 0.2); border: 1px solid #708090; color: #c0d0e0; }
  .badge-active { background: rgba(77, 255, 138, 0.15); border: 1px solid var(--green); color: var(--green); }
  .badge-suspended { background: rgba(255, 209, 102, 0.15); border: 1px solid var(--amber); color: var(--amber); }
  .badge-revoked { background: rgba(255, 85, 85, 0.15); border: 1px solid var(--red); color: var(--red); }

  /* Device Telemetry Box in Card */
  .device-telemetry-box {
    background: rgba(3, 12, 22, 0.7);
    border: 1px solid #102a3a;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .telemetry-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .telemetry-key { color: var(--text-dim); }
  .telemetry-val { color: #fff; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }

  .op-card-actions {
    padding: 10px 16px;
    background: rgba(4, 14, 24, 0.9);
    border-top: 1px solid rgba(20, 53, 71, 0.6);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  }
  .btn-sm {
    background: rgba(8, 28, 44, 0.8);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 4px;
    padding: 5px 9px;
    font-size: 10.5px;
    font-weight: 600;
    transition: all 0.15s;
  }
  .btn-sm:hover {
    border-color: var(--cyan);
    color: #fff;
    background: var(--cyan-dim);
  }
  .btn-sm-danger { border-color: rgba(255, 85, 85, 0.4); color: #ff8888; }
  .btn-sm-danger:hover { background: var(--red-dim); border-color: var(--red); color: #fff; }

  /* Data Table View */
  .table-wrap {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 11.5px;
  }
  th {
    background: rgba(4, 16, 28, 0.95);
    color: var(--text-dim);
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 12px 14px;
    border-bottom: 1.5px solid var(--border);
    text-transform: uppercase;
  }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(20, 53, 71, 0.4);
    vertical-align: middle;
  }
  tr:hover td {
    background: rgba(0, 240, 255, 0.03);
  }
  .tbl-avatar {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid var(--cyan);
  }

  /* Modal System */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(1, 4, 8, 0.85);
    backdrop-filter: blur(8px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  .modal-overlay.active {
    display: flex;
  }
  .modal-box {
    background: #061523;
    border: 1.5px solid var(--cyan);
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 0 40px rgba(0, 240, 255, 0.25);
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-title {
    font-family: var(--font-heading);
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.08em;
  }
  .modal-close {
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
  }
  .modal-close:hover { color: #fff; }
  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-dim);
    letter-spacing: 0.05em;
  }
  .form-input, .form-select {
    background: rgba(3, 10, 18, 0.9);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: #fff;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 12px;
    outline: none;
  }
  .form-input:focus, .form-select:focus {
    border-color: var(--cyan);
  }
  .photo-preview-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(3, 12, 22, 0.6);
    border: 1px dashed var(--border);
    padding: 12px;
    border-radius: 6px;
  }
  .photo-preview-img {
    width: 72px;
    height: 72px;
    border-radius: 6px;
    object-fit: cover;
    border: 1.5px solid var(--cyan);
  }

  /* SQL Tab Elements */
  .sql-editor-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sql-textarea {
    width: 100%;
    height: 120px;
    background: rgba(2, 8, 16, 0.95);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px;
    color: var(--cyan);
    font-family: var(--font-code);
    font-size: 13px;
    outline: none;
    resize: vertical;
  }
  .sql-textarea:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
  }
  .sql-presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* Footer */
  footer {
    padding: 24px;
    text-align: center;
    font-size: 11px;
    color: var(--text-dim);
    border-top: 1px solid var(--border);
    margin-top: 40px;
  }
</style>
</head>
<body>

<header>
  <div class="brand-group">
    <div class="brand-title">
      <span class="shield">🛡️</span> VAULT-01 // DB COMMANDER
    </div>
    <div class="engine-badge">
      <span class="pulse"></span> DIRECT SQLITE CONNECTED
    </div>
  </div>
  <div class="header-actions">
    <button class="btn-action" onclick="openProvisionModal()">
      <span>+</span> PROVISION OPERATIVE
    </button>
    <button class="btn-action" onclick="loadAllData()">
      <span>↻</span> REFRESH
    </button>
    <a href="http://127.0.0.1:8788/" target="_blank" class="btn-action btn-site-link">
      <span>⚡</span> LAUNCH 3D VAULT (8788) ↗
    </a>
  </div>
</header>

<div class="container">
  <!-- Key Metrics Row -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Registered Operatives</div>
      <div class="metric-val" id="m-users">--</div>
      <div class="metric-sub" id="m-users-sub">Loading directory...</div>
    </div>
    <div class="metric-card green">
      <div class="metric-label">Hardware Bound Devices</div>
      <div class="metric-val" id="m-devices">--</div>
      <div class="metric-sub" id="m-devices-sub">TPM & Browser Bindings</div>
    </div>
    <div class="metric-card amber">
      <div class="metric-label">128-D Biometric Templates</div>
      <div class="metric-val" id="m-biometrics">--</div>
      <div class="metric-sub">AES-GCM-256 Encrypted</div>
    </div>
    <div class="metric-card red">
      <div class="metric-label">Audit Log Events</div>
      <div class="metric-val" id="m-audit">--</div>
      <div class="metric-sub">DPDP-2026 Statutory Log</div>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="tabs-nav">
    <button class="tab-btn active" onclick="switchTab('operatives')">👥 OPERATIVES DIRECTORY (<span id="tab-count-ops">0</span>)</button>
    <button class="tab-btn" onclick="switchTab('devices')">💻 HARDWARE & DEVICE FINGERPRINTS (<span id="tab-count-devs">0</span>)</button>
    <button class="tab-btn" onclick="switchTab('biometrics')">🧬 BIOMETRIC ENROLLMENTS (<span id="tab-count-bio">0</span>)</button>
    <button class="tab-btn" onclick="switchTab('audit')">📜 AUDIT STREAM</button>
    <button class="tab-btn" onclick="switchTab('sql')">⚡ SQL WORKBENCH</button>
  </div>

  <!-- Tab 1: Operatives Directory -->
  <div id="tab-operatives" class="tab-content">
    <div class="controls-bar">
      <div class="search-wrap">
        <span>🔍</span>
        <input type="text" id="op-search" class="search-input" placeholder="Search by name, handle, user ID, clearance..." oninput="renderOperatives()">
      </div>
      <div class="filter-group">
        <span class="filter-label">Clearance:</span>
        <select id="op-filter-clearance" class="filter-select" onchange="renderOperatives()">
          <option value="ALL">ALL CLEARANCES</option>
          <option value="TOP_SECRET">TOP_SECRET</option>
          <option value="RESTRICTED">RESTRICTED</option>
          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
          <option value="UNCLASSIFIED">UNCLASSIFIED</option>
        </select>
        <span class="filter-label">Status:</span>
        <select id="op-filter-status" class="filter-select" onchange="renderOperatives()">
          <option value="ALL">ALL STATUSES</option>
          <option value="active">ACTIVE</option>
          <option value="suspended">SUSPENDED</option>
          <option value="revoked">REVOKED</option>
        </select>
        <button id="btn-view-grid" class="view-toggle-btn active" onclick="setViewMode('grid')">▦ GRID</button>
        <button id="btn-view-table" class="view-toggle-btn" onclick="setViewMode('table')">☰ TABLE</button>
      </div>
    </div>

    <div id="operatives-container">
      <!-- Populated dynamically -->
    </div>
  </div>

  <!-- Tab 2: Devices & Fingerprints -->
  <div id="tab-devices" class="tab-content" style="display: none;">
    <div class="controls-bar">
      <div class="search-wrap">
        <span>🔍</span>
        <input type="text" id="dev-search" class="search-input" placeholder="Search devices by ID, user, platform, canvas hash..." oninput="renderDevices()">
      </div>
      <div class="filter-group">
        <span class="filter-label">Status:</span>
        <select id="dev-filter-status" class="filter-select" onchange="renderDevices()">
          <option value="ALL">ALL STATUSES</option>
          <option value="active">ACTIVE</option>
          <option value="revoked">REVOKED</option>
        </select>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Operative</th>
            <th>Platform / OS</th>
            <th>CPU Cores</th>
            <th>Screen & Color</th>
            <th>Timezone</th>
            <th>Canvas Hash</th>
            <th>Binding Hash (SHA-256)</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="devices-table-body">
          <!-- Populated dynamically -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Tab 3: Biometrics -->
  <div id="tab-biometrics" class="tab-content" style="display: none;">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Operative Name</th>
            <th>User ID</th>
            <th>Template Version</th>
            <th>Encryption</th>
            <th>IV (Base64)</th>
            <th>Source</th>
            <th>Enrolled At</th>
          </tr>
        </thead>
        <tbody id="biometrics-table-body">
          <!-- Populated dynamically -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Tab 4: Audit Stream -->
  <div id="tab-audit" class="tab-content" style="display: none;">
    <div class="controls-bar">
      <span class="filter-label">Latest 50 Statutory Audit Events</span>
      <button class="btn-sm" onclick="loadAuditData()">↻ REFRESH AUDIT STREAM</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event</th>
            <th>Result</th>
            <th>Operative</th>
            <th>Device ID</th>
            <th>IP Hash</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody id="audit-table-body">
          <!-- Populated dynamically -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Tab 5: SQL Workbench -->
  <div id="tab-sql" class="tab-content" style="display: none;">
    <div class="sql-editor-wrap">
      <div class="sql-presets">
        <span class="filter-label">PRESET QUERIES:</span>
        <button class="btn-sm" onclick="setSqlPreset('SELECT id, display_name, handle, access_level, status, created_at FROM vault_users ORDER BY updated_at DESC LIMIT 20;')">Users</button>
        <button class="btn-sm" onclick="setSqlPreset('SELECT id, user_id, device_binding_hash, status, last_seen_at FROM vault_devices LIMIT 20;')">Devices</button>
        <button class="btn-sm" onclick="setSqlPreset('SELECT user_id, template_version, encryption_key_version, created_at FROM vault_biometrics LIMIT 20;')">Biometrics</button>
        <button class="btn-sm" onclick="setSqlPreset('SELECT event, result, count(*) as count FROM vault_audit_log GROUP BY event, result ORDER BY count DESC;')">Audit Summary</button>
        <button class="btn-sm" onclick="setSqlPreset('SELECT name FROM sqlite_master WHERE type=\\'table\\';')">Schema Tables</button>
      </div>
      <textarea id="sql-query-input" class="sql-textarea" placeholder="Enter SQL query (SELECT ...)"></textarea>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button class="btn-action" onclick="executeSql()">⚡ EXECUTE QUERY</button>
        <span id="sql-status" style="color: var(--cyan); font-size: 11px;">Ready</span>
      </div>
      <div class="table-wrap" id="sql-results-wrap" style="display: none; margin-top: 14px;">
        <table id="sql-results-table">
          <thead id="sql-results-head"></thead>
          <tbody id="sql-results-body"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Edit Operative -->
<div id="modal-edit" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <div class="modal-title">EDIT OPERATIVE PROFILE</div>
      <button class="modal-close" onclick="closeModal('modal-edit')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="edit-id">
      
      <div class="photo-preview-wrap">
        <img id="edit-photo-preview" class="photo-preview-img" src="" alt="Avatar">
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div class="form-label">OPERATIVE BIOMETRIC PORTRAIT</div>
          <input type="file" id="edit-photo-file" accept="image/*" style="font-size:11px;" onchange="handlePhotoUpload(event, 'edit-photo-preview')">
          <button type="button" class="btn-sm" onclick="generateCyberneticPhoto('edit-photo-preview', document.getElementById('edit-name').value)">⚡ Generate Cyber Portrait</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">DISPLAY NAME</label>
        <input type="text" id="edit-name" class="form-input" required>
      </div>

      <div class="form-group">
        <label class="form-label">CLEARANCE LEVEL</label>
        <select id="edit-level" class="form-select">
          <option value="TOP_SECRET">TOP_SECRET</option>
          <option value="RESTRICTED">RESTRICTED</option>
          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
          <option value="UNCLASSIFIED">UNCLASSIFIED</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">SYSTEM ROLE</label>
        <input type="text" id="edit-role" class="form-input">
      </div>

      <div class="form-group">
        <label class="form-label">ACCOUNT STATUS</label>
        <select id="edit-status" class="form-select">
          <option value="active">ACTIVE</option>
          <option value="suspended">SUSPENDED</option>
          <option value="revoked">REVOKED</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">DAILY ACCESS QUOTA</label>
        <input type="number" id="edit-quota" class="form-input" min="1" max="10000">
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn-sm" onclick="closeModal('modal-edit')">CANCEL</button>
        <button class="btn-action" onclick="saveOperativeChanges()">SAVE CHANGES</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Provision New Operative -->
<div id="modal-provision" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <div class="modal-title">+ PROVISION NEW OPERATIVE</div>
      <button class="modal-close" onclick="closeModal('modal-provision')">✕</button>
    </div>
    <div class="modal-body">
      <div class="photo-preview-wrap">
        <img id="prov-photo-preview" class="photo-preview-img" src="" alt="Avatar">
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div class="form-label">BIOMETRIC PHOTO</div>
          <input type="file" id="prov-photo-file" accept="image/*" style="font-size:11px;" onchange="handlePhotoUpload(event, 'prov-photo-preview')">
          <button type="button" class="btn-sm" onclick="generateCyberneticPhoto('prov-photo-preview', document.getElementById('prov-name').value || 'New Operative')">⚡ Generate Cyber Portrait</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">DISPLAY NAME *</label>
        <input type="text" id="prov-name" class="form-input" placeholder="e.g. Elena Vance" required>
      </div>

      <div class="form-group">
        <label class="form-label">HANDLE / CALLSIGN</label>
        <input type="text" id="prov-handle" class="form-input" placeholder="e.g. elena_vance">
      </div>

      <div class="form-group">
        <label class="form-label">CLEARANCE LEVEL</label>
        <select id="prov-level" class="form-select">
          <option value="RESTRICTED" selected>RESTRICTED</option>
          <option value="TOP_SECRET">TOP_SECRET</option>
          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
          <option value="UNCLASSIFIED">UNCLASSIFIED</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">ROLE</label>
        <select id="prov-role" class="form-select">
          <option value="OPERATIVE" selected>OPERATIVE</option>
          <option value="ARCHITECT">ARCHITECT</option>
          <option value="COMMANDER">COMMANDER</option>
          <option value="SPECIALIST">SPECIALIST</option>
          <option value="GUEST">GUEST</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">DAILY ACCESS QUOTA</label>
        <input type="number" id="prov-quota" class="form-input" value="100" min="1" max="10000">
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn-sm" onclick="closeModal('modal-provision')">CANCEL</button>
        <button class="btn-action" onclick="submitProvisionOperative()">PROVISION IDENTITY</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Device Signals Inspector -->
<div id="modal-signals" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <div class="modal-title">DEVICE FINGERPRINT TELEMETRY</div>
      <button class="modal-close" onclick="closeModal('modal-signals')">✕</button>
    </div>
    <div class="modal-body">
      <pre id="signals-json-view" style="background:#02060c; border:1px solid var(--border); padding:12px; border-radius:6px; color:var(--cyan); font-size:11px; max-height:400px; overflow:auto;"></pre>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn-sm" onclick="copySignalsJson()">COPY JSON</button>
        <button class="btn-action" onclick="closeModal('modal-signals')">CLOSE</button>
      </div>
    </div>
  </div>
</div>

<footer>
  VAULT-01 LOCAL DATABASE APP · CONNECTED DIRECTLY TO SQLITE · ALL RIGHTS RESERVED
</footer>

<script>
let state = {
  users: [],
  devices: [],
  biometrics: [],
  audit: [],
  stats: {},
  viewMode: 'grid',
  activeTab: 'operatives'
};

async function loadAllData() {
  try {
    const [statsRes, usersRes, devsRes, bioRes] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
      fetch('/api/biometrics').then(r => r.json())
    ]);

    if (statsRes.success) {
      state.stats = statsRes.stats;
      document.getElementById('m-users').textContent = state.stats.users.total;
      document.getElementById('m-users-sub').textContent = state.stats.users.active + ' Active · ' + state.stats.users.revoked + ' Revoked';
      document.getElementById('m-devices').textContent = state.stats.devices.total;
      document.getElementById('m-biometrics').textContent = state.stats.biometrics.total;
      document.getElementById('m-audit').textContent = state.stats.audit.total;
    }

    if (usersRes.success) {
      state.users = usersRes.users;
      document.getElementById('tab-count-ops').textContent = state.users.length;
      renderOperatives();
    }

    if (devsRes.success) {
      state.devices = devsRes.devices;
      document.getElementById('tab-count-devs').textContent = state.devices.length;
      renderDevices();
    }

    if (bioRes.success) {
      state.biometrics = bioRes.biometrics;
      document.getElementById('tab-count-bio').textContent = state.biometrics.length;
      renderBiometrics();
    }
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

  event.target.classList.add('active');
  document.getElementById('tab-' + tabId).style.display = 'block';

  if (tabId === 'audit') loadAuditData();
}

function setViewMode(mode) {
  state.viewMode = mode;
  document.getElementById('btn-view-grid').classList.toggle('active', mode === 'grid');
  document.getElementById('btn-view-table').classList.toggle('active', mode === 'table');
  renderOperatives();
}

function renderOperatives() {
  const container = document.getElementById('operatives-container');
  const search = (document.getElementById('op-search').value || '').toLowerCase();
  const clearance = document.getElementById('op-filter-clearance').value;
  const status = document.getElementById('op-filter-status').value;

  const filtered = state.users.filter(u => {
    const matchesSearch = !search || 
      (u.displayName && u.displayName.toLowerCase().includes(search)) ||
      (u.handle && u.handle.toLowerCase().includes(search)) ||
      (u.id && u.id.toLowerCase().includes(search)) ||
      (u.role && u.role.toLowerCase().includes(search));
    const matchesClearance = clearance === 'ALL' || u.accessLevel === clearance;
    const matchesStatus = status === 'ALL' || u.status === status;
    return matchesSearch && matchesClearance && matchesStatus;
  });

  if (state.viewMode === 'grid') {
    container.innerHTML = \`
      <div class="operatives-grid">
        \${filtered.map(u => {
          const photo = u.photoDataUrl || getFallbackAvatar(u.displayName);
          const dev = u.latestDevice;
          const signals = dev ? dev.signals : null;
          const devSummary = signals ? \`\${signals.platform || 'Win32'} · \${signals.hardwareConcurrency || 8} Cores\` : (u.activeDeviceCount > 0 ? \`\${u.activeDeviceCount} Active Device(s)\` : 'No Bound Device');
          const canvasHash = signals ? signals.canvasHash || 'cv_gen' : (dev ? dev.bindingHash?.slice(0, 14) : 'N/A');

          return \`
            <div class="op-card" id="card-\${u.id}">
              <div class="op-card-header">
                <div class="op-avatar-wrap" onclick="viewPhotoZoom('\${photo}')" title="Click to expand biometric portrait">
                  <img class="op-avatar-img" src="\${photo}" alt="\${u.displayName}">
                  <div class="op-avatar-overlay"></div>
                </div>
                <div class="op-details">
                  <div class="op-name">\${escapeHtml(u.displayName)}</div>
                  <div class="op-handle">@\${escapeHtml(u.handle || 'operative')}</div>
                  <div class="op-id">\${u.id}</div>
                </div>
              </div>
              <div class="op-card-body">
                <div class="op-badge-row">
                  <span class="badge badge-\${(u.accessLevel||'guest').toLowerCase().replace('_','-')}">\${u.accessLevel}</span>
                  <span class="badge badge-\${(u.status||'active').toLowerCase()}">\${u.status}</span>
                  <span class="badge badge-confidential">\${u.role || 'OPERATIVE'}</span>
                </div>

                <div class="device-telemetry-box">
                  <div class="telemetry-row">
                    <span class="telemetry-key">HARDWARE:</span>
                    <span class="telemetry-val">\${devSummary}</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-key">CANVAS FINGERPRINT:</span>
                    <span class="telemetry-val" style="color:var(--cyan)">\${canvasHash}</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-key">BIOMETRIC 128-D:</span>
                    <span class="telemetry-val" style="color:\${u.hasBiometrics ? 'var(--green)' : 'var(--text-dim)'}">\${u.hasBiometrics ? 'ENROLLED (v' + u.biometricVersion + ')' : 'NOT ENROLLED'}</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-key">DAILY QUOTA:</span>
                    <span class="telemetry-val">\${u.dailyQuota || 100} calls</span>
                  </div>
                </div>
              </div>
              <div class="op-card-actions">
                <button class="btn-sm" onclick="openEditModal('\${u.id}')">✏️ EDIT</button>
                \${dev ? \`<button class="btn-sm" onclick='showDeviceSignals(\${JSON.stringify(signals || dev).replace(/'/g, "&apos;")})'>🔑 SIGNALS</button>\` : ''}
                <button class="btn-sm btn-sm-danger" onclick="confirmRevoke('\${u.id}', '\${escapeHtml(u.displayName)}')">🗑️ REVOKE</button>
              </div>
            </div>
          \`;
        }).join('')}
      </div>
    \`;
  } else {
    // Table View
    container.innerHTML = \`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Portrait</th>
              <th>Operative Name</th>
              <th>Handle / ID</th>
              <th>Clearance</th>
              <th>Status</th>
              <th>Role</th>
              <th>Device Fingerprint</th>
              <th>Biometrics</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            \${filtered.map(u => {
              const photo = u.photoDataUrl || getFallbackAvatar(u.displayName);
              return \`
                <tr>
                  <td><img class="tbl-avatar" src="\${photo}" onclick="viewPhotoZoom('\${photo}')"></td>
                  <td><strong>\${escapeHtml(u.displayName)}</strong></td>
                  <td><span style="color:var(--cyan)">@\${escapeHtml(u.handle||'op')}</span><br><span style="font-size:9.5px; color:var(--text-dim)">\${u.id}</span></td>
                  <td><span class="badge badge-\${(u.accessLevel||'guest').toLowerCase().replace('_','-')}">\${u.accessLevel}</span></td>
                  <td><span class="badge badge-\${(u.status||'active').toLowerCase()}">\${u.status}</span></td>
                  <td>\${u.role || 'OPERATIVE'}</td>
                  <td>\${u.latestDevice?.signals?.platform || 'Win32'} (\${u.latestDevice?.signals?.hardwareConcurrency || 8}C)</td>
                  <td><span style="color:\${u.hasBiometrics?'var(--green)':'var(--text-dim)'}">\${u.hasBiometrics?'ENROLLED':'PENDING'}</span></td>
                  <td>
                    <button class="btn-sm" onclick="openEditModal('\${u.id}')">✏️ Edit</button>
                    <button class="btn-sm btn-sm-danger" onclick="confirmRevoke('\${u.id}', '\${escapeHtml(u.displayName)}')">🗑️</button>
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    \`;
  }
}

function renderDevices() {
  const tbody = document.getElementById('devices-table-body');
  const search = (document.getElementById('dev-search').value || '').toLowerCase();
  const status = document.getElementById('dev-filter-status').value;

  const filtered = state.devices.filter(d => {
    const s = JSON.stringify(d).toLowerCase();
    const matchesSearch = !search || s.includes(search);
    const matchesStatus = status === 'ALL' || d.status === status;
    return matchesSearch && matchesStatus;
  });

  tbody.innerHTML = filtered.map(d => {
    const sig = d.signals || {};
    return \`
      <tr>
        <td><span style="color:var(--cyan); font-weight:bold;">\${d.id}</span></td>
        <td><strong>\${escapeHtml(d.displayName)}</strong><br><span style="font-size:9.5px; color:var(--text-dim)">\${d.userId}</span></td>
        <td>\${sig.platform || 'Win32'}<br><span style="font-size:9px; color:var(--text-dim); max-width:200px; display:inline-block; overflow:hidden; text-overflow:ellipsis;">\${escapeHtml(sig.userAgent || 'Chrome/134')}</span></td>
        <td>\${sig.hardwareConcurrency || 16} Cores</td>
        <td>\${sig.screenWidth || 1920}x\${sig.screenHeight || 1080} (\${sig.screenColorDepth || 24}-bit)</td>
        <td>\${sig.timezone || 'Asia/Kolkata'}</td>
        <td><code style="color:var(--cyan)">\${sig.canvasHash || 'cv_hash'}</code></td>
        <td><code style="font-size:9px; color:var(--text-dim);">\${(d.bindingHash||'').slice(0, 20)}...</code></td>
        <td><span class="badge badge-\${d.status}">\${d.status}</span></td>
        <td>
          <button class="btn-sm" onclick='showDeviceSignals(\${JSON.stringify(sig).replace(/'/g, "&apos;")})'>INSPECT</button>
        </td>
      </tr>
    \`;
  }).join('');
}

function renderBiometrics() {
  const tbody = document.getElementById('biometrics-table-body');
  tbody.innerHTML = state.biometrics.map(b => {
    const photo = b.photo_data_url || getFallbackAvatar(b.display_name || 'Operative');
    const date = new Date((b.created_at || Date.now()/1000) * 1000).toLocaleString();
    return \`
      <tr>
        <td><img class="tbl-avatar" src="\${photo}"></td>
        <td><strong>\${escapeHtml(b.display_name || 'Operative')}</strong></td>
        <td><span style="color:var(--text-dim)">\${b.user_id}</span></td>
        <td>v\${b.template_version || 1}</td>
        <td><span style="color:var(--green)">AES-GCM-256 (\${b.encryption_key_version || 'v1'})</span></td>
        <td><code>\${b.template_iv || 'N/A'}</code></td>
        <td>\${b.source_type || 'live_camera'}</td>
        <td>\${date}</td>
      </tr>
    \`;
  }).join('');
}

async function loadAuditData() {
  try {
    const res = await fetch('/api/audit?limit=50').then(r => r.json());
    if (res.success) {
      const tbody = document.getElementById('audit-table-body');
      tbody.innerHTML = res.logs.map(l => {
        const date = new Date((l.created_at || Date.now()/1000) * 1000).toLocaleTimeString();
        return \`
          <tr>
            <td>\${date}</td>
            <td><strong style="color:var(--cyan)">\${l.event}</strong></td>
            <td><span class="badge badge-\${l.result === 'SUCCESS' ? 'active' : 'revoked'}">\${l.result}</span></td>
            <td>\${escapeHtml(l.display_name || l.user_id || 'ANONYMOUS')}</td>
            <td><span style="font-size:9.5px;">\${l.device_id || 'N/A'}</span></td>
            <td><code style="font-size:9px;">\${(l.ip_hash || '').slice(0, 16)}...</code></td>
            <td><span style="font-size:9.5px; color:var(--text-dim);">\${escapeHtml(l.metadata || '')}</span></td>
          </tr>
        \`;
      }).join('');
    }
  } catch (e) {
    console.error('Audit fetch error:', e);
  }
}

// SQL Workbench
function setSqlPreset(q) {
  document.getElementById('sql-query-input').value = q;
}

async function executeSql() {
  const query = document.getElementById('sql-query-input').value.trim();
  const statusEl = document.getElementById('sql-status');
  const resultsWrap = document.getElementById('sql-results-wrap');
  const thead = document.getElementById('sql-results-head');
  const tbody = document.getElementById('sql-results-body');

  if (!query) return;
  statusEl.textContent = 'Executing query...';

  try {
    const res = await fetch('/api/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(r => r.json());

    if (!res.success) {
      statusEl.textContent = 'ERROR: ' + res.error;
      resultsWrap.style.display = 'none';
      return;
    }

    statusEl.textContent = \`Success: \${res.rowCount} row(s) returned in \${res.durationMs}ms\`;
    resultsWrap.style.display = 'block';

    if (res.columns && res.columns.length > 0) {
      thead.innerHTML = '<tr>' + res.columns.map(c => '<th>' + c + '</th>').join('') + '</tr>';
      tbody.innerHTML = res.rows.map(row => {
        return '<tr>' + res.columns.map(c => {
          let val = row[c];
          if (typeof val === 'string' && val.startsWith('data:image')) {
            return \`<td><img src="\${val}" style="width:28px;height:28px;border-radius:3px;"></td>\`;
          }
          return '<td>' + escapeHtml(String(val === null ? 'NULL' : val)) + '</td>';
        }).join('') + '</tr>';
      }).join('');
    } else {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td colspan="10">No rows returned.</td></tr>';
    }
  } catch (e) {
    statusEl.textContent = 'Network/Execution error: ' + e.message;
  }
}

// Modal Handlers
function openEditModal(userId) {
  const u = state.users.find(x => x.id === userId);
  if (!u) return;
  document.getElementById('edit-id').value = u.id;
  document.getElementById('edit-name').value = u.displayName || '';
  document.getElementById('edit-level').value = u.accessLevel || 'RESTRICTED';
  document.getElementById('edit-role').value = u.role || 'OPERATIVE';
  document.getElementById('edit-status').value = u.status || 'active';
  document.getElementById('edit-quota').value = u.dailyQuota || 100;
  document.getElementById('edit-photo-preview').src = u.photoDataUrl || getFallbackAvatar(u.displayName);
  document.getElementById('modal-edit').classList.add('active');
}

function openProvisionModal() {
  document.getElementById('prov-name').value = '';
  document.getElementById('prov-handle').value = '';
  document.getElementById('prov-level').value = 'RESTRICTED';
  document.getElementById('prov-role').value = 'OPERATIVE';
  document.getElementById('prov-quota').value = '100';
  document.getElementById('prov-photo-preview').src = getFallbackAvatar('New Operative');
  document.getElementById('modal-provision').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function saveOperativeChanges() {
  const id = document.getElementById('edit-id').value;
  const displayName = document.getElementById('edit-name').value;
  const accessLevel = document.getElementById('edit-level').value;
  const role = document.getElementById('edit-role').value;
  const status = document.getElementById('edit-status').value;
  const dailyQuota = document.getElementById('edit-quota').value;
  const photoDataUrl = document.getElementById('edit-photo-preview').src;

  try {
    const res = await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, displayName, accessLevel, role, status, dailyQuota, photoDataUrl })
    }).then(r => r.json());

    if (res.success) {
      closeModal('modal-edit');
      loadAllData();
    } else {
      alert('Error updating user: ' + res.error);
    }
  } catch (e) {
    alert('Save error: ' + e.message);
  }
}

async function submitProvisionOperative() {
  const displayName = document.getElementById('prov-name').value.trim();
  const handle = document.getElementById('prov-handle').value.trim();
  const accessLevel = document.getElementById('prov-level').value;
  const role = document.getElementById('prov-role').value;
  const dailyQuota = document.getElementById('prov-quota').value;
  const photoDataUrl = document.getElementById('prov-photo-preview').src;

  if (!displayName) return alert('Display name is required');

  try {
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, handle, accessLevel, role, dailyQuota, photoDataUrl })
    }).then(r => r.json());

    if (res.success) {
      closeModal('modal-provision');
      loadAllData();
    } else {
      alert('Error provisioning: ' + res.error);
    }
  } catch (e) {
    alert('Provision error: ' + e.message);
  }
}

async function confirmRevoke(userId, name) {
  if (!confirm(\`Are you sure you want to revoke operative clearance for \${name} (\${userId})?\`)) return;
  try {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, permanent: false })
    }).then(r => r.json());

    if (res.success) {
      loadAllData();
    } else {
      alert('Error: ' + res.error);
    }
  } catch (e) {
    alert('Revoke error: ' + e.message);
  }
}

function showDeviceSignals(signals) {
  document.getElementById('signals-json-view').textContent = JSON.stringify(signals, null, 2);
  document.getElementById('modal-signals').classList.add('active');
}

function copySignalsJson() {
  navigator.clipboard.writeText(document.getElementById('signals-json-view').textContent);
  alert('Device signals JSON copied to clipboard!');
}

function handlePhotoUpload(event, previewId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(previewId).src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function generateCyberneticPhoto(previewId, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Dark cyber background
  ctx.fillStyle = '#030a14';
  ctx.fillRect(0, 0, 160, 160);

  // Reticle circle
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(80, 80, 68, 0, Math.PI * 2);
  ctx.stroke();

  // Face silhouette
  ctx.fillStyle = '#00f0ff';
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(80, 65, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, 125, 42, 0, Math.PI * 2);
  ctx.fill();

  // Crosshairs & Grid
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#4dff8a';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, 100, 100);

  // Text tag
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name.slice(0, 12).toUpperCase(), 80, 150);

  document.getElementById(previewId).src = canvas.toDataURL('image/jpeg', 0.85);
}

function getFallbackAvatar(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#04101e';
  ctx.fillRect(0, 0, 80, 80);
  ctx.strokeStyle = '#00f0ff';
  ctx.strokeRect(2, 2, 76, 76);
  ctx.fillStyle = '#4dff8a';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initial = (name || 'O').charAt(0).toUpperCase();
  ctx.fillText(initial, 40, 40);
  return canvas.toDataURL();
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function viewPhotoZoom(url) {
  window.open(url, '_blank');
}

// Initial load
loadAllData();
</script>
</body>
</html>`;
}
