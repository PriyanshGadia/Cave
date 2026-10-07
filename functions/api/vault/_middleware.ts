/**
 * functions/api/vault/_middleware.ts
 *
 * Shared security middleware for all /api/vault/* routes.
 * Provides: rate limiting, session validation, audit logging,
 * device binding hash computation, and capability guards.
 *
 * SECURITY RULE: This file is the sole authority on what constitutes
 * a valid vault session. No route may bypass these checks.
 */

import type { KVNamespace } from '@cloudflare/workers-types';

// ---------------------------------------------------------------------------
// Schema Notice: Deterministic migrations are applied via wrangler d1 migrations.
// Tables are guaranteed to exist prior to request handling.
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccessLevel = 'VISITOR' | 'GUEST' | 'TRUSTED' | 'OWNER';

export interface Capabilities {
  roam: boolean;
  tour: boolean;
  ls1: boolean;
  ls2Write: boolean;
  privateResume: boolean;
  moderation: boolean;
  ownerControls: boolean;
}

export interface VaultSessionRecord {
  id: string;
  userId: string | null;
  deviceId: string;
  accessLevel: AccessLevel;
  capabilities: Capabilities;
  issuedAt: number;
  expiresAt: number;
  lastActivityAt: number;
  revokedAt: number | null;
}

export interface ValidatedSession {
  sessionId: string;
  userId: string | null;
  deviceId: string;
  accessLevel: AccessLevel;
  capabilities: Capabilities;
}

export type AuditEventCode =
  | 'ENROLL_STARTED'
  | 'ENROLL_SUCCESS'
  | 'ENROLL_CONFLICT'
  | 'SCAN_STARTED'
  | 'FACE_MATCH_SUCCESS'
  | 'FACE_MATCH_FAILURE'
  | 'LIVENESS_FAILURE'
  | 'WEBAUTHN_SUCCESS'
  | 'WEBAUTHN_FAILURE'
  | 'WEBAUTHN_REGISTER_SUCCESS'
  | 'MODE_DENIED'
  | 'DEVICE_CONFLICT'
  | 'FACE_CONFLICT'
  | 'RATE_LIMITED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'USER_SELF_DELETED'
  | 'BIOMETRIC_PHOTOS_ENROLL'
  | 'IDENTITY_PROVISION'
  | 'BIOMETRIC_REFERENCE_ATTACHED'
  | 'BIOMETRIC_CONSENT_RECORDED'
  | 'VISIT_SESSION_CREATED'
  | 'IDENTITY_UPDATED'
  | 'IDENTITY_PURGED';

export interface AuditEventPayload {
  userId?: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  event: AuditEventCode;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'CONFLICT';
  reasonCode?: string;
  ipHash?: string;
  metadata?: Record<string, unknown>; // NEVER include raw biometric data
}

export interface Env {
  WORKSHOP_DB: D1Database;
  WORKSHOP_CACHE: KVNamespace;
  DEVICE_BINDING_SECRET: string;
  BIOMETRIC_KEK_V1: string;
  VAULT_ORIGIN: string;
  ENVIRONMENT: string;
}

// ---------------------------------------------------------------------------
// ID generation (crypto-random, no external dep)
// ---------------------------------------------------------------------------

function nanoid(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function newId(prefix: string, len = 12): string {
  return `${prefix}_${nanoid(len)}`;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 helpers
// ---------------------------------------------------------------------------

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * Compute a privacy-preserving device binding hash server-side.
 * The client sends raw signals; we hash them with a server secret
 * so the client never controls its own binding hash value.
 */
export async function computeDeviceBindingHash(
  signals: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    screenColorDepth: number;
    timezone: string;
    canvasHash: string;
  },
  secret: string,
): Promise<string> {
  const canonical = [
    signals.userAgent,
    signals.platform,
    signals.hardwareConcurrency,
    signals.screenColorDepth,
    signals.timezone,
    signals.canvasHash,
  ].join('|');
  return hmacSha256(secret, canonical);
}

/**
 * Hash an IP address for audit log storage (no raw IPs ever persisted).
 */
export async function hashIp(ip: string, secret: string): Promise<string> {
  return hmacSha256(secret, `ip:${ip}`);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const SESSION_COOKIE = 'vault_sid';

export function getSessionCookie(request: Request | any): string | null {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === SESSION_COOKIE) return v.join('=').trim();
  }
  return null;
}

