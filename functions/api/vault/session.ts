/**
 * functions/api/vault/session.ts
 *
 * GET  /api/vault/session  — validate vault_sid cookie, return session claims
 * DELETE /api/vault/session — revoke session, clear cookie
 *
 * SECURITY: This is the only endpoint the frontend uses to discover its
 * session state. It never returns sensitive fields (userId internals, raw
 * capabilities JSON, etc.) beyond what the UI needs to render.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  validateSession,
  writeAuditEvent,
  clearSessionCookie,
  jsonOk,
  getClientIp,
  hashIp,
} from './_middleware';

interface VaultSessionResponse {
  authenticated: boolean;
  displayName: string | null;
  accessLevel: string;
  capabilities: Record<string, boolean>;
}

export const onRequestGet: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const session = await validateSession(request, env);

    if (!session) {
      const resp: VaultSessionResponse = {
        authenticated: false,
        displayName: null,
        accessLevel: 'VISITOR',
        capabilities: {
          roam: false,
          tour: false,
          ls1: false,
          ls2Write: false,
          privateResume: false,
          moderation: false,
          ownerControls: false,
        },
      };
      return jsonOk(resp);
    }

    // Fetch display name if this is an authenticated (non-visitor) session
    let displayName: string | null = null;
    if (session.userId) {
      const user = await env.WORKSHOP_DB.prepare(
        `SELECT display_name FROM vault_users WHERE id = ? AND status = 'active' LIMIT 1`,
      )
        .bind(session.userId)
        .first<{ display_name: string }>();
      displayName = user?.display_name ?? null;
    }

    const resp: VaultSessionResponse = {
      authenticated: true,
      displayName,
      accessLevel: session.accessLevel,
      capabilities: session.capabilities as unknown as Record<string, boolean>,
    };

    return jsonOk(resp);
  };

export const onRequestDelete: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const session = await validateSession(request, env);
    if (!session) {
      // Already logged out — idempotent
      return new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': clearSessionCookie() },
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Revoke session in DB
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_sessions SET revoked_at = ? WHERE id = ?`,
    )
      .bind(now, session.sessionId)
      .run();

    // Audit
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
    await writeAuditEvent(env, {
      userId: session.userId,
      deviceId: session.deviceId,
      sessionId: session.sessionId,
      event: 'SESSION_REVOKED',
      result: 'SUCCESS',
      ipHash,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  };
