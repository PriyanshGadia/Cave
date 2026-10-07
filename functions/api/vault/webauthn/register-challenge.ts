/**
 * functions/api/vault/webauthn/register-challenge.ts
 *
 * POST /api/vault/webauthn/register-challenge
 *
 * Step 1 of ENROLL: generates a WebAuthn PublicKeyCredentialCreationOptions
 * challenge. The challenge is stored server-side and must be consumed within
 * 60 seconds during register-complete.
 *
 * Also performs the device conflict pre-check — if this device is already
 * bound to a different user, we deny before any credential is created.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  checkRateLimit,
  computeDeviceBindingHash,
  createChallenge,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface RegisterChallengeBody {
  displayName: string;
  forceReset?: boolean;
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

    // Rate limit: 3 registrations per IP per hour
    const rl = await checkRateLimit(env, 'ip:webauthn_register', ip);
    if (!rl.allowed) {
      await writeAuditEvent(env, { event: 'RATE_LIMITED', result: 'DENIED', ipHash,
        reasonCode: 'webauthn_register' });
      return jsonError(429, `Rate limited. Retry after ${rl.retryAfter}s`);
    }

    let body: RegisterChallengeBody;
    try {
      body = await request.json() as RegisterChallengeBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { displayName, deviceSignals } = body;
    if (!displayName?.trim() || displayName.trim().length > 64) {
      return jsonError(400, 'Invalid display name');
    }
    if (!deviceSignals) return jsonError(400, 'Missing device signals');

    // Compute binding hash server-side (client cannot spoof this)
    const bindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);

    // Device conflict pre-check
    const existingDevice = await env.WORKSHOP_DB.prepare(
      `SELECT id, user_id, status FROM vault_devices WHERE device_binding_hash = ? LIMIT 1`,
    )
      .bind(bindingHash)
      .first<{ id: string; user_id: string; status: string }>();

    if (existingDevice && existingDevice.status === 'active' && !body.forceReset) {
      // Check if the user associated with this device actually has an enrolled biometric template
      const hasBio = await env.WORKSHOP_DB.prepare(
        `SELECT user_id FROM vault_biometrics WHERE user_id = ? LIMIT 1`,
      )
        .bind(existingDevice.user_id)
        .first<{ user_id: string }>();

      if (hasBio) {
        // Device already bound with active biometrics — route to SCAN, not ENROLL
        await writeAuditEvent(env, {
          deviceId: existingDevice.id,
          userId: existingDevice.user_id,
          event: 'DEVICE_CONFLICT',
          result: 'CONFLICT',
          ipHash,
          reasonCode: 'existing_device_enroll_attempt',
        });
        return jsonError(409, 'DEVICE_BOUND');
      }
      // If hasBio is null or forceReset is true, this was an incomplete/orphaned enrollment or user reset.
      // We permit re-registration and clean up the stale device entry.
      await env.WORKSHOP_DB.prepare(
        `DELETE FROM vault_devices WHERE id = ?`,
      ).bind(existingDevice.id).run();
    }

    // Generate challenge
    const { challengeId, challenge } = await createChallenge(env, {
      challengeType: 'WEBAUTHN_REGISTER',
      challengeData: {
        displayName: displayName.trim(),
        deviceBindingHash: bindingHash,
        ipHash,
      },
    });

    const rpId = new URL(env.VAULT_ORIGIN || request.url).hostname;

    return jsonOk({
      challengeId,
      // PublicKeyCredentialCreationOptions fields
      challenge,
      rp: { id: rpId, name: 'VAULT-01' },
      user: {
        // Temporary user handle — real userId assigned at register-complete
        id: challengeId,
        name: displayName.trim(),
        displayName: displayName.trim(),
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7  },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      // Exclude any previously revoked credentials for this device
      excludeCredentials: existingDevice ? [{
        id: existingDevice.id,
        type: 'public-key',
      }] : [],
    });
  };
