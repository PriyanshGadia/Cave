const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/af1250353357012e26a9c967370153d21b0911006c83c371f677d7c00d4d60fc.sqlite');
const db = new DatabaseSync(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

for (const t of tables) {
  if (t.name.startsWith('sqlite_') || t.name.startsWith('_cf_')) continue;
  console.log(`\n--- TABLE: ${t.name} ---`);
  const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log('Columns:', columns.map(c => `${c.name} (${c.type})`).join(', '));
  const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get();
  console.log('Row count:', count.c);
  const sample = db.prepare(`SELECT * FROM ${t.name} LIMIT 2`).all();
  console.log('Sample rows:', sample);
}
