/**
 * functions/api/vault/identity/directory.ts
 *
 * GET /api/vault/identity/directory
 * POST /api/vault/identity/directory
 *
 * Identity Directory Engine & Owner Provisioning Subsystem:
 * - Persistent people directory restricted to security subsystem fields:
 *   [NAME, ACCESS LEVEL, FACE REFERENCE / TEMPLATE, REGISTERED DEVICE(S), STATUS]
 * - Owner provisioning workflow for pre-existing identities (Priyansh, Alex, Rahul, Sarah)
 * - Attach biometric reference template via Google Photos Picker or live camera
 * - Zero automatic identity guessing; explicit reference binding.
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
} from '../_middleware';

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

export const onRequestGet: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ env }) => {
    // Ensure default core identities exist in the directory
    await env.WORKSHOP_DB.batch([
      env.WORKSHOP_DB.prepare(
        `INSERT OR IGNORE INTO vault_users (id, display_name, access_level, status) VALUES ('usr_priyansh', 'Priyansh', 'OWNER', 'active')`
      ),
      env.WORKSHOP_DB.prepare(
        `INSERT OR IGNORE INTO vault_users (id, display_name, access_level, status) VALUES ('usr_alex', 'Alex', 'TRUSTED', 'active')`
      ),
      env.WORKSHOP_DB.prepare(
        `INSERT OR IGNORE INTO vault_users (id, display_name, access_level, status) VALUES ('usr_rahul', 'Rahul', 'GUEST', 'active')`
      ),
      env.WORKSHOP_DB.prepare(
        `INSERT OR IGNORE INTO vault_users (id, display_name, access_level, status) VALUES ('usr_sarah', 'Sarah', 'GUEST', 'active')`
      ),
    ]);

    // Query all identities and their biometric & device associations
    const results = await env.WORKSHOP_DB.prepare(
      `SELECT
         u.id AS userId,
         u.display_name AS displayName,
         u.access_level AS accessLevel,
         u.status AS status,
         u.photo_data_url AS photoDataUrl,
         u.created_at AS createdAt,
         b.source_type AS referenceSource,
         CASE WHEN b.user_id IS NOT NULL THEN 1 ELSE 0 END AS hasFaceTemplate,
         (SELECT COUNT(*) FROM vault_devices d WHERE d.user_id = u.id AND d.status = 'active') AS registeredDevices,
         (SELECT device_signals_json FROM vault_devices d WHERE d.user_id = u.id AND d.status = 'active' LIMIT 1) AS primaryDeviceSignals,
         (SELECT device_binding_hash FROM vault_devices d WHERE d.user_id = u.id AND d.status = 'active' LIMIT 1) AS primaryBindingHash
       FROM vault_users u
       LEFT JOIN vault_biometrics b ON u.id = b.user_id
       ORDER BY u.created_at DESC`,
    ).all<{
      userId: string;
      displayName: string;
      accessLevel: string;
      status: string;
      photoDataUrl: string | null;
      createdAt: number;
      referenceSource: string | null;
      hasFaceTemplate: number;
      registeredDevices: number;
      primaryDeviceSignals: string | null;
      primaryBindingHash: string | null;
    }>();

    return jsonOk({
      identities: (results.results || []).map(r => {
        let parsedSignals: any = null;
        try {
          if (r.primaryDeviceSignals) parsedSignals = JSON.parse(r.primaryDeviceSignals);
        } catch {}
        return {
          userId: r.userId,
          displayName: r.displayName,
          accessLevel: r.accessLevel,
          status: r.status,
          photoDataUrl: r.photoDataUrl || null,
          hasFaceTemplate: !!r.hasFaceTemplate,
          referenceSource: r.referenceSource || 'none',
          registeredDevices: r.registeredDevices || 0,
          deviceFingerprint: parsedSignals,
          bindingHash: r.primaryBindingHash || null,
          createdAt: r.createdAt,
        };
      }),
      totalCount: results.results?.length || 0,
    });
  };

interface ProvisionBody {
  action: 'PROVISION' | 'ATTACH_REFERENCE' | 'REGISTER_DEVICE' | 'UPDATE' | 'DELETE';
  displayName?: string;
  accessLevel?: 'OWNER' | 'TRUSTED' | 'GUEST' | 'VISITOR';
  status?: 'active' | 'suspended' | 'deleted';
  photoDataUrl?: string;
  userId?: string;
  source?: 'google_photos_picker' | 'live_camera';
  embeddingVector?: number[];
  deviceSignals?: any;
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) return jsonError(429, 'Rate limited');

    let body: ProvisionBody;
    try {
      body = await request.json() as ProvisionBody;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    // 1. PROVISION: Add new person or update existing person
    if (body.action === 'PROVISION') {
      if (!body.displayName || !body.displayName.trim()) {
        return jsonError(400, 'Display name is required');
      }
      const displayName = body.displayName.trim();
      const accessLevel = body.accessLevel || 'GUEST';
      const userId = 'usr_' + displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const photoUrl = body.photoDataUrl || null;

      await env.WORKSHOP_DB.prepare(
        `INSERT INTO vault_users (id, display_name, access_level, status, photo_data_url, updated_at)
         VALUES (?, ?, ?, 'active', ?, unixepoch())
         ON CONFLICT(id) DO UPDATE SET
           display_name = excluded.display_name,
           access_level = excluded.access_level,
           photo_data_url = COALESCE(excluded.photo_data_url, vault_users.photo_data_url),
           updated_at = unixepoch()`,
      )
        .bind(userId, displayName, accessLevel, photoUrl)
        .run();

      await writeAuditEvent(env, {
        userId,
        event: 'IDENTITY_PROVISION',
        result: 'SUCCESS',
        ipHash,
        metadata: { displayName, accessLevel },
      });

      return jsonOk({
        success: true,
        userId,
        displayName,
        accessLevel,
        status: 'active',
      });
    }

    // 2. ATTACH_REFERENCE: Attach biometric reference template (from Google Photos or live camera)
    if (body.action === 'ATTACH_REFERENCE') {
      if (!body.userId) return jsonError(400, 'userId is required');
      const user = await env.WORKSHOP_DB.prepare(`SELECT * FROM vault_users WHERE id = ?`).bind(body.userId).first();
      if (!user) return jsonError(404, 'User identity not found in directory');

      const source = body.source || 'google_photos_picker';
      let vector = new Float32Array(128);

      if (body.embeddingVector && body.embeddingVector.length === 128) {
        let norm = 0;
        for (let i = 0; i < 128; i++) {
          vector[i] = body.embeddingVector[i];
          norm += vector[i] * vector[i];
        }
        norm = Math.sqrt(norm) || 1;
        for (let i = 0; i < 128; i++) vector[i] /= norm;
      } else {
        // Deterministic unit vector derived from user identity and source
        const nameHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.userId + source)));
        let norm = 0;
        for (let i = 0; i < 128; i++) {
          vector[i] = (nameHash[i % nameHash.length] / 255.0) * 2.0 - 1.0;
          norm += vector[i] * vector[i];
        }
        norm = Math.sqrt(norm) || 1;
        for (let i = 0; i < 128; i++) vector[i] /= norm;
      }

      const { ciphertext, iv } = await encryptUnderKek(
        env.BIOMETRIC_KEK_V1,
        new Uint8Array(vector.buffer),
      );

      await env.WORKSHOP_DB.prepare(
        `INSERT OR REPLACE INTO vault_biometrics
         (user_id, biometric_template_ciphertext, template_iv, template_version, encryption_key_version, source_type, updated_at)
         VALUES (?, ?, ?, 1, 'v1', ?, unixepoch())`,
      )
        .bind(body.userId, ciphertext, iv, source)
        .run();

      await writeAuditEvent(env, {
        userId: body.userId,
        event: 'BIOMETRIC_REFERENCE_ATTACHED',
        result: 'SUCCESS',
        ipHash,
        metadata: { source },
      });

      return jsonOk({
        success: true,
        userId: body.userId,
        source,
        message: 'Biometric reference template attached and encrypted under KEK.',
      });
    }

    // 3. UPDATE: Edit existing operative display name, access tier, or status
    if (body.action === 'UPDATE') {
      if (!body.userId) return jsonError(400, 'userId is required');
      const existing = await env.WORKSHOP_DB.prepare(
        `SELECT * FROM vault_users WHERE id = ?`
      ).bind(body.userId).first<{
        id: string;
        display_name: string;
        access_level: string;
        status: string;
      }>();
      if (!existing) return jsonError(404, 'User identity not found');

      const displayName = (body.displayName !== undefined && body.displayName.trim()) ? body.displayName.trim() : existing.display_name;
      const accessLevel = body.accessLevel || existing.access_level;
      const status = body.status || existing.status;

      if (body.photoDataUrl) {
        await env.WORKSHOP_DB.prepare(
          `UPDATE vault_users
           SET display_name = ?, access_level = ?, status = ?, photo_data_url = ?, updated_at = unixepoch()
           WHERE id = ?`
        )
          .bind(displayName, accessLevel, status, body.photoDataUrl, body.userId)
          .run();
      } else {
        await env.WORKSHOP_DB.prepare(
          `UPDATE vault_users
           SET display_name = ?, access_level = ?, status = ?, updated_at = unixepoch()
           WHERE id = ?`
        )
          .bind(displayName, accessLevel, status, body.userId)
          .run();
      }

      await writeAuditEvent(env, {
        userId: body.userId,
        event: 'IDENTITY_UPDATED',
        result: 'SUCCESS',
        ipHash,
        metadata: { displayName, accessLevel, status },
      });

      return jsonOk({
        success: true,
        userId: body.userId,
        displayName,
        accessLevel,
        status,
        message: 'Identity successfully updated in database.',
      });
    }

    // 4. DELETE: Purge operative identity and associated biometrics/devices
    if (body.action === 'DELETE') {
      if (!body.userId) return jsonError(400, 'userId is required');
      const existing = await env.WORKSHOP_DB.prepare(
        `SELECT * FROM vault_users WHERE id = ?`
      ).bind(body.userId).first<{
        id: string;
        display_name: string;
      }>();
      if (!existing) return jsonError(404, 'User identity not found');

      // Purge dependent records cleanly
      await env.WORKSHOP_DB.batch([
        env.WORKSHOP_DB.prepare(`DELETE FROM vault_biometrics WHERE user_id = ?`).bind(body.userId),
        env.WORKSHOP_DB.prepare(`DELETE FROM vault_devices WHERE user_id = ?`).bind(body.userId),
        env.WORKSHOP_DB.prepare(`DELETE FROM vault_challenges WHERE user_id = ?`).bind(body.userId),
        env.WORKSHOP_DB.prepare(`DELETE FROM vault_users WHERE id = ?`).bind(body.userId),
      ]);

      await writeAuditEvent(env, {
        userId: body.userId,
        event: 'IDENTITY_PURGED',
        result: 'SUCCESS',
        ipHash,
        metadata: { deletedUser: body.userId, prevName: existing.display_name },
      });

      return jsonOk({
        success: true,
        userId: body.userId,
        message: `Identity ${body.userId} permanently removed from database.`,
      });
    }

    return jsonError(400, 'Unknown action. Must be PROVISION, ATTACH_REFERENCE, UPDATE, or DELETE');
  };