export function setSessionCookie(sessionId: string, maxAgeSeconds: number): string {
  const isSecure = true; // Always secure in production; Cloudflare enforces HTTPS
  return [
    `${SESSION_COOKIE}=${sessionId}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    isSecure ? 'Secure' : '',
    'SameSite=Strict',
  ]
    .filter(Boolean)
    .join('; ');
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------

/**
 * Validate the vault_sid cookie and return session data.
 * Returns null if missing, expired, or revoked.
 * Also updates last_activity_at as a side-effect (fire-and-forget).
 */
export async function validateSession(
  request: Request | any,
  env: Env,
): Promise<ValidatedSession | null> {
  const sid = getSessionCookie(request);
  if (!sid || !sid.startsWith('ses_')) return null;

  const now = Math.floor(Date.now() / 1000);
  const row = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, device_id, access_level, capabilities,
            expires_at, revoked_at
     FROM vault_sessions
     WHERE id = ? AND expires_at > ? AND revoked_at IS NULL
     LIMIT 1`,
  )
    .bind(sid, now)
    .first<{
      id: string;
      user_id: string | null;
      device_id: string;
      access_level: string;
      capabilities: string;
      expires_at: number;
      revoked_at: number | null;
    }>();

  if (!row) return null;

  // Touch last_activity_at (fire-and-forget)
  env.WORKSHOP_DB.prepare(
    `UPDATE vault_sessions SET last_activity_at = ? WHERE id = ?`,
  )
    .bind(now, sid)
    .run()
    .catch(() => {});

  let caps: Capabilities;
  try {
    caps = JSON.parse(row.capabilities);
  } catch {
    return null;
  }

  return {
    sessionId: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    accessLevel: row.access_level as AccessLevel,
    capabilities: caps,
  };
}

/**
 * Require a valid session with at least `minLevel` access.
 * Returns the session or throws a Response with appropriate status.
 */
