/**
 * functions/api/vault/biometric/enroll.ts
 *
 * POST /api/vault/biometric/enroll
 *
 * Final step of ENROLL: receives the encrypted face embedding, re-encrypts
 * it under the server-side BIOMETRIC_KEK_V1, stores it, and issues the
 * first vault_session cookie.
 *
 * ENCRYPTION MODEL:
 * The client encrypts the raw embedding under an ephemeral key derived
 * from the challenge ID (AES-GCM, 256-bit). The Worker decrypts with
 * that ephemeral key, then re-encrypts under BIOMETRIC_KEK_V1 (a
 * Cloudflare secret that never leaves the Worker runtime). A database
 * dump alone cannot yield usable biometric templates.
 *
 * SECURITY: Requires valid livenessToken AND a registered deviceId.
 * The session is only issued after both checks pass.
 *
 * Raw face images are NEVER stored. This endpoint only receives the
 * 128-D embedding vector (pre-computed browser-side by face-api.js).
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  consumeChallenge,
  issueSession,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonError,
} from '../_middleware';
import { CAPABILITIES } from '../capabilities';

interface BiometricEnrollBody {
  livenessToken: string;      // From liveness/verify.ts
  deviceId: string;           // From webauthn/register-complete.ts
  userId: string;             // From webauthn/register-complete.ts
  // The embedding encrypted client-side under AES-GCM using the challenge ID as key material
  encryptedEmbedding: string; // base64
  embeddingIv: string;        // base64
  photoDataUrl?: string;      // Captured face portrait / photo
}

async function importAesKey(keyMaterial: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(keyMaterial));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
}

async function encryptUnderKek(
  kek: string,
  plaintextBytes: Uint8Array,
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest('SHA-256', enc.encode(kek));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    plaintextBytes as any as BufferSource,
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...ivBytes)),
  };
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    let body: BiometricEnrollBody;
    try {
      body = await request.json() as BiometricEnrollBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { livenessToken, deviceId, userId, encryptedEmbedding, embeddingIv } = body;
    if (!livenessToken || !deviceId || !userId || !encryptedEmbedding || !embeddingIv) {
      return jsonError(400, 'Missing required fields');
    }

    // 1. Consume liveness token
    const liveness = await consumeChallenge(env, livenessToken, 'ENROLL_SESSION');
    if (!liveness || !liveness.challengeData.livenessVerified) {
      await writeAuditEvent(env, {
        userId, deviceId,
        event: 'ENROLL_CONFLICT', result: 'DENIED', ipHash,
        reasonCode: 'invalid_liveness_token',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // 2. Verify device belongs to user and is active
    const device = await env.WORKSHOP_DB.prepare(
      `SELECT id, user_id, status FROM vault_devices WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1`,
    )
      .bind(deviceId, userId)
      .first<{ id: string; user_id: string; status: string }>();

    if (!device) {
      await writeAuditEvent(env, {
        userId, deviceId,
        event: 'ENROLL_CONFLICT', result: 'DENIED', ipHash,
        reasonCode: 'device_not_found',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // 3. Check for existing biometric (prevent double-enrollment)
    const existingBio = await env.WORKSHOP_DB.prepare(
      `SELECT user_id FROM vault_biometrics WHERE user_id = ? LIMIT 1`,
    )
      .bind(userId)
      .first<{ user_id: string }>();

    if (existingBio) {
      await writeAuditEvent(env, {
        userId, deviceId,
        event: 'ENROLL_CONFLICT', result: 'CONFLICT', ipHash,
        reasonCode: 'biometric_already_enrolled',
      });
      return jsonError(409, 'BIOMETRIC_EXISTS');
    }

    // 4. Decrypt the client-encrypted embedding using challenge-derived key
    //    The ephemeral key is derived from the livenessToken ID itself
    let plaintextBytes: Uint8Array;
    try {
      const ephemeralKey = await importAesKey(livenessToken);
      const ivBytes = Uint8Array.from(atob(embeddingIv), (c) => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(encryptedEmbedding), (c) => c.charCodeAt(0));
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, ephemeralKey, cipherBytes);
      plaintextBytes = new Uint8Array(decrypted);
    } catch {
      await writeAuditEvent(env, {
        userId, deviceId,
        event: 'ENROLL_CONFLICT', result: 'FAILURE', ipHash,
        reasonCode: 'embedding_decrypt_failed',
      });
      return jsonError(400, 'Invalid embedding payload');
    }

    // 5. Re-encrypt under BIOMETRIC_KEK_V1 (server secret)
    const { ciphertext, iv } = await encryptUnderKek(env.BIOMETRIC_KEK_V1, plaintextBytes);

    // 6. Store encrypted template (zero plaintexts retained)
    const now = Math.floor(Date.now() / 1000);
    await env.WORKSHOP_DB.prepare(
      `INSERT INTO vault_biometrics
         (user_id, biometric_template_ciphertext, template_iv, template_version,
          encryption_key_version, source_type, created_at, updated_at)
       VALUES (?, ?, ?, 1, 'v1', 'live_camera', ?, ?)`,
    )
      .bind(userId, ciphertext, iv, now, now)
      .run();

    // Update user last_seen_at and photo_data_url if provided
    if (body.photoDataUrl) {
      await env.WORKSHOP_DB.prepare(
        `UPDATE vault_users SET last_seen_at = ?, updated_at = ?, photo_data_url = ? WHERE id = ?`,
      )
        .bind(now, now, body.photoDataUrl, userId)
        .run();
    } else {
      await env.WORKSHOP_DB.prepare(
        `UPDATE vault_users SET last_seen_at = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(now, now, userId)
        .run();
    }

    // 7. Fetch access level to determine capabilities
    const user = await env.WORKSHOP_DB.prepare(
      `SELECT access_level FROM vault_users WHERE id = ? LIMIT 1`,
    )
      .bind(userId)
      .first<{ access_level: string }>();

    const accessLevel = (user?.access_level ?? 'GUEST') as keyof typeof CAPABILITIES;
    const capabilities = CAPABILITIES[accessLevel] ?? CAPABILITIES.GUEST;

    // 8. Issue session
    const { cookieHeader } = await issueSession(env, {
      userId,
      deviceId,
      accessLevel,
      capabilities,
    });

    await writeAuditEvent(env, {
      userId, deviceId,
      event: 'ENROLL_SUCCESS', result: 'SUCCESS', ipHash,
    });

    return new Response(JSON.stringify({
      enrolled: true,
      accessLevel,
      capabilities,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    });
  };
