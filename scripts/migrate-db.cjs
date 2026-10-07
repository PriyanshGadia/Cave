/**
 * scripts/migrate-db.cjs
 *
 * Migrates local SQLite database to support:
 * 1. vault_users.photo_data_url (Face portrait image / camera capture)
 * 2. vault_devices.device_signals_json (Complete hardware & browser fingerprinting signals)
 *
 * Also backfills cybernetic operative portraits & fingerprint metadata for existing records.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/af1250353357012e26a9c967370153d21b0911006c83c371f677d7c00d4d60fc.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
console.log('Opened SQLite database at:', dbPath);

// 1. Check & Alter vault_users table
const userCols = db.prepare(`PRAGMA table_info(vault_users)`).all().map(c => c.name);
if (!userCols.includes('photo_data_url')) {
  console.log('Adding photo_data_url column to vault_users...');
  db.exec(`ALTER TABLE vault_users ADD COLUMN photo_data_url TEXT`);
  console.log('✓ Added photo_data_url column.');
} else {
  console.log('photo_data_url column already exists.');
}

// 2. Check & Alter vault_devices table
const devCols = db.prepare(`PRAGMA table_info(vault_devices)`).all().map(c => c.name);
if (!devCols.includes('device_signals_json')) {
  console.log('Adding device_signals_json column to vault_devices...');
  db.exec(`ALTER TABLE vault_devices ADD COLUMN device_signals_json TEXT`);
  console.log('✓ Added device_signals_json column.');
} else {
  console.log('device_signals_json column already exists.');
}

/**
 * Generate a high-tech cyberpunk biometric SVG avatar data URL for an operative.
 */
function generateCyberAvatar(name, userId, accessLevel) {
  const initials = (name || 'OP')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'OP';

  const isOwner = accessLevel === 'OWNER';
  const isTrusted = accessLevel === 'TRUSTED';
  const primaryColor = isOwner ? '#ffd166' : isTrusted ? '#00f0ff' : '#4dff8a';
  const secondaryColor = isOwner ? '#ffaa00' : isTrusted ? '#0088cc' : '#1e5a68';

  // Seeded hash for reproducible organic variations
  let hashVal = 0;
  for (let i = 0; i < userId.length; i++) hashVal = (hashVal * 31 + userId.charCodeAt(i)) & 0xffffff;
  const hexPattern = ((hashVal % 900) + 100).toString(16).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <radialGradient id="bg" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="#072238" />
        <stop offset="70%" stop-color="#030c14" />
        <stop offset="100%" stop-color="#01050a" />
      </radialGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2" />
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="160" height="160" fill="url(#bg)" />
    <!-- Grid -->
    <path d="M0 40 H160 M0 80 H160 M0 120 H160 M40 0 V160 M80 0 V160 M120 0 V160" stroke="#123444" stroke-width="0.75" stroke-opacity="0.4" />
    
    <!-- Biometric HUD Targeting Reticle -->
    <circle cx="80" cy="74" r="54" fill="none" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="6 4" />
    <circle cx="80" cy="74" r="42" fill="none" stroke="${primaryColor}" stroke-width="0.8" stroke-opacity="0.5" />
    
    <!-- Face Silhouette -->
    <circle cx="80" cy="62" r="22" fill="#0d2c44" stroke="${primaryColor}" stroke-width="1.5" />
    <!-- Shoulders -->
    <path d="M42 135 C 44 105, 116 105, 118 135 Z" fill="#0b2438" stroke="${secondaryColor}" stroke-width="1.5" />
    
    <!-- Facial Wireframe Mesh -->
    <circle cx="73" cy="59" r="2.5" fill="${primaryColor}" />
    <circle cx="87" cy="59" r="2.5" fill="${primaryColor}" />
    <path d="M80 62 L80 69 L76 72 L84 72" fill="none" stroke="${primaryColor}" stroke-width="1" stroke-linecap="round" />
    <path d="M74 77 Q80 81 86 77" fill="none" stroke="${primaryColor}" stroke-width="1.2" />

    <!-- Corner Brackets -->
    <path d="M12 24 L12 12 L24 12" fill="none" stroke="${primaryColor}" stroke-width="2" />
    <path d="M148 24 L148 12 L136 12" fill="none" stroke="${primaryColor}" stroke-width="2" />
    <path d="M12 136 L12 148 L24 148" fill="none" stroke="${primaryColor}" stroke-width="2" />
    <path d="M148 136 L148 148 L136 148" fill="none" stroke="${primaryColor}" stroke-width="2" />

    <!-- Initials & Badge -->
    <text x="80" y="146" font-family="monospace" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">${initials}</text>
    <text x="80" y="24" font-family="monospace" font-size="8" font-weight="bold" fill="${primaryColor}" text-anchor="middle">BIO-ID #${hexPattern}</text>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// 3. Backfill users missing photo_data_url
const users = db.prepare(`SELECT id, display_name, access_level, photo_data_url FROM vault_users`).all();
console.log(`Auditing ${users.length} user records for photos...`);

let updatedUsers = 0;
const updateUserStmt = db.prepare(`UPDATE vault_users SET photo_data_url = ? WHERE id = ?`);
for (const u of users) {
  if (!u.photo_data_url) {
    const avatar = generateCyberAvatar(u.display_name, u.id, u.access_level);
    updateUserStmt.run(avatar, u.id);
    updatedUsers++;
  }
}
console.log(`✓ Backfilled ${updatedUsers} user records with cybernetic biometric portraits.`);

// 4. Backfill devices missing device_signals_json
const devices = db.prepare(`SELECT id, user_id, device_binding_hash, device_signals_json FROM vault_devices`).all();
console.log(`Auditing ${devices.length} devices for hardware fingerprints...`);

let updatedDevices = 0;
const updateDevStmt = db.prepare(`UPDATE vault_devices SET device_signals_json = ? WHERE id = ?`);
for (const d of devices) {
  if (!d.device_signals_json) {
    const syntheticSignals = {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      platform: "Win32",
      hardwareConcurrency: 16,
      screenColorDepth: 24,
      screenWidth: 1920,
      screenHeight: 1080,
      timezone: "Asia/Kolkata",
      canvasHash: "cv_" + d.device_binding_hash.slice(0, 16).replace(/[^a-zA-Z0-9]/g, 'X'),
      webauthnAuthenticator: "Platform TPM 2.0 / Windows Hello",
      bindingHash: d.device_binding_hash,
    };
    updateDevStmt.run(JSON.stringify(syntheticSignals), d.id);
    updatedDevices++;
  }
}
console.log(`✓ Backfilled ${updatedDevices} device records with device fingerprinting data.`);
console.log('=== DATABASE MIGRATION COMPLETE ===');
