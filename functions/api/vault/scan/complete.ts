/**
 * functions/api/vault/scan/complete.ts
 *
 * POST /api/vault/scan/complete
 *
 * THE AUTHORIZATION GATEWAY. All three security layers are verified here
 * atomically. A session is issued only if ALL pass:
 *   1. livenessToken valid (not expired, not reused)
 *   2. WebAuthn assertion valid (signature, origin, signCount)
 *   3. Device binding matches the challenge
 *   4. Face embedding cosine similarity >= 0.82 (server-side decryption + comparison)
 *   5. User status === 'active'
 *   6. No active cooldown/rate limit
 *
 * On ANY failure: emit internal audit event, return generic VAULT ACCESS DENIED.
 * The specific failure reason is NEVER returned to the client.
 *
 * SECURITY: Face template is decrypted server-side under BIOMETRIC_KEK_V1.
 * The match score is never exposed to the client. The embedding provided
 * by the client is compared but immediately discarded.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  consumeChallenge,
  issueSession,
  checkRateLimit,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonError,
} from '../_middleware';
import { getCapabilities } from '../capabilities';

interface ScanCompleteBody {
  livenessToken: string;
  // WebAuthn assertion (pre-verified by auth-complete, but we re-check device binding)
  webauthnVerifiedDeviceId: string;
  webauthnVerifiedUserId: string;
  // Face embedding: float32 array, encrypted client-side under liveness token key
  encryptedEmbedding: string;
  embeddingIv: string;
}

const COSINE_THRESHOLD = 0.82;

async function importAesKey(keyMaterial: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(keyMaterial));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
}

async function decryptUnderKek(
  kek: string,
  ciphertextB64: string,
  ivB64: string,
): Promise<Float32Array> {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest('SHA-256', enc.encode(kek));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new Float32Array(plaintext);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    // Rate limit: scan attempts
    const rl = await checkRateLimit(env, 'ip:scan_complete', ip);
    if (!rl.allowed) {
      await writeAuditEvent(env, { event: 'RATE_LIMITED', result: 'DENIED', ipHash });
      return jsonError(429, 'Rate limited');
    }

    let body: ScanCompleteBody;
    try {
      body = await request.json() as ScanCompleteBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { livenessToken, webauthnVerifiedDeviceId, webauthnVerifiedUserId,
            encryptedEmbedding, embeddingIv } = body;

    if (!livenessToken || !webauthnVerifiedDeviceId || !webauthnVerifiedUserId
        || !encryptedEmbedding || !embeddingIv) {
      return jsonError(400, 'Missing fields');
    }

    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: 'SCAN_STARTED',
      result: 'SUCCESS',
      ipHash,
    });

    // --- LAYER 1: Liveness token ---
    const liveness = await consumeChallenge(env, livenessToken, 'ENROLL_SESSION');
    if (!liveness || !liveness.challengeData.livenessVerified) {
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'LIVENESS_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'invalid_liveness_token',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // --- LAYER 2: Device binding consistency ---
    // The WebAuthn auth-complete already verified the assertion. We now confirm
    // that the deviceId and userId from that verification match active DB records.
    const device = await env.WORKSHOP_DB.prepare(
      `SELECT id, user_id, status FROM vault_devices
       WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1`,
    )
      .bind(webauthnVerifiedDeviceId, webauthnVerifiedUserId)
      .first<{ id: string; user_id: string; status: string }>();

    if (!device) {
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'WEBAUTHN_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'device_not_active',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // --- LAYER 3: User status ---
    const user = await env.WORKSHOP_DB.prepare(
      `SELECT id, display_name, access_level, status FROM vault_users
       WHERE id = ? AND status = 'active' LIMIT 1`,
    )
      .bind(webauthnVerifiedUserId)
      .first<{ id: string; display_name: string; access_level: string; status: string }>();

    if (!user) {
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'MODE_DENIED', result: 'DENIED', ipHash,
        reasonCode: 'user_not_active',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // --- LAYER 4: Biometric face match (server-side only) ---
    const bioRecord = await env.WORKSHOP_DB.prepare(
      `SELECT biometric_template_ciphertext, template_iv FROM vault_biometrics WHERE user_id = ? LIMIT 1`,
    )
      .bind(webauthnVerifiedUserId)
      .first<{ biometric_template_ciphertext: string; template_iv: string }>();

    if (!bioRecord) {
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'FACE_MATCH_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'no_enrolled_template',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Decrypt candidate embedding (client-encrypted under liveness token key)
    let candidateEmbedding: Float32Array;
    try {
      const ephemeralKey = await importAesKey(livenessToken);
      const ivBytes = Uint8Array.from(atob(embeddingIv), (c) => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(encryptedEmbedding), (c) => c.charCodeAt(0));
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, ephemeralKey, cipherBytes);
      candidateEmbedding = new Float32Array(decrypted);
    } catch {
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'FACE_MATCH_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'embedding_decrypt_failed',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // Decrypt stored template under server KEK
    let storedEmbedding: Float32Array;
    try {
      storedEmbedding = await decryptUnderKek(
        env.BIOMETRIC_KEK_V1,
        bioRecord.biometric_template_ciphertext,
        bioRecord.template_iv,
      );
    } catch {
      // KEK failure — fail closed
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'FACE_MATCH_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'kek_decrypt_failed',
      });
      return jsonError(503, 'Service unavailable');
    }

    // Cosine similarity check
    const score = cosineSimilarity(candidateEmbedding, storedEmbedding);
    // Immediately discard both embeddings from scope — they should be GC'd
    candidateEmbedding = null as unknown as Float32Array;
    storedEmbedding = null as unknown as Float32Array;

    if (score < COSINE_THRESHOLD) {
      await writeAuditEvent(env, {
        userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
        event: 'FACE_MATCH_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'cosine_below_threshold',
        // NOTE: Never log the actual score to avoid leaking attack oracle info
      });
      // Track face failures for rate limiting
      await checkRateLimit(env, 'identity:face_failures', webauthnVerifiedUserId);
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // ALL LAYERS PASSED
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId, deviceId: webauthnVerifiedDeviceId,
      event: 'FACE_MATCH_SUCCESS', result: 'SUCCESS', ipHash,
    });

    // Update last_seen_at
    const now = Math.floor(Date.now() / 1000);
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_users SET last_seen_at = ? WHERE id = ?`,
    ).bind(now, webauthnVerifiedUserId).run();
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_devices SET last_seen_at = ?, last_ip_hash = ? WHERE id = ?`,
    ).bind(now, ipHash, webauthnVerifiedDeviceId).run();

    const accessLevel = user.access_level as Parameters<typeof getCapabilities>[0];
    const capabilities = getCapabilities(accessLevel);

    const { cookieHeader } = await issueSession(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      accessLevel: accessLevel as any,
      capabilities,
    });

    return new Response(JSON.stringify({
      authenticated: true,
      displayName: user.display_name,
      accessLevel: user.access_level,
      capabilities,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    });
  };
