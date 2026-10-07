/**
 * functions/api/vault/webauthn/auth-challenge.ts
 *
 * POST /api/vault/webauthn/auth-challenge
 *
 * Step 1 of SCAN: generates a server-originated WebAuthn assertion
 * challenge for an existing enrolled device.
 *
 * The device is looked up by its binding hash so we know which
 * credential to send in allowCredentials[]. If the device is unknown
 * we return a generic error (no account enumeration).
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  computeDeviceBindingHash,
  createChallenge,
  checkRateLimit,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface AuthChallengeBody {
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

    // Rate limit
    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) {
      await writeAuditEvent(env, { event: 'RATE_LIMITED', result: 'DENIED', ipHash });
      return jsonError(429, 'Rate limited');
    }

    let body: AuthChallengeBody;
    try {
      body = await request.json() as AuthChallengeBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    if (!body.deviceSignals) return jsonError(400, 'Missing device signals');

    const bindingHash = await computeDeviceBindingHash(body.deviceSignals, env.DEVICE_BINDING_SECRET);

    const record = await env.WORKSHOP_DB.prepare(
      `SELECT d.id AS device_id, d.user_id, d.webauthn_credential_id, d.status,
              u.access_level
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.device_binding_hash = ? AND d.status = 'active' AND u.status = 'active'
       LIMIT 1`,
    )
      .bind(bindingHash)
      .first<{ device_id: string; user_id: string; webauthn_credential_id: string; status: string; access_level: string }>();

    // No account enumeration — same response shape regardless
    if (!record || !record.webauthn_credential_id) {
      // Issue a dummy challenge so timing is consistent
      const { challengeId, challenge } = await createChallenge(env, {
        challengeType: 'WEBAUTHN_AUTH',
        challengeData: { dummy: true },
      });
      return jsonOk({
        challengeId,
        challenge,
        allowCredentials: [],
        timeout: 60000,
        userVerification: 'required',
      });
    }

    // User Verification policy:
    // - OWNER & TRUSTED: 'required' (authenticator biometric/PIN verification non-negotiable)
    // - GUEST: 'preferred' (presence is verified; live face match provides Layer 1 biometric factor)
    const uvPolicy = (record.access_level === 'OWNER' || record.access_level === 'TRUSTED')
      ? 'required'
      : 'preferred';

    const { challengeId, challenge } = await createChallenge(env, {
      challengeType: 'WEBAUTHN_AUTH',
      userId: record.user_id,
      deviceId: record.device_id,
      challengeData: { deviceBindingHash: bindingHash, targetAccessLevel: record.access_level },
    });

    return jsonOk({
      challengeId,
      challenge,
      allowCredentials: [
        { id: record.webauthn_credential_id, type: 'public-key' },
      ],
      timeout: 60000,
      userVerification: uvPolicy,
    });
  };
