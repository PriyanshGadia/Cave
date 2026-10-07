/**
 * functions/api/vault/biometric/consent.ts
 *
 * POST /api/vault/biometric/consent
 *
 * Records user's affirmative biometric privacy consent and identity declaration
 * prior to any camera/sensor initialization.
 *
 * Enforces DPDP-oriented notice controls:
 * - 11 structured notice sections (itemised personal data, purpose, template encryption)
 * - Device binding declaration (WebAuthn control != legal identity)
 * - Deletion rights notice
 * - Google Photos temporary reference processing notice
 * - Identity declaration & cryptographic declaration digest
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  checkRateLimit,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
  newId,
} from '../_middleware';

interface ConsentRequest {
  action: 'ACCEPT' | 'DECLINE';
  declaredName?: string;
  noticeVersion?: string;
  termsVersion?: string;
  declarationDigest?: string;
  deviceSignals?: {
    userAgent?: string;
    platform?: string;
    canvasHash?: string;
  };
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipH = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) return jsonError(429, 'Rate limited');

    let body: ConsentRequest;
    try {
      body = (await request.json()) as ConsentRequest;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    if (body.action !== 'ACCEPT' && body.action !== 'DECLINE') {
      return jsonError(400, 'Invalid consent action');
    }

    const consentAccepted = body.action === 'ACCEPT';
    const eventId = newId('evt');
    const normalizedName = body.declaredName ? body.declaredName.trim().toUpperCase() : null;
    const noticeVersion = body.noticeVersion || 'DPDP-2026-v2';
    const termsVersion = body.termsVersion || '1.0';

    // Record server-side electronic acceptance audit event
    await writeAuditEvent(env, {
      userId: null,
      deviceId: body.deviceSignals?.canvasHash || null,
      event: 'BIOMETRIC_CONSENT_RECORDED',
      result: consentAccepted ? 'SUCCESS' : 'DENIED',
      ipHash: ipH,
      metadata: {
        action: body.action,
        eventId,
        declaredName: body.declaredName || null,
        normalizedName,
        noticeVersion,
        termsVersion,
        declarationDigest: body.declarationDigest || null,
        devicePlatform: body.deviceSignals?.platform || 'unknown',
        attestationType: 'ELECTRONIC_ACCEPTANCE_RECORDED',
      },
    });

    return jsonOk({
      consentRecorded: consentAccepted,
      action: body.action,
      acceptanceEventId: eventId,
      declaredName: body.declaredName || null,
      normalizedName,
      timestamp: Date.now(),
      noticeVersion,
      termsVersion,
      status: 'ELECTRONIC_ACCEPTANCE_RECORDED',
    });
  };
