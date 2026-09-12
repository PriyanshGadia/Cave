interface Env {
  WORKSHOP_DB: D1Database;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const MAX_MESSAGE_LEN = 280;
const MAX_AUTHOR_LEN = 24;
const MAX_INK_BYTES = 12288; // 12 KB

// GET /api/notes/:id
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const id = context.params.id as string;
    if (!db || !id) {
      return new Response(JSON.stringify({ error: 'NOTE_NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const row = await db
      .prepare(
        `SELECT id, author_name, message, ink_strokes_json, color_theme, paper_theme, pos_x, pos_y, created_at, updated_at
         FROM guestbook_entries
         WHERE id = ? AND is_hidden = 0`
      )
      .bind(id)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify({ error: 'NOTE_NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let inkStrokes = [];
    if (row.ink_strokes_json) {
      try {
        inkStrokes = typeof row.ink_strokes_json === 'string' ? JSON.parse(row.ink_strokes_json) : row.ink_strokes_json;
      } catch {
        inkStrokes = [];
      }
    }

    return new Response(
      JSON.stringify({
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
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=4, stale-while-revalidate=12',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT /api/notes/:id (Update Note with Author Token Validation)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const id = context.params.id as string;
    if (!db || !id) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Author Token Verification
    const authorToken = context.request.headers.get('x-author-token');
    if (!authorToken) {
      return new Response(JSON.stringify({ error: 'AUTHOR_TOKEN_REQUIRED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const row = await db
      .prepare('SELECT token_hash, is_hidden FROM guestbook_entries WHERE id = ?')
      .bind(id)
      .first<{ token_hash: string | null; is_hidden: number }>();

    if (!row || row.is_hidden === 1) {
      return new Response(JSON.stringify({ error: 'NOTE_NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!row.token_hash) {
      return new Response(JSON.stringify({ error: 'UNOWNED_ENTRY_MUTATION_RESTRICTED' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const computedTokenHash = await sha256(authorToken);
    if (computedTokenHash !== row.token_hash) {
      return new Response(JSON.stringify({ error: 'INVALID_AUTHOR_TOKEN' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
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

    const author = body.author !== undefined ? String(body.author).trim().slice(0, MAX_AUTHOR_LEN) : undefined;
    const message = body.message !== undefined ? String(body.message) : undefined;
    const colorTheme = ['cyan', 'amber', 'green', 'white'].includes(body.colorTheme) ? body.colorTheme : undefined;
    const paperTheme = ['yellow', 'pink', 'cyan', 'green'].includes(body.paperTheme) ? body.paperTheme : undefined;

    // Hard server-side message length check
    if (message !== undefined && message.length > MAX_MESSAGE_LEN) {
      return new Response(JSON.stringify({ error: `MESSAGE_EXCEEDS_MAX_LEN_${MAX_MESSAGE_LEN}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hard server-side ink_strokes_json byte size check
    let inkJson: string | undefined = undefined;
    if (body.inkStrokes && Array.isArray(body.inkStrokes)) {
      inkJson = JSON.stringify(body.inkStrokes);
    } else if (typeof body.ink_strokes_json === 'string') {
      inkJson = body.ink_strokes_json;
    }

    if (inkJson !== undefined) {
      const inkBytes = new TextEncoder().encode(inkJson).length;
      if (inkBytes > MAX_INK_BYTES) {
        return new Response(JSON.stringify({ error: `INK_DATA_EXCEEDS_${MAX_INK_BYTES}_BYTES` }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const now = Math.floor(Date.now() / 1000);

    // 3. Perform Updates
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (author !== undefined) { updates.push('author_name = ?'); params.push(author); }
    if (message !== undefined) { updates.push('message = ?'); params.push(message); }
    if (inkJson !== undefined) { updates.push('ink_strokes_json = ?'); params.push(inkJson); }
    if (colorTheme !== undefined) { updates.push('color_theme = ?'); params.push(colorTheme); }
    if (paperTheme !== undefined) { updates.push('paper_theme = ?'); params.push(paperTheme); }

    params.push(id);

    await db
      .prepare(`UPDATE guestbook_entries SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        id,
        updatedAt: now,
      }),
      {
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
