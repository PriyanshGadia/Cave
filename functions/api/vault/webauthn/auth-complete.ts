/**
 * functions/api/vault/webauthn/auth-complete.ts
 *
 * POST /api/vault/webauthn/auth-complete
 *
 * Step 2 of SCAN: verifies the WebAuthn assertion against the stored
 * COSE public key. On success, updates sign_count and returns deviceId/userId.
 *
 * IMPORTANT: This does NOT issue a session. A session is only issued by
 * /api/vault/scan/complete after ALL three layers pass (liveness + face + WebAuthn).
 *
 * SECURITY: signCount monotonicity is enforced to prevent credential cloning.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  consumeChallenge,
  computeDeviceBindingHash,
  checkRateLimit,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface AuthCompleteBody {
  challengeId: string;
  assertionResponse: {
    id: string;           // credential ID, base64url
    rawId: string;
    type: 'public-key';
    response: {
      authenticatorData: string; // base64url
      clientDataJSON: string;    // base64url
      signature: string;         // base64url
      userHandle?: string;
    };
  };
  deviceSignals: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    screenColorDepth: number;
    timezone: string;
    canvasHash: string;
  };
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/**
 * Import a COSE ES256 or RS256 public key for signature verification.
 * We store raw COSE bytes (CBOR-encoded) at registration time.
 * This is a minimal CBOR parser that handles the two most common key types.
 */
