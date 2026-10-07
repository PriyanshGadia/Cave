/**
 * ensure-schema.cjs
 * Ensures all tables from functions/schema.sql exist in local Miniflare D1 sqlite database(s).
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const schemaFile = path.join(ROOT_DIR, 'functions', 'schema.sql');
const d1Dir = path.join(ROOT_DIR, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

if (!fs.existsSync(schemaFile)) {
  console.error('[SCHEMA] Missing schema.sql at', schemaFile);
  process.exit(1);
}

const sql = fs.readFileSync(schemaFile, 'utf8');

if (fs.existsSync(d1Dir)) {
  const sqliteFiles = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite'));
  for (const file of sqliteFiles) {
    const fullPath = path.join(d1Dir, file);
    try {
      const db = new DatabaseSync(fullPath);
      // Run the schema statements
      db.exec(sql);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`[SCHEMA] Applied schema to ${file}. Total tables:`, tables.length);
    } catch (err) {
      console.warn(`[SCHEMA] Notice applying to ${file}:`, err.message);
    }
  }
} else {
  console.log('[SCHEMA] Miniflare D1 directory does not exist yet.');
}