export async function requireSession(
  request: Request | any,
  env: Env,
  minLevel: AccessLevel,
): Promise<ValidatedSession> {
  const session = await validateSession(request, env);
  if (!session) {
    throw new Response(JSON.stringify({ error: 'VAULT ACCESS DENIED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const levelOrder: AccessLevel[] = ['VISITOR', 'GUEST', 'TRUSTED', 'OWNER'];
  if (levelOrder.indexOf(session.accessLevel) < levelOrder.indexOf(minLevel)) {
    await writeAuditEvent(env, {
      userId: session.userId,
      deviceId: session.deviceId,
      sessionId: session.sessionId,
      event: 'MODE_DENIED',
      result: 'DENIED',
      reasonCode: `REQUIRED_${minLevel}_GOT_${session.accessLevel}`,
    });
    throw new Response(JSON.stringify({ error: 'VAULT ACCESS DENIED' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return session;
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

export async function issueSession(
  env: Env,
  params: {
    userId: string | null;
    deviceId: string;
    accessLevel: AccessLevel;
    capabilities: Capabilities;
    ttlSeconds?: number; // default 3600; VISITOR gets 1800
  },
): Promise<{ sessionId: string; cookieHeader: string }> {
  const ttl = params.ttlSeconds ?? (params.accessLevel === 'VISITOR' ? 1800 : 3600);
  const now = Math.floor(Date.now() / 1000);
  const sessionId = newId('ses', 24);

  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_sessions
       (id, user_id, device_id, access_level, capabilities, issued_at, expires_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      sessionId,
      params.userId,
      params.deviceId,
      params.accessLevel,
      JSON.stringify(params.capabilities),
      now,
      now + ttl,
      now,
    )
    .run();

  await writeAuditEvent(env, {
    userId: params.userId,
    deviceId: params.deviceId,
    sessionId,
    event: 'SESSION_CREATED',
    result: 'SUCCESS',
  });

  return { sessionId, cookieHeader: setSessionCookie(sessionId, ttl) };
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * Write an audit event — fire-and-forget (does not block response).
 * RULE: metadata must NEVER contain raw biometric data.
 */
export function writeAuditEvent(env: Env, payload: AuditEventPayload): Promise<void> {
  const id = newId('aud', 16);
  const now = Math.floor(Date.now() / 1000);

  return env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_audit_log
       (id, user_id, device_id, session_id, event, result, reason_code, ip_hash, created_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      payload.userId ?? null,
      payload.deviceId ?? null,
      payload.sessionId ?? null,
      payload.event,
      payload.result,
      payload.reasonCode ?? null,
      payload.ipHash ?? null,
      now,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
    )
    .run()
    .then(() => {})
    .catch(() => {}); // Never let audit failures surface to caller
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ip:vault'             : { limit: 300, windowSeconds: 60    },
  'ip:scan_complete'     : { limit: 5,   windowSeconds: 300   },
  'device:scan_failures' : { limit: 10,  windowSeconds: 900   },
  'identity:face_failures': { limit: 20, windowSeconds: 3600  },
  'ip:visit_create'      : { limit: 100, windowSeconds: 60    },
  'ip:webauthn_register' : { limit: 50,  windowSeconds: 3600  },
};

/**
 * Check and increment a rate limit counter.
 * Returns { allowed: true } or { allowed: false, retryAfter: number }.
 */
export async function checkRateLimit(
  env: Env,
  scope: keyof typeof RATE_LIMITS,
  key: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const cfg = RATE_LIMITS[scope];
  if (!cfg) return { allowed: true };

  const keyHash = await hmacSha256('rl', `${scope}:${key}`);
  const now = Math.floor(Date.now() / 1000);

  // 1. Primary: KV (WORKSHOP_CACHE) for fast concurrent counters without D1 locking
  if (env.WORKSHOP_CACHE) {
    try {
      const kvKey = `rl:${scope}:${keyHash}`;
      const cached = await env.WORKSHOP_CACHE.get(kvKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { count: number; expiresAt: number };
        if (parsed.expiresAt > now) {
          if (parsed.count >= cfg.limit) {
            return { allowed: false, retryAfter: parsed.expiresAt - now };
          }
          const updated = { count: parsed.count + 1, expiresAt: parsed.expiresAt };
          const ttl = Math.max(60, parsed.expiresAt - now);
          await env.WORKSHOP_CACHE.put(kvKey, JSON.stringify(updated), { expirationTtl: ttl });
          return { allowed: true };
        }
      }
      // New KV window
      const ttl = Math.max(60, cfg.windowSeconds);
      await env.WORKSHOP_CACHE.put(
        kvKey,
        JSON.stringify({ count: 1, expiresAt: now + cfg.windowSeconds }),
        { expirationTtl: ttl },
      );
      return { allowed: true };
    } catch {
      // Fall through to D1 if KV encounters an error
    }
  }

  // 2. Fallback: D1 rate_limits table
  const existing = await env.WORKSHOP_DB.prepare(
    `SELECT request_count, window_expires_at FROM rate_limits WHERE key_hash = ? LIMIT 1`,
  )
    .bind(keyHash)
    .first<{ request_count: number; window_expires_at: number }>();

  if (!existing || existing.window_expires_at < now) {
    await env.WORKSHOP_DB.prepare(
      `INSERT OR REPLACE INTO rate_limits (key_hash, request_count, window_expires_at)
       VALUES (?, 1, ?)`,
    )
      .bind(keyHash, now + cfg.windowSeconds)
      .run();
    return { allowed: true };
  }

  if (existing.request_count >= cfg.limit) {
    return { allowed: false, retryAfter: existing.window_expires_at - now };
  }

  await env.WORKSHOP_DB.prepare(
    `UPDATE rate_limits SET request_count = request_count + 1 WHERE key_hash = ?`,
  )
    .bind(keyHash)
    .run();

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Challenge management
// ---------------------------------------------------------------------------

export async function createChallenge(
  env: Env,
  params: {
    challengeType: 'WEBAUTHN_REGISTER' | 'WEBAUTHN_AUTH' | 'LIVENESS' | 'ENROLL_SESSION';
    userId?: string | null;
    deviceId?: string | null;
    challengeData?: Record<string, unknown>;
    ttlSeconds?: number;
  },
): Promise<{ challengeId: string; challenge: string }> {
  const ttl = params.ttlSeconds ?? (params.challengeType === 'LIVENESS' ? 90 : 60);
  const now = Math.floor(Date.now() / 1000);
  const challengeId = newId('chg', 16);
  // The challenge bytes sent to WebAuthn must be base64url-encoded random
  const rawBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = btoa(String.fromCharCode(...rawBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_challenges
       (id, user_id, device_id, challenge_type, challenge_data, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      challengeId,
      params.userId ?? null,
      params.deviceId ?? null,
      params.challengeType,
      params.challengeData ? JSON.stringify({ ...params.challengeData, challenge }) : JSON.stringify({ challenge }),
      now,
      now + ttl,
    )
    .run();

  return { challengeId, challenge };
}

export async function consumeChallenge(
  env: Env,
  challengeId: string,
  expectedType: string,
): Promise<{
  challenge: string;
  userId: string | null;
  deviceId: string | null;
  challengeData: Record<string, unknown>;
} | null> {
  const now = Math.floor(Date.now() / 1000);

  const row = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, device_id, challenge_type, challenge_data, expires_at, used_at
     FROM vault_challenges
     WHERE id = ? AND challenge_type = ? AND expires_at > ? AND used_at IS NULL
     LIMIT 1`,
  )
    .bind(challengeId, expectedType, now)
    .first<{
      id: string;
      user_id: string | null;
      device_id: string | null;
      challenge_type: string;
      challenge_data: string;
      expires_at: number;
      used_at: number | null;
    }>();

  if (!row) return null;

  // Mark as consumed immediately (prevents replay even if subsequent processing fails)
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_challenges SET used_at = ? WHERE id = ?`,
  )
    .bind(now, challengeId)
    .run();

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(row.challenge_data || '{}');
  } catch {
    return null;
  }

  return {
    challenge: data.challenge as string,
    userId: row.user_id,
    deviceId: row.device_id,
    challengeData: data,
  };
}

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

export function jsonOk(body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function jsonError(status: number, message: string): Response {
  // NEVER return specific authentication failure reasons to the client
  const safe =
    status === 401 || status === 403 ? 'VAULT ACCESS DENIED' : message;
  return new Response(JSON.stringify({ error: safe }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function getClientIp(request: Request | any): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
