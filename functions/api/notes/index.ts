interface Env {
  WORKSHOP_DB: D1Database;
}

// SHA-256 helper for Cloudflare Workers / WebCrypto
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Global limits
const MAX_MESSAGE_LEN = 280;
const MAX_AUTHOR_LEN = 24;
const MAX_INK_BYTES = 12288; // 12 KB
const MAX_ACTIVE_NOTES = 500; // Global active storage ceiling
const RATE_LIMIT_WINDOW = 600; // 10 minutes in seconds
const RATE_LIMIT_MAX_REQ = 25; // max 25 notes operations per IP per 10m

// GET /api/notes?page=0&limit=16
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify({ notes: [], total: 0, page: 0, fallback: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(context.request.url);
    const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10) || 0);
    const limit = Math.min(32, Math.max(1, parseInt(url.searchParams.get('limit') || '16', 10) || 16));
    const offset = page * limit;

    // Latest updated_at timestamp for fast ETag generation
    const latestRow = await db
      .prepare('SELECT updated_at FROM guestbook_entries WHERE is_hidden = 0 ORDER BY updated_at DESC LIMIT 1')
      .first<{ updated_at: number }>();

    const latest = latestRow?.updated_at ?? 0;
    const etag = `"notes-p${page}-${latest}"`;

    if (context.request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304 });
    }

    const { results } = await db
      .prepare(
        `SELECT id, author_name, message, ink_strokes_json, color_theme, paper_theme, pos_x, pos_y, created_at, updated_at
         FROM guestbook_entries
         WHERE is_hidden = 0
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();

    const countRow = await db
      .prepare('SELECT COUNT(*) as cnt FROM guestbook_entries WHERE is_hidden = 0')
      .first<{ cnt: number }>();

    const total = countRow?.cnt ?? (results?.length || 0);

    const notes = (results || []).map((row: any) => {
      let inkStrokes = [];
      if (row.ink_strokes_json) {
        try {
          inkStrokes = typeof row.ink_strokes_json === 'string' ? JSON.parse(row.ink_strokes_json) : row.ink_strokes_json;
        } catch {
          inkStrokes = [];
        }
      }
      return {
        id: row.id,
        author: row.author_name || 'ANONYMOUS',
        message: row.message || '',
        inkStrokes,
        colorTheme: row.color_theme || 'cyan',
        paperTheme: row.paper_theme || 'yellow',
        posX: row.pos_x || 0,
        posY: row.pos_y || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return new Response(JSON.stringify({ notes, total, page, limit }), {
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Cache-Control': 'public, max-age=2, stale-while-revalidate=8',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/notes (Create Note)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientIp = context.request.headers.get('cf-connecting-ip') || context.request.headers.get('x-forwarded-for') || '127.0.0.1';
    const ipSalt = 'vault-01-salt-2026';
    const ipHash = await sha256(clientIp + ':' + ipSalt);

    // 1. IP Rate Limiting Check
    const rateKey = await sha256(ipHash + ':notes_post');
    const now = Math.floor(Date.now() / 1000);

    const limitRow = await db
      .prepare('SELECT request_count, window_expires_at FROM rate_limits WHERE key_hash = ?')
      .bind(rateKey)
      .first<{ request_count: number; window_expires_at: number }>();

    if (limitRow && limitRow.window_expires_at > now) {
      if (limitRow.request_count >= RATE_LIMIT_MAX_REQ) {
        return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      await db
        .prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE key_hash = ?')
        .bind(rateKey)
        .run();
    } else {
      await db
        .prepare('INSERT OR REPLACE INTO rate_limits (key_hash, request_count, window_expires_at) VALUES (?, 1, ?)')
        .bind(rateKey, now + RATE_LIMIT_WINDOW)
        .run();
    }

    // 2. Parse & Validate Payload
    let body: any;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'INVALID_JSON_PAYLOAD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const author = String(body.author || 'ANONYMOUS').trim().slice(0, MAX_AUTHOR_LEN);
    const message = String(body.message || '');
    const colorTheme = ['cyan', 'amber', 'green', 'white'].includes(body.colorTheme) ? body.colorTheme : 'cyan';
    const paperTheme = ['yellow', 'pink', 'cyan', 'green'].includes(body.paperTheme) ? body.paperTheme : 'yellow';
    const posX = typeof body.posX === 'number' ? Math.max(-0.1, Math.min(0.1, body.posX)) : (Math.random() - 0.5) * 0.06;
    const posY = typeof body.posY === 'number' ? Math.max(-0.1, Math.min(0.1, body.posY)) : (Math.random() - 0.5) * 0.06;

    // Hard server-side message length check
    if (message.length > MAX_MESSAGE_LEN) {
      return new Response(JSON.stringify({ error: `MESSAGE_EXCEEDS_MAX_LEN_${MAX_MESSAGE_LEN}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hard server-side ink_strokes_json byte size check
    let inkJson = '[]';
    if (body.inkStrokes && Array.isArray(body.inkStrokes)) {
      inkJson = JSON.stringify(body.inkStrokes);
    } else if (typeof body.ink_strokes_json === 'string') {
      inkJson = body.ink_strokes_json;
    }

    const inkBytes = new TextEncoder().encode(inkJson).length;
    if (inkBytes > MAX_INK_BYTES) {
      return new Response(JSON.stringify({ error: `INK_DATA_EXCEEDS_${MAX_INK_BYTES}_BYTES` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Client Author Token Capture & Hashing
    // Client generates the author secret token locally and provides it via X-Author-Token.
    // The server only stores the SHA-256 hash.
    const clientToken = context.request.headers.get('x-author-token') || body.clientToken || crypto.randomUUID();
    const tokenHash = await sha256(clientToken);
    const noteId = `note-${crypto.randomUUID()}`;

    // 4. Insert Entry
    await db
      .prepare(
        `INSERT INTO guestbook_entries (
           id, author_name, visitor_tier, message, ink_strokes_json,
           color_theme, paper_theme, pos_x, pos_y, ip_hash, token_hash,
           created_at, updated_at, is_hidden
         ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .bind(
        noteId, author, message, inkJson,
        colorTheme, paperTheme, posX, posY, ipHash, tokenHash,
        now, now
      )
      .run();

    // 5. Two-Tier Storage Ceiling & Retention Enforcement
    // 5a. Soft-hide rows beyond MAX_ACTIVE_NOTES (500) for active display
    await db
      .prepare(
        `UPDATE guestbook_entries SET is_hidden = 1
         WHERE id IN (
           SELECT id FROM guestbook_entries
           WHERE is_hidden = 0
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`
      )
      .bind(MAX_ACTIVE_NOTES)
      .run();

    // 5b. Hard-delete archived rows beyond MAX_TOTAL_RETAINED (2000) to strictly bound physical D1 storage under 300MB
    const MAX_TOTAL_RETAINED = 2000;
    await db
      .prepare(
        `DELETE FROM guestbook_entries
         WHERE id IN (
           SELECT id FROM guestbook_entries
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`
      )
      .bind(MAX_TOTAL_RETAINED)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        id: noteId,
        createdAt: now,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
