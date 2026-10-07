/**
 * functions/api/vault/identity/conflict.ts
 *
 * POST /api/vault/identity/check-conflict
 *
 * Checks device and identity status prior to enrollment.
 * Avoids any searchable deterministic biometric hash (embedding_hash removed).
 *
 * Conflict rules:
 *   1. Device already bound & active with biometric template -> returning user -> SCAN
 *   2. Device registered with WebAuthn credential but mid-enroll -> CONTINUE_ENROLL
 *   3. Device bound to revoked or suspended identity -> DENY
 *   4. Unbound device -> ENROLL
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  computeDeviceBindingHash,
  checkRateLimit,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface ConflictCheckBody {
  deviceSignals: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    screenColorDepth: number;
    timezone: string;
    canvasHash: string;
  };
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) return jsonError(429, 'Rate limited');

    let body: ConflictCheckBody;
    try {
      body = await request.json() as ConflictCheckBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { deviceSignals } = body;
    if (!deviceSignals) return jsonError(400, 'Missing device signals');

    const deviceBindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);

    // Check if this device is already bound to a user
    const deviceRecord = await env.WORKSHOP_DB.prepare(
      `SELECT d.id, d.user_id, d.status AS device_status, u.status AS user_status
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.device_binding_hash = ? LIMIT 1`,
    )
      .bind(deviceBindingHash)
      .first<{ id: string; user_id: string; device_status: string; user_status: string }>();

    if (deviceRecord) {
      if (deviceRecord.device_status === 'revoked' || deviceRecord.user_status === 'suspended') {
        await writeAuditEvent(env, {
          userId: deviceRecord.user_id,
          deviceId: deviceRecord.id,
          event: 'DEVICE_CONFLICT',
          result: 'DENIED',
          ipHash,
          reasonCode: 'revoked_or_suspended_device',
        });
        return jsonOk({ conflict: 'device_revoked', action: 'DENY' });
      }

      // Check if user has enrolled biometrics
      const bioRecord = await env.WORKSHOP_DB.prepare(
        `SELECT user_id FROM vault_biometrics WHERE user_id = ? LIMIT 1`,
      )
        .bind(deviceRecord.user_id)
        .first<{ user_id: string }>();

      if (bioRecord) {
        // Enrolled user on this device -> Route to SCAN
        return jsonOk({ conflict: 'returning_user', action: 'SCAN' });
      } else {
        // Device credential created but biometric enrollment pending
        return jsonOk({ conflict: 'device_registered_no_face', action: 'CONTINUE_ENROLL' });
      }
    }

    // Fresh unbound device -> proceed with enrollment
    return jsonOk({ conflict: null, action: 'ENROLL' });
  };