async function importCoseKey(coseBytes: Uint8Array): Promise<CryptoKey> {
  // Minimal CBOR map parser to extract kty, alg, x, y (EC) or n, e (RSA)
  // COSE key map: { 1: kty, 3: alg, -1: crv/n, -2: x/e, -3: y }
  const map: Record<number, Uint8Array | number> = {};
  let i = 0;

  const readUint = (): number => {
    const b = coseBytes[i++];
    const info = b & 0x1f;
    if (info <= 23) return info;
    if (info === 24) return coseBytes[i++];
    if (info === 25) { const v = (coseBytes[i] << 8) | coseBytes[i + 1]; i += 2; return v; }
    return 0;
  };

  const readItem = (): Uint8Array | number => {
    const b = coseBytes[i];
    const major = (b >> 5) & 0x07;
    if (major === 0) { return readUint(); } // Unsigned int
    if (major === 1) { // Negative int
      return -(readUint() + 1);
    }
    if (major === 2) { // Byte string
      const len = readUint();
      const bytes = coseBytes.slice(i, i + len);
      i += len;
      return bytes;
    }
    i++;
    return 0;
  };

  // Parse the outer map
  const mapByte = coseBytes[i++];
  const mapLen = mapByte & 0x1f;
  for (let k = 0; k < mapLen; k++) {
    const key = readItem() as number;
    const value = readItem();
    map[key] = value;
  }

  const kty = map[1] as number;
  const alg = map[3] as number;

  if (kty === 2 && alg === -7) {
    // EC P-256
    const x = map[-2] as Uint8Array;
    const y = map[-3] as Uint8Array;
    const jwk = {
      kty: 'EC', crv: 'P-256',
      x: btoa(String.fromCharCode(...x)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
      y: btoa(String.fromCharCode(...y)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    };
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  }

  if (kty === 3 && alg === -257) {
    // RSA-PKCS1-v1_5 (RS256)
    const n = map[-1] as Uint8Array;
    const e = map[-2] as Uint8Array;
    const jwk = {
      kty: 'RSA', alg: 'RS256',
      n: btoa(String.fromCharCode(...n)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
      e: btoa(String.fromCharCode(...e)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    };
    return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }

  throw new Error(`Unsupported COSE key type: kty=${kty}, alg=${alg}`);
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    // Rate limit: scan attempts per IP
    const rl = await checkRateLimit(env, 'ip:scan_complete', ip);
    if (!rl.allowed) {
      await writeAuditEvent(env, { event: 'RATE_LIMITED', result: 'DENIED', ipHash });
      return jsonError(429, 'Rate limited');
    }

    let body: AuthCompleteBody;
    try {
      body = await request.json() as AuthCompleteBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { challengeId, assertionResponse, deviceSignals } = body;
    if (!challengeId || !assertionResponse || !deviceSignals) {
      return jsonError(400, 'Missing fields');
    }

    // Consume challenge
    const stored = await consumeChallenge(env, challengeId, 'WEBAUTHN_AUTH');
    if (!stored) {
      return jsonError(409, 'Challenge expired or already used');
    }

    // Verify device binding hasn't changed
    const bindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);
    const storedHash = stored.challengeData.deviceBindingHash as string;
    if (storedHash && bindingHash !== storedHash) {
      await writeAuditEvent(env, {
        userId: stored.userId,
        deviceId: stored.deviceId,
        event: 'DEVICE_CONFLICT',
        result: 'DENIED',
        ipHash,
        reasonCode: 'binding_hash_mismatch',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Fetch device and user record
    if (!stored.deviceId) return jsonError(401, 'VAULT ACCESS DENIED');
    const device = await env.WORKSHOP_DB.prepare(
      `SELECT d.id, d.user_id, d.webauthn_credential_id, d.webauthn_public_key,
              d.webauthn_alg, d.sign_count, d.status, u.access_level
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.id = ? AND d.status = 'active' AND u.status = 'active'
       LIMIT 1`,
    )
      .bind(stored.deviceId)
      .first<{
        id: string; user_id: string; webauthn_credential_id: string;
        webauthn_public_key: string; webauthn_alg: number; sign_count: number;
        status: string; access_level: string;
      }>();

    if (!device || !device.webauthn_public_key) {
      await writeAuditEvent(env, { event: 'WEBAUTHN_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'no_credential' });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Verify clientDataJSON
    const clientDataBytes = base64urlDecode(assertionResponse.response.clientDataJSON);
    let clientData: { type: string; challenge: string; origin: string };
    try {
      clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
    } catch {
      return jsonError(400, 'Invalid clientDataJSON');
    }

    if (clientData.type !== 'webauthn.get') {
      return jsonError(401, 'VAULT ACCESS DENIED');
    }
    if (clientData.challenge !== stored.challenge) {
      await writeAuditEvent(env, { event: 'WEBAUTHN_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'challenge_mismatch', userId: device.user_id, deviceId: device.id });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    const expectedOrigin = env.VAULT_ORIGIN || new URL(request.url).origin;
    if (clientData.origin !== expectedOrigin) {
      await writeAuditEvent(env, { event: 'WEBAUTHN_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'origin_mismatch', userId: device.user_id, deviceId: device.id });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Verify RP ID hash in authenticatorData
    const authDataBytes = base64urlDecode(assertionResponse.response.authenticatorData);
    const rpId = new URL(expectedOrigin).hostname;
    const expectedRpIdHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId)),
    );
    if (!expectedRpIdHash.every((b, i) => b === authDataBytes[i])) {
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Authenticator flags verification
    const flags = authDataBytes[32];
    // User Presence (UP, bit 0x01) is mandatory across all tiers
    if (!(flags & 0x01)) {
      await writeAuditEvent(env, {
        event: 'WEBAUTHN_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'user_presence_missing',
        userId: device.user_id, deviceId: device.id,
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // User Verification (UV, bit 0x04) is non-negotiable for OWNER and TRUSTED tiers
    if (device.access_level === 'OWNER' || device.access_level === 'TRUSTED') {
      if (!(flags & 0x04)) {
        await writeAuditEvent(env, {
          event: 'WEBAUTHN_FAILURE', result: 'DENIED', ipHash,
          reasonCode: 'user_verification_required_for_tier',
          userId: device.user_id, deviceId: device.id,
          metadata: { accessLevel: device.access_level },
        });
        return jsonError(401, 'VAULT ACCESS DENIED');
      }
    }

    // Extract signCount from authenticatorData (bytes 33–36, big-endian)
    const newSignCount = new DataView(authDataBytes.buffer, authDataBytes.byteOffset + 33).getUint32(0, false);

    // WebAuthn signature counter verification (spec-compliant clone detection):
    // - stored === 0 && current === 0: valid (counter unsupported by hardware)
    // - stored === 0 && current > 0: valid (authenticator started providing counters)
    // - stored > 0 && current > stored: valid (normal monotonic progression)
    // - stored > 0 && current <= stored: security anomaly / cloned authenticator -> DENY
    if (device.sign_count > 0 && newSignCount <= device.sign_count) {
      await writeAuditEvent(env, {
        event: 'WEBAUTHN_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'sign_count_clone_anomaly',
        userId: device.user_id, deviceId: device.id,
        metadata: { received: newSignCount, stored: device.sign_count },
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Verify signature
    const signature = base64urlDecode(assertionResponse.response.signature);
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', clientDataBytes as any as BufferSource),
    );
    const verificationData = new Uint8Array(authDataBytes.length + clientDataHash.length);
    verificationData.set(authDataBytes);
    verificationData.set(clientDataHash, authDataBytes.length);

    const cosePublicKeyBytes = base64urlDecode(device.webauthn_public_key);
    let publicKey: CryptoKey;
    try {
      publicKey = await importCoseKey(cosePublicKeyBytes);
    } catch {
      return jsonError(500, 'Key import failed');
    }

    // Use explicit COSE algorithm stored at registration (eliminating length heuristics)
    const algorithm = (device.webauthn_alg === -257)
      ? { name: 'RSASSA-PKCS1-v1_5' }
      : { name: 'ECDSA', hash: 'SHA-256' };

    const valid = await crypto.subtle.verify(
      algorithm,
      publicKey,
      signature as any as BufferSource,
      verificationData as any as BufferSource,
    );
    if (!valid) {
      await writeAuditEvent(env, {
        event: 'WEBAUTHN_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'signature_invalid',
        userId: device.user_id, deviceId: device.id,
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Update sign_count (replay prevention)
    const now = Math.floor(Date.now() / 1000);
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_devices SET sign_count = ?, last_seen_at = ?, last_ip_hash = ? WHERE id = ?`,
    )
      .bind(newSignCount, now, ipHash, device.id)
      .run();

    await writeAuditEvent(env, {
      userId: device.user_id, deviceId: device.id,
      event: 'WEBAUTHN_SUCCESS', result: 'SUCCESS', ipHash,
    });

    // Return IDs — scan/complete will use these to finalize the full auth check
    return jsonOk({
      webauthnVerified: true,
      deviceId: device.id,
      userId: device.user_id,
    });
  };
