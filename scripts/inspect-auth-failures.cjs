// scripts/inspect-auth-failures.cjs
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/af1250353357012e26a9c967370153d21b0911006c83c371f677d7c00d4d60fc.sqlite');
const db = new DatabaseSync(dbPath);

console.log('=== RECENT AUDIT LOG FAILURES ===');
const rows = db.prepare(`SELECT id, event, result, reason_code, user_id, device_id, metadata FROM vault_audit_log ORDER BY rowid DESC LIMIT 25`).all();
console.table(rows);

console.log('\n=== REGISTERED DEVICES ===');
const devices = db.prepare(`SELECT id, user_id, device_binding_hash, status, sign_count, webauthn_credential_id, length(webauthn_public_key) as key_len FROM vault_devices`).all();
console.table(devices);

console.log('\n=== REGISTERED USERS ===');
const users = db.prepare(`SELECT id, display_name, access_level, status FROM vault_users`).all();
console.table(users);
