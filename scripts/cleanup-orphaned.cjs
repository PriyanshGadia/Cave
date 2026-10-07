const sqlite = require('node:sqlite');
const path = './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/af1250353357012e26a9c967370153d21b0911006c83c371f677d7c00d4d60fc.sqlite';
const db = new sqlite.DatabaseSync(path);

console.log('Finding orphaned devices (devices where user has no biometric template)...');
const orphaned = db.prepare(`
  SELECT d.id as device_id, d.user_id, d.device_binding_hash, u.display_name
  FROM vault_devices d
  LEFT JOIN vault_users u ON d.user_id = u.id
  WHERE d.user_id NOT IN (SELECT user_id FROM vault_biometrics)
`).all();

console.log('Orphaned devices found:', orphaned);

const res = db.prepare(`
  DELETE FROM vault_devices 
  WHERE user_id NOT IN (SELECT user_id FROM vault_biometrics)
`).run();
console.log('Orphaned devices deleted:', res);

const delUsers = db.prepare(`
  DELETE FROM vault_users 
  WHERE id NOT IN (SELECT user_id FROM vault_biometrics)
  AND id NOT IN (SELECT user_id FROM vault_devices)
`).run();
console.log('Orphaned users deleted:', delUsers);

console.log('Total devices remaining:', db.prepare('SELECT count(*) as count FROM vault_devices').all());
console.log('Total biometrics remaining:', db.prepare('SELECT count(*) as count FROM vault_biometrics').all());
