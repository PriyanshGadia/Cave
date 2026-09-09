interface Env {
  WORKSHOP_DB: D1Database;
}

const LIMITS: Record<string, { maxLen?: number; maxActive?: number }> = {
  rs1: { maxLen: 2000 },
  rs2: { maxLen: 1000 },
  rs3: { maxLen: 1000 },
  ls1: { maxLen: 1000 },
  ls2: { maxLen: 350, maxActive: 500 }, // sticky notes 280-char cap + meta, 500 active notes cap
  ls3: { maxLen: 1000 },
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const namespace = context.params.namespace as string;
    const elementId = context.params.elementId as string;
    if (!db || !namespace || !elementId) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const partial = (await context.request.json()) as Record<string, any>;
    const limit = LIMITS[namespace];

    // Fetch existing state if any
    const existing = await db
      .prepare('SELECT data FROM interaction_state WHERE namespace = ? AND element_id = ?')
      .bind(namespace, elementId)
      .first<{ data: string }>();

    let current: Record<string, any> = {};
    if (existing && existing.data) {
      try {
        current = JSON.parse(existing.data);
      } catch {}
    }

    const merged = { ...current, ...partial };
    const mergedStr = JSON.stringify(merged);

    if (limit?.maxLen && mergedStr.length > limit.maxLen) {
      return new Response(JSON.stringify({ error: 'Payload too large', maxLen: limit.maxLen }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();
    await db
      .prepare(
        'INSERT INTO interaction_state (namespace, element_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(namespace, element_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
      )
      .bind(namespace, elementId, mergedStr, now)
      .run();

    // Probabilistic pruning: 2% chance per write to prune older elements if maxActive is exceeded
    if (limit?.maxActive && Math.random() < 0.02) {
      await db
        .prepare(
          `DELETE FROM interaction_state WHERE namespace = ? AND element_id IN (
             SELECT element_id FROM interaction_state WHERE namespace = ? ORDER BY updated_at ASC LIMIT -1 OFFSET ?
           )`
        )
        .bind(namespace, namespace, limit.maxActive)
        .run();
    }

    return new Response(mergedStr, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
