/**
 * functions/api/vault/device/bind.ts
 *
 * POST /api/vault/device/bind
 *
 * First call on panel wake: determines whether this device is free,
 * already bound (returning user → SCAN), or in conflict (different user).
 *
 * The binding hash is ALWAYS computed server-side — the client sends
 * raw signals and we apply HMAC-SHA256 with a server secret, so the
 * client can never spoof its own binding hash value.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  computeDeviceBindingHash,
  checkRateLimit,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface DeviceBindBody {
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

    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) return jsonError(429, 'Rate limited');

    let body: DeviceBindBody;
    try {
      body = await request.json() as DeviceBindBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    if (!body.deviceSignals) return jsonError(400, 'Missing device signals');

    const bindingHash = await computeDeviceBindingHash(body.deviceSignals, env.DEVICE_BINDING_SECRET);

    const device = await env.WORKSHOP_DB.prepare(
      `SELECT d.id, d.user_id, d.status, u.display_name, u.access_level, u.status as user_status
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.device_binding_hash = ? LIMIT 1`,
    )
      .bind(bindingHash)
      .first<{
        id: string; user_id: string; status: string;
        display_name: string; access_level: string; user_status: string;
      }>();

    if (!device) {
      // Unknown device — free to enroll
      return jsonOk({ status: 'free' });
    }

    if (device.status === 'revoked') {
      return jsonOk({ status: 'revoked' });
    }

    if (device.user_status !== 'active') {
      return jsonOk({ status: 'suspended' });
    }

    // Verify that the user associated with this device actually has enrolled biometrics
    const hasBio = await env.WORKSHOP_DB.prepare(
      `SELECT user_id FROM vault_biometrics WHERE user_id = ? LIMIT 1`,
    )
      .bind(device.user_id)
      .first<{ user_id: string }>();

    if (!hasBio) {
      // Incomplete/orphaned enrollment — return 'free' so the client routes cleanly to ENROLL
      return jsonOk({ status: 'free' });
    }

    // Device is active and bound — returning user should use SCAN
    // We deliberately don't return the user's name here (no enumeration pre-auth)
    return jsonOk({
      status: 'bound',
      // Only return minimal non-sensitive info needed to route the UI
      hasWebAuthn: true,
    });
  };
