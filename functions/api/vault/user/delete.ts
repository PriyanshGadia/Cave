/**
 * functions/api/vault/user/delete.ts
 *
 * DELETE /api/vault/user/delete
 *
 * Right-to-deletion: permanently deletes the authenticated user's
 * biometric data, device records, sessions, and account.
 *
 * PRIVACY: vault_biometrics is wiped first. The cascade on vault_users
 * also removes vault_devices and vault_biometrics via foreign key ON DELETE CASCADE.
 * vault_audit_log entries are retained (anonymized to NULL user_id) for
 * security monitoring purposes, as required for incident response.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  requireSession,
  writeAuditEvent,
  hashIp,
  getClientIp,
  clearSessionCookie,
  jsonError,
} from '../_middleware';

export const onRequestDelete: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    let session;
    try {
      session = await requireSession(request, env, 'GUEST');
    } catch (resp) {
      return resp as Response;
    }

    if (!session.userId) {
      return jsonError(400, 'VISITOR sessions cannot be deleted via this endpoint');
    }

    const now = Math.floor(Date.now() / 1000);

    // 1. Explicitly delete biometric data first (belt + suspenders, cascade handles the rest)
    await env.WORKSHOP_DB.prepare(
      `DELETE FROM vault_biometrics WHERE user_id = ?`,
    ).bind(session.userId).run();

    // 2. Revoke all sessions
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
    ).bind(now, session.userId).run();

    // 3. Anonymize audit log (preserve for security monitoring, remove PII)
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_audit_log SET user_id = NULL WHERE user_id = ?`,
    ).bind(session.userId).run();

    // 4. Write the deletion event BEFORE deleting the user record
    await writeAuditEvent(env, {
      deviceId: session.deviceId,
      sessionId: session.sessionId,
      event: 'USER_SELF_DELETED',
      result: 'SUCCESS',
      ipHash,
    });

    // 5. Delete user (CASCADE removes vault_devices, vault_biometrics, vault_challenges)
    await env.WORKSHOP_DB.prepare(
      `DELETE FROM vault_users WHERE id = ?`,
    ).bind(session.userId).run();

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  };
