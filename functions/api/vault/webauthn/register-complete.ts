/**
 * functions/api/vault/webauthn/register-complete.ts
 *
 * POST /api/vault/webauthn/register-complete
 *
 * Step 2 of ENROLL: verifies the WebAuthn attestation response, creates
 * vault_users and vault_devices records. No session is issued here —
 * that happens only after face enrollment completes successfully.
 *
 * SECURITY: All challenge verification is server-side. The client cannot
 * self-certify. This endpoint is intentionally strict.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  consumeChallenge,
  computeDeviceBindingHash,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
  newId,
} from '../_middleware';

interface RegisterCompleteBody {
  challengeId: string;
  // Attestation response from navigator.credentials.create()
  attestationResponse: {
    id: string;           // credential ID, base64url
    rawId: string;        // same, base64url
    type: 'public-key';
    response: {
      attestationObject: string; // base64url
      clientDataJSON: string;    // base64url
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
  displayName: string;
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Extract the COSE-encoded public key from the authenticator data.
 * This is a minimal parser — we only need to store the COSE bytes,
 * not fully parse the credential public key at registration time.
 * Full signature verification happens at auth-complete using Web Crypto.
 */
function extractAuthData(authDataBytes: Uint8Array): {
  rpIdHash: Uint8Array;
  flags: number;
  signCount: number;
  credentialId: Uint8Array | null;
  cosePublicKey: Uint8Array | null;
} {
  let offset = 0;
  const rpIdHash = authDataBytes.slice(offset, (offset += 32));
  const flags = authDataBytes[offset++];
  const signCount = new DataView(authDataBytes.buffer, authDataBytes.byteOffset + offset).getUint32(0, false);
  offset += 4;

  // AT flag (0x40) = attested credential data present
  if (!(flags & 0x40) || authDataBytes.length <= offset) {
    return { rpIdHash, flags, signCount, credentialId: null, cosePublicKey: null };
  }

  offset += 16; // Skip AAGUID
  const credIdLen = new DataView(authDataBytes.buffer, authDataBytes.byteOffset + offset).getUint16(0, false);
  offset += 2;
  const credentialId = authDataBytes.slice(offset, (offset += credIdLen));
  // Everything remaining is the COSE-encoded public key (CBOR)
  const cosePublicKey = authDataBytes.slice(offset);

  return { rpIdHash, flags, signCount, credentialId, cosePublicKey };
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    let body: RegisterCompleteBody;
    try {
      body = await request.json() as RegisterCompleteBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { challengeId, attestationResponse, deviceSignals, displayName } = body;
    if (!challengeId || !attestationResponse || !deviceSignals) {
      return jsonError(400, 'Missing fields');
    }

    // Consume challenge (marks it USED immediately — prevents replay)
    const stored = await consumeChallenge(env, challengeId, 'WEBAUTHN_REGISTER');
    if (!stored) {
      return jsonError(409, 'Challenge expired or already used');
    }

    // --- Verify clientDataJSON ---
    const clientDataBytes = base64urlDecode(attestationResponse.response.clientDataJSON);
    let clientData: { type: string; challenge: string; origin: string };
    try {
      clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
    } catch {
      return jsonError(400, 'Invalid clientDataJSON');
    }

    if (clientData.type !== 'webauthn.create') {
      return jsonError(400, 'Wrong operation type');
    }

    // Challenge match
    if (clientData.challenge !== stored.challenge) {
      await writeAuditEvent(env, { event: 'WEBAUTHN_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'challenge_mismatch' });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Origin check
    const expectedOrigin = env.VAULT_ORIGIN || new URL(request.url).origin;
    if (clientData.origin !== expectedOrigin) {
      await writeAuditEvent(env, { event: 'WEBAUTHN_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'origin_mismatch' });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // --- Parse attestation object (we accept 'none' attestation only) ---
    // The attestationObject is CBOR but we just need the authData field.
    // For 'none' fmt, we parse authData from the raw bytes (simplified CBOR walk).
    const attestationBytes = base64urlDecode(attestationResponse.response.attestationObject);

    // Minimal CBOR extraction: find authData key in the map.
    // We rely on the authenticator following the spec structure.
    // For a production deployment, replace this with a full CBOR library.
    // The authData always starts at a known offset for 'none' attestation.
    let authDataBytes: Uint8Array;
    try {
      // Locate 'authData' key in CBOR map (0x68 = text(8) for "authData")
      const authDataKey = new TextEncoder().encode('authData');
      let i = 0;
      while (i < attestationBytes.length) {
        // Try to match the key
        const match = authDataKey.every((b, k) => attestationBytes[i + 1 + k] === b);
        if (attestationBytes[i] === 0x68 && match) {
          i += 1 + authDataKey.length;
          // Next byte(s) encode the length of authData bytes
          const lenByte = attestationBytes[i];
          let authDataLen: number;
          let lenBytes = 1;
          if (lenByte <= 0x17) {
            authDataLen = lenByte;
          } else if (lenByte === 0x58) {
            authDataLen = attestationBytes[i + 1];
            lenBytes = 2;
          } else if (lenByte === 0x59) {
            authDataLen = (attestationBytes[i + 1] << 8) | attestationBytes[i + 2];
            lenBytes = 3;
          } else {
            break;
          }
          authDataBytes = attestationBytes.slice(i + lenBytes, i + lenBytes + authDataLen);
          break;
        }
        i++;
      }
      if (!authDataBytes!) throw new Error('authData not found');
    } catch {
      return jsonError(400, 'Cannot parse attestation object');
    }

    const authData = extractAuthData(authDataBytes!);

    // Verify RP ID hash
    const rpId = new URL(expectedOrigin).hostname;
    const expectedRpIdHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId)),
    );
    if (!expectedRpIdHash.every((b, i) => b === authData.rpIdHash[i])) {
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // UV flag (0x04) must be set (user verification required)
    if (!(authData.flags & 0x04)) {
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    if (!authData.credentialId || !authData.cosePublicKey) {
      return jsonError(400, 'No credential data in authenticator response');
    }

    // Re-verify device binding hash matches what was stored in the challenge
    const bindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);
    if (bindingHash !== (stored.challengeData.deviceBindingHash as string)) {
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    const credentialId = base64urlEncode(authData.credentialId);
    const publicKey = base64urlEncode(authData.cosePublicKey);

    // --- Create vault_users and vault_devices records ---
    const userId = newId('usr', 12);
    const deviceId = newId('dev', 12);
    const now = Math.floor(Date.now() / 1000);

    await env.WORKSHOP_DB.prepare(
      `INSERT INTO vault_users (id, display_name, access_level, status, created_at, updated_at)
       VALUES (?, ?, 'GUEST', 'active', ?, ?)`,
    )
      .bind(userId, displayName.trim(), now, now)
      .run();

    // Extract COSE algorithm identifier from cosePublicKey (default -7 for ES256)
    let webauthnAlg = -7;
    try {
      if (authData.cosePublicKey) {
        for (let idx = 0; idx < authData.cosePublicKey.length - 3; idx++) {
          if (authData.cosePublicKey[idx] === 0x03 &&
              authData.cosePublicKey[idx + 1] === 0x39 &&
              authData.cosePublicKey[idx + 2] === 0x01 &&
              authData.cosePublicKey[idx + 3] === 0x00) {
            webauthnAlg = -257; // RS256
            break;
          }
        }
      }
    } catch {}

    await env.WORKSHOP_DB.prepare(
      `INSERT OR REPLACE INTO vault_devices
         (id, user_id, device_binding_hash, webauthn_credential_id, webauthn_public_key,
          webauthn_alg, sign_count, device_signals_json, status, first_seen_at, last_seen_at, last_ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    )
      .bind(
        deviceId,
        userId,
        bindingHash,
        credentialId,
        publicKey,
        webauthnAlg,
        authData.signCount,
        JSON.stringify(deviceSignals),
        now,
        now,
        ipHash,
      )
      .run();

    await writeAuditEvent(env, {
      userId,
      deviceId,
      event: 'WEBAUTHN_REGISTER_SUCCESS',
      result: 'SUCCESS',
      ipHash,
    });

    // Return userId + deviceId — session NOT issued yet.
    // The ENROLL flow continues with face enrollment.
    return jsonOk({ userId, deviceId, status: 'DEVICE_REGISTERED' });
  };
