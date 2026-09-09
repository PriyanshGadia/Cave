interface Env {
  WORKSHOP_DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const namespace = context.params.namespace as string;
    if (!db || !namespace) {
      return new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check latest updated_at timestamp for fast ETag generation
    const latestRow = await db
      .prepare(
        'SELECT updated_at FROM interaction_state WHERE namespace = ? ORDER BY updated_at DESC LIMIT 1'
      )
      .bind(namespace)
      .first<{ updated_at: number }>();

    const latest = latestRow?.updated_at ?? 0;
    const etag = `"${namespace}-${latest}"`;

    if (context.request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304 });
    }

    const { results } = await db
      .prepare('SELECT element_id, data FROM interaction_state WHERE namespace = ?')
      .bind(namespace)
      .all();

    const snapshot: Record<string, any> = {};
    for (const row of results || []) {
      try {
        snapshot[row.element_id as string] = JSON.parse(row.data as string);
      } catch {
        snapshot[row.element_id as string] = row.data;
      }
    }

    return new Response(JSON.stringify(snapshot), {
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
