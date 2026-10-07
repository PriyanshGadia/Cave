/**
 * functions/api/vault/visit/create.ts
 *
 * POST /api/vault/visit/create
 *
 * Creates a VISITOR session — no identity required.
 * VISITOR sessions allow the guided tour rail only.
 * If the request already carries a valid vault_sid, the existing
 * session is used (no downgrade).
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  validateSession,
  issueSession,
  checkRateLimit,
  computeDeviceBindingHash,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';
import { CAPABILITIES } from '../capabilities';

interface VisitCreateBody {
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
    const rl = await checkRateLimit(env, 'ip:visit_create', ip);
    if (!rl.allowed) return jsonError(429, 'Rate limited');

    // If already authenticated, don't create a visitor session
    const existing = await validateSession(request, env);
    if (existing) {
      return jsonOk({
        accessLevel: existing.accessLevel,
        capabilities: existing.capabilities,
        existing: true,
      });
    }

    let body: VisitCreateBody;
    try {
      body = await request.json() as VisitCreateBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    if (!body.deviceSignals) return jsonError(400, 'Missing device signals');

    // Create a pseudo-device record for visitor sessions
    // We don't enroll them in vault_devices (no WebAuthn) —
    // instead we use the binding hash as the deviceId directly for the session.
    const bindingHash = await computeDeviceBindingHash(body.deviceSignals, env.DEVICE_BINDING_SECRET);
    // Truncate for visitor device ID (not a real vault_devices record)
    const visitorDeviceId = `vis_${bindingHash.slice(0, 16)}`;

    const { cookieHeader } = await issueSession(env, {
      userId: null,
      deviceId: visitorDeviceId,
      accessLevel: 'VISITOR',
      capabilities: CAPABILITIES.VISITOR,
      ttlSeconds: 1800,
    });

    await writeAuditEvent(env, {
      deviceId: visitorDeviceId,
      event: 'VISIT_SESSION_CREATED',
      result: 'SUCCESS',
      ipHash,
    });

    return new Response(JSON.stringify({
      accessLevel: 'VISITOR',
      capabilities: CAPABILITIES.VISITOR,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    });
  };
