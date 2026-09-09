interface Env {
  WORKSHOP_DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = env?.WORKSHOP_DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 503 });
  }

  const { results } = await db
    .prepare('SELECT * FROM portfolio_items ORDER BY created_at DESC')
    .all();

  const items = (results || []).map((r: any) => ({
    ...r,
    tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags,
  }));

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const db = env?.WORKSHOP_DB;
  if (!db) return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 503 });

  try {
    const body = await request.json() as any;
    if (!body.title || !body.summary || !body.kind) {
      return new Response(JSON.stringify({ error: 'title, summary, and kind are required' }), { status: 400 });
    }
    if (!body.proof_url || !/^https?:\/\//.test(body.proof_url)) {
      return new Response(JSON.stringify({ error: 'proof_url is required and must be a valid http/https URL' }), { status: 422 });
    }

    const id = body.id || `${body.kind}:${crypto.randomUUID().slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(
      `INSERT INTO portfolio_items (id, kind, title, summary, proof_url, proof_type, issuer, date_from, date_to, tags, weight, visible, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         kind=excluded.kind,
         title=excluded.title,
         summary=excluded.summary,
         proof_url=excluded.proof_url,
         proof_type=excluded.proof_type,
         issuer=excluded.issuer,
         date_from=excluded.date_from,
         date_to=excluded.date_to,
         tags=excluded.tags,
         weight=excluded.weight,
         updated_at=excluded.updated_at`
    ).bind(
      id,
      body.kind,
      body.title,
      body.summary,
      body.proof_url,
      body.proof_type || 'link',
      body.issuer ?? null,
      body.date_from ?? null,
      body.date_to ?? null,
      JSON.stringify(body.tags ?? []),
      body.weight ?? 0,
      now,
      now
    ).run();

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) => {
  const db = env?.WORKSHOP_DB;
  if (!db) return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 503 });

  try {
    const { id, visible, verified } = await request.json() as any;
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

    const now = Math.floor(Date.now() / 1000);
    await db.prepare(
      `UPDATE portfolio_items SET
         visible = COALESCE(?, visible),
         verified_at = CASE WHEN ? = 1 THEN ? ELSE verified_at END,
         updated_at = ?
       WHERE id = ?`
    ).bind(
      visible !== undefined ? (visible ? 1 : 0) : null,
      verified !== undefined ? (verified ? 1 : 0) : 0,
      now,
      now,
      id
    ).run();

    return new Response(JSON.stringify({ ok: true }));
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const db = env?.WORKSHOP_DB;
  if (!db) return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 503 });

  try {
    const { id } = await request.json() as any;
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

    await db.prepare('DELETE FROM portfolio_items WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ ok: true }));
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
