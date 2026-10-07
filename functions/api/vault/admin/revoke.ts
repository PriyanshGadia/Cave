/**
 * functions/api/vault/admin/revoke.ts
 *
 * POST /api/vault/admin/revoke
 *
 * Revokes a device or user. Only callable by OWNER sessions.
 * Revocation is immediate — the target's sessions are invalidated
 * and their device binding is marked revoked.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  requireSession,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface RevokeBody {
  target: 'device' | 'user';
  targetId: string;
  reason?: string;
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    let session;
    try {
      session = await requireSession(request, env, 'OWNER');
    } catch (resp) {
      return resp as Response;
    }

    if (!session.capabilities.ownerControls) {
      return jsonError(403, 'VAULT ACCESS DENIED');
    }

    let body: RevokeBody;
    try {
      body = await request.json() as RevokeBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { target, targetId, reason } = body;
    if (!target || !targetId) return jsonError(400, 'Missing fields');

    const now = Math.floor(Date.now() / 1000);

    if (target === 'device') {
      // Revoke the specific device
      await env.WORKSHOP_DB.prepare(
        `UPDATE vault_devices SET status = 'revoked' WHERE id = ?`,
      ).bind(targetId).run();

      // Revoke all active sessions for this device
      await env.WORKSHOP_DB.prepare(
        `UPDATE vault_sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL`,
      ).bind(now, targetId).run();

      await writeAuditEvent(env, {
        userId: session.userId,
        deviceId: targetId,
        sessionId: session.sessionId,
        event: 'SESSION_REVOKED',
        result: 'SUCCESS',
        ipHash,
        reasonCode: reason ?? 'admin_revoke',
        metadata: { target: 'device', revokedBy: session.userId },
      });
    } else if (target === 'user') {
      // Suspend the user account
      await env.WORKSHOP_DB.prepare(
        `UPDATE vault_users SET status = 'suspended', updated_at = ? WHERE id = ?`,
      ).bind(now, targetId).run();

      // Revoke all sessions for this user
      await env.WORKSHOP_DB.prepare(
        `UPDATE vault_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
      ).bind(now, targetId).run();

      await writeAuditEvent(env, {
        userId: targetId,
        sessionId: session.sessionId,
        event: 'SESSION_REVOKED',
        result: 'SUCCESS',
        ipHash,
        reasonCode: reason ?? 'admin_suspend',
        metadata: { target: 'user', revokedBy: session.userId },
      });
    } else {
      return jsonError(400, 'Invalid target type');
    }

    return jsonOk({ revoked: true, target, targetId });
  };
