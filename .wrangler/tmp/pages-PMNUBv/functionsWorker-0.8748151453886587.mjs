var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-YGMTlx/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// api/vault/_middleware.ts
function nanoid(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
__name(nanoid, "nanoid");
function newId(prefix, len = 12) {
  return `${prefix}_${nanoid(len)}`;
}
__name(newId, "newId");
async function hmacSha256(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
__name(hmacSha256, "hmacSha256");
async function computeDeviceBindingHash(signals, secret) {
  const canonical = [
    signals.userAgent,
    signals.platform,
    signals.hardwareConcurrency,
    signals.screenColorDepth,
    signals.timezone,
    signals.canvasHash
  ].join("|");
  return hmacSha256(secret, canonical);
}
__name(computeDeviceBindingHash, "computeDeviceBindingHash");
async function hashIp(ip, secret) {
  return hmacSha256(secret, `ip:${ip}`);
}
__name(hashIp, "hashIp");
var SESSION_COOKIE = "vault_sid";
function getSessionCookie(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === SESSION_COOKIE)
      return v.join("=").trim();
  }
  return null;
}
__name(getSessionCookie, "getSessionCookie");
function setSessionCookie(sessionId, maxAgeSeconds) {
  const isSecure = true;
  return [
    `${SESSION_COOKIE}=${sessionId}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    isSecure ? "Secure" : "",
    "SameSite=Strict"
  ].filter(Boolean).join("; ");
}
__name(setSessionCookie, "setSessionCookie");
function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}
__name(clearSessionCookie, "clearSessionCookie");
async function validateSession(request, env) {
  const sid = getSessionCookie(request);
  if (!sid || !sid.startsWith("ses_"))
    return null;
  const now = Math.floor(Date.now() / 1e3);
  const row = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, device_id, access_level, capabilities,
            expires_at, revoked_at
     FROM vault_sessions
     WHERE id = ? AND expires_at > ? AND revoked_at IS NULL
     LIMIT 1`
  ).bind(sid, now).first();
  if (!row)
    return null;
  env.WORKSHOP_DB.prepare(
    `UPDATE vault_sessions SET last_activity_at = ? WHERE id = ?`
  ).bind(now, sid).run().catch(() => {
  });
  let caps;
  try {
    caps = JSON.parse(row.capabilities);
  } catch {
    return null;
  }
  return {
    sessionId: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    accessLevel: row.access_level,
    capabilities: caps
  };
}
__name(validateSession, "validateSession");
async function requireSession(request, env, minLevel) {
  const session = await validateSession(request, env);
  if (!session) {
    throw new Response(JSON.stringify({ error: "VAULT ACCESS DENIED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const levelOrder = ["VISITOR", "GUEST", "TRUSTED", "OWNER"];
  if (levelOrder.indexOf(session.accessLevel) < levelOrder.indexOf(minLevel)) {
    await writeAuditEvent(env, {
      userId: session.userId,
      deviceId: session.deviceId,
      sessionId: session.sessionId,
      event: "MODE_DENIED",
      result: "DENIED",
      reasonCode: `REQUIRED_${minLevel}_GOT_${session.accessLevel}`
    });
    throw new Response(JSON.stringify({ error: "VAULT ACCESS DENIED" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return session;
}
__name(requireSession, "requireSession");
async function issueSession(env, params) {
  const ttl = params.ttlSeconds ?? (params.accessLevel === "VISITOR" ? 1800 : 3600);
  const now = Math.floor(Date.now() / 1e3);
  const sessionId = newId("ses", 24);
  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_sessions
       (id, user_id, device_id, access_level, capabilities, issued_at, expires_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sessionId,
    params.userId,
    params.deviceId,
    params.accessLevel,
    JSON.stringify(params.capabilities),
    now,
    now + ttl,
    now
  ).run();
  await writeAuditEvent(env, {
    userId: params.userId,
    deviceId: params.deviceId,
    sessionId,
    event: "SESSION_CREATED",
    result: "SUCCESS"
  });
  return { sessionId, cookieHeader: setSessionCookie(sessionId, ttl) };
}
__name(issueSession, "issueSession");
function writeAuditEvent(env, payload) {
  const id = newId("aud", 16);
  const now = Math.floor(Date.now() / 1e3);
  return env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_audit_log
       (id, user_id, device_id, session_id, event, result, reason_code, ip_hash, created_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    payload.userId ?? null,
    payload.deviceId ?? null,
    payload.sessionId ?? null,
    payload.event,
    payload.result,
    payload.reasonCode ?? null,
    payload.ipHash ?? null,
    now,
    payload.metadata ? JSON.stringify(payload.metadata) : null
  ).run().then(() => {
  }).catch(() => {
  });
}
__name(writeAuditEvent, "writeAuditEvent");
var RATE_LIMITS = {
  "ip:vault": { limit: 300, windowSeconds: 60 },
  "ip:scan_complete": { limit: 5, windowSeconds: 300 },
  "device:scan_failures": { limit: 10, windowSeconds: 900 },
  "identity:face_failures": { limit: 20, windowSeconds: 3600 },
  "ip:visit_create": { limit: 100, windowSeconds: 60 },
  "ip:webauthn_register": { limit: 50, windowSeconds: 3600 }
};
async function checkRateLimit(env, scope, key) {
  const cfg = RATE_LIMITS[scope];
  if (!cfg)
    return { allowed: true };
  const keyHash = await hmacSha256("rl", `${scope}:${key}`);
  const now = Math.floor(Date.now() / 1e3);
  if (env.WORKSHOP_CACHE) {
    try {
      const kvKey = `rl:${scope}:${keyHash}`;
      const cached = await env.WORKSHOP_CACHE.get(kvKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expiresAt > now) {
          if (parsed.count >= cfg.limit) {
            return { allowed: false, retryAfter: parsed.expiresAt - now };
          }
          const updated = { count: parsed.count + 1, expiresAt: parsed.expiresAt };
          const ttl2 = Math.max(60, parsed.expiresAt - now);
          await env.WORKSHOP_CACHE.put(kvKey, JSON.stringify(updated), { expirationTtl: ttl2 });
          return { allowed: true };
        }
      }
      const ttl = Math.max(60, cfg.windowSeconds);
      await env.WORKSHOP_CACHE.put(
        kvKey,
        JSON.stringify({ count: 1, expiresAt: now + cfg.windowSeconds }),
        { expirationTtl: ttl }
      );
      return { allowed: true };
    } catch {
    }
  }
  const existing = await env.WORKSHOP_DB.prepare(
    `SELECT request_count, window_expires_at FROM rate_limits WHERE key_hash = ? LIMIT 1`
  ).bind(keyHash).first();
  if (!existing || existing.window_expires_at < now) {
    await env.WORKSHOP_DB.prepare(
      `INSERT OR REPLACE INTO rate_limits (key_hash, request_count, window_expires_at)
       VALUES (?, 1, ?)`
    ).bind(keyHash, now + cfg.windowSeconds).run();
    return { allowed: true };
  }
  if (existing.request_count >= cfg.limit) {
    return { allowed: false, retryAfter: existing.window_expires_at - now };
  }
  await env.WORKSHOP_DB.prepare(
    `UPDATE rate_limits SET request_count = request_count + 1 WHERE key_hash = ?`
  ).bind(keyHash).run();
  return { allowed: true };
}
__name(checkRateLimit, "checkRateLimit");
async function createChallenge(env, params) {
  const ttl = params.ttlSeconds ?? (params.challengeType === "LIVENESS" ? 90 : 60);
  const now = Math.floor(Date.now() / 1e3);
  const challengeId = newId("chg", 16);
  const rawBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = btoa(String.fromCharCode(...rawBytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_challenges
       (id, user_id, device_id, challenge_type, challenge_data, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    challengeId,
    params.userId ?? null,
    params.deviceId ?? null,
    params.challengeType,
    params.challengeData ? JSON.stringify({ ...params.challengeData, challenge }) : JSON.stringify({ challenge }),
    now,
    now + ttl
  ).run();
  return { challengeId, challenge };
}
__name(createChallenge, "createChallenge");
async function consumeChallenge(env, challengeId, expectedType) {
  const now = Math.floor(Date.now() / 1e3);
  const row = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, device_id, challenge_type, challenge_data, expires_at, used_at
     FROM vault_challenges
     WHERE id = ? AND challenge_type = ? AND expires_at > ? AND used_at IS NULL
     LIMIT 1`
  ).bind(challengeId, expectedType, now).first();
  if (!row)
    return null;
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_challenges SET used_at = ? WHERE id = ?`
  ).bind(now, challengeId).run();
  let data = {};
  try {
    data = JSON.parse(row.challenge_data || "{}");
  } catch {
    return null;
  }
  return {
    challenge: data.challenge,
    userId: row.user_id,
    deviceId: row.device_id,
    challengeData: data
  };
}
__name(consumeChallenge, "consumeChallenge");
function jsonOk(body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...extraHeaders }
  });
}
__name(jsonOk, "jsonOk");
function jsonError(status, message) {
  const safe = status === 401 || status === 403 ? "VAULT ACCESS DENIED" : message;
  return new Response(JSON.stringify({ error: safe }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError, "jsonError");
function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
}
__name(getClientIp, "getClientIp");

// api/vault/admin/revoke.ts
var onRequestPost = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let session;
  try {
    session = await requireSession(request, env, "OWNER");
  } catch (resp) {
    return resp;
  }
  if (!session.capabilities.ownerControls) {
    return jsonError(403, "VAULT ACCESS DENIED");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { target, targetId, reason } = body;
  if (!target || !targetId)
    return jsonError(400, "Missing fields");
  const now = Math.floor(Date.now() / 1e3);
  if (target === "device") {
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_devices SET status = 'revoked' WHERE id = ?`
    ).bind(targetId).run();
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL`
    ).bind(now, targetId).run();
    await writeAuditEvent(env, {
      userId: session.userId,
      deviceId: targetId,
      sessionId: session.sessionId,
      event: "SESSION_REVOKED",
      result: "SUCCESS",
      ipHash,
      reasonCode: reason ?? "admin_revoke",
      metadata: { target: "device", revokedBy: session.userId }
    });
  } else if (target === "user") {
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_users SET status = 'suspended', updated_at = ? WHERE id = ?`
    ).bind(now, targetId).run();
    await env.WORKSHOP_DB.prepare(
      `UPDATE vault_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`
    ).bind(now, targetId).run();
    await writeAuditEvent(env, {
      userId: targetId,
      sessionId: session.sessionId,
      event: "SESSION_REVOKED",
      result: "SUCCESS",
      ipHash,
      reasonCode: reason ?? "admin_suspend",
      metadata: { target: "user", revokedBy: session.userId }
    });
  } else {
    return jsonError(400, "Invalid target type");
  }
  return jsonOk({ revoked: true, target, targetId });
}, "onRequestPost");

// api/vault/biometric/consent.ts
var onRequestPost2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipH = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  if (body.action !== "ACCEPT" && body.action !== "DECLINE") {
    return jsonError(400, "Invalid consent action");
  }
  const consentAccepted = body.action === "ACCEPT";
  const eventId = newId("evt");
  const normalizedName = body.declaredName ? body.declaredName.trim().toUpperCase() : null;
  const noticeVersion = body.noticeVersion || "DPDP-2026-v2";
  const termsVersion = body.termsVersion || "1.0";
  await writeAuditEvent(env, {
    userId: null,
    deviceId: body.deviceSignals?.canvasHash || null,
    event: "BIOMETRIC_CONSENT_RECORDED",
    result: consentAccepted ? "SUCCESS" : "DENIED",
    ipHash: ipH,
    metadata: {
      action: body.action,
      eventId,
      declaredName: body.declaredName || null,
      normalizedName,
      noticeVersion,
      termsVersion,
      declarationDigest: body.declarationDigest || null,
      devicePlatform: body.deviceSignals?.platform || "unknown",
      attestationType: "ELECTRONIC_ACCEPTANCE_RECORDED"
    }
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
    status: "ELECTRONIC_ACCEPTANCE_RECORDED"
  });
}, "onRequestPost");

// api/vault/capabilities.ts
var CAPABILITIES = {
  VISITOR: {
    roam: false,
    tour: true,
    ls1: false,
    ls2Write: false,
    privateResume: false,
    moderation: false,
    ownerControls: false
  },
  GUEST: {
    roam: true,
    tour: false,
    ls1: true,
    ls2Write: true,
    privateResume: false,
    moderation: false,
    ownerControls: false
  },
  TRUSTED: {
    roam: true,
    tour: false,
    ls1: true,
    ls2Write: true,
    privateResume: true,
    moderation: false,
    ownerControls: false
  },
  OWNER: {
    roam: true,
    tour: false,
    ls1: true,
    ls2Write: true,
    privateResume: true,
    moderation: true,
    ownerControls: true
  }
};
function getCapabilities(accessLevel) {
  return CAPABILITIES[accessLevel] ?? CAPABILITIES.GUEST;
}
__name(getCapabilities, "getCapabilities");

// api/vault/biometric/enroll.ts
async function importAesKey(keyMaterial) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(keyMaterial));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}
__name(importAesKey, "importAesKey");
async function encryptUnderKek(kek, plaintextBytes) {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(kek));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    plaintextBytes
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...ivBytes))
  };
}
__name(encryptUnderKek, "encryptUnderKek");
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { livenessToken, deviceId, userId, encryptedEmbedding, embeddingIv } = body;
  if (!livenessToken || !deviceId || !userId || !encryptedEmbedding || !embeddingIv) {
    return jsonError(400, "Missing required fields");
  }
  const liveness = await consumeChallenge(env, livenessToken, "ENROLL_SESSION");
  if (!liveness || !liveness.challengeData.livenessVerified) {
    await writeAuditEvent(env, {
      userId,
      deviceId,
      event: "ENROLL_CONFLICT",
      result: "DENIED",
      ipHash,
      reasonCode: "invalid_liveness_token"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const device = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, status FROM vault_devices WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1`
  ).bind(deviceId, userId).first();
  if (!device) {
    await writeAuditEvent(env, {
      userId,
      deviceId,
      event: "ENROLL_CONFLICT",
      result: "DENIED",
      ipHash,
      reasonCode: "device_not_found"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const existingBio = await env.WORKSHOP_DB.prepare(
    `SELECT user_id FROM vault_biometrics WHERE user_id = ? LIMIT 1`
  ).bind(userId).first();
  if (existingBio) {
    await writeAuditEvent(env, {
      userId,
      deviceId,
      event: "ENROLL_CONFLICT",
      result: "CONFLICT",
      ipHash,
      reasonCode: "biometric_already_enrolled"
    });
    return jsonError(409, "BIOMETRIC_EXISTS");
  }
  let plaintextBytes;
  try {
    const ephemeralKey = await importAesKey(livenessToken);
    const ivBytes = Uint8Array.from(atob(embeddingIv), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(encryptedEmbedding), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, ephemeralKey, cipherBytes);
    plaintextBytes = new Uint8Array(decrypted);
  } catch {
    await writeAuditEvent(env, {
      userId,
      deviceId,
      event: "ENROLL_CONFLICT",
      result: "FAILURE",
      ipHash,
      reasonCode: "embedding_decrypt_failed"
    });
    return jsonError(400, "Invalid embedding payload");
  }
  const { ciphertext, iv } = await encryptUnderKek(env.BIOMETRIC_KEK_V1, plaintextBytes);
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_biometrics
         (user_id, biometric_template_ciphertext, template_iv, template_version,
          encryption_key_version, source_type, created_at, updated_at)
       VALUES (?, ?, ?, 1, 'v1', 'live_camera', ?, ?)`
  ).bind(userId, ciphertext, iv, now, now).run();
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_users SET last_seen_at = ?, updated_at = ? WHERE id = ?`
  ).bind(now, now, userId).run();
  const user = await env.WORKSHOP_DB.prepare(
    `SELECT access_level FROM vault_users WHERE id = ? LIMIT 1`
  ).bind(userId).first();
  const accessLevel = user?.access_level ?? "GUEST";
  const capabilities = CAPABILITIES[accessLevel] ?? CAPABILITIES.GUEST;
  const { cookieHeader } = await issueSession(env, {
    userId,
    deviceId,
    accessLevel,
    capabilities
  });
  await writeAuditEvent(env, {
    userId,
    deviceId,
    event: "ENROLL_SUCCESS",
    result: "SUCCESS",
    ipHash
  });
  return new Response(JSON.stringify({
    enrolled: true,
    accessLevel,
    capabilities
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader
    }
  });
}, "onRequestPost");

// api/vault/device/bind.ts
var onRequestPost4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  if (!body.deviceSignals)
    return jsonError(400, "Missing device signals");
  const bindingHash = await computeDeviceBindingHash(body.deviceSignals, env.DEVICE_BINDING_SECRET);
  const device = await env.WORKSHOP_DB.prepare(
    `SELECT d.id, d.user_id, d.status, u.display_name, u.access_level, u.status as user_status
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.device_binding_hash = ? LIMIT 1`
  ).bind(bindingHash).first();
  if (!device) {
    return jsonOk({ status: "free" });
  }
  if (device.status === "revoked") {
    return jsonOk({ status: "revoked" });
  }
  if (device.user_status !== "active") {
    return jsonOk({ status: "suspended" });
  }
  return jsonOk({
    status: "bound",
    // Only return minimal non-sensitive info needed to route the UI
    hasWebAuthn: true
  });
}, "onRequestPost");

// api/vault/identity/conflict.ts
var onRequestPost5 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { deviceSignals } = body;
  if (!deviceSignals)
    return jsonError(400, "Missing device signals");
  const deviceBindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);
  const deviceRecord = await env.WORKSHOP_DB.prepare(
    `SELECT d.id, d.user_id, d.status AS device_status, u.status AS user_status
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.device_binding_hash = ? LIMIT 1`
  ).bind(deviceBindingHash).first();
  if (deviceRecord) {
    if (deviceRecord.device_status === "revoked" || deviceRecord.user_status === "suspended") {
      await writeAuditEvent(env, {
        userId: deviceRecord.user_id,
        deviceId: deviceRecord.id,
        event: "DEVICE_CONFLICT",
        result: "DENIED",
        ipHash,
        reasonCode: "revoked_or_suspended_device"
      });
      return jsonOk({ conflict: "device_revoked", action: "DENY" });
    }
    const bioRecord = await env.WORKSHOP_DB.prepare(
      `SELECT user_id FROM vault_biometrics WHERE user_id = ? LIMIT 1`
    ).bind(deviceRecord.user_id).first();
    if (bioRecord) {
      return jsonOk({ conflict: "returning_user", action: "SCAN" });
    } else {
      return jsonOk({ conflict: "device_registered_no_face", action: "CONTINUE_ENROLL" });
    }
  }
  return jsonOk({ conflict: null, action: "ENROLL" });
}, "onRequestPost");

// api/vault/identity/directory.ts
async function encryptUnderKek2(kek, plaintextBytes) {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(kek));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    plaintextBytes
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...ivBytes))
  };
}
__name(encryptUnderKek2, "encryptUnderKek");
var onRequestGet = /* @__PURE__ */ __name(async ({ env }) => {
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
    )
  ]);
  const results = await env.WORKSHOP_DB.prepare(
    `SELECT
         u.id AS userId,
         u.display_name AS displayName,
         u.access_level AS accessLevel,
         u.status AS status,
         u.created_at AS createdAt,
         b.source_type AS referenceSource,
         CASE WHEN b.user_id IS NOT NULL THEN 1 ELSE 0 END AS hasFaceTemplate,
         (SELECT COUNT(*) FROM vault_devices d WHERE d.user_id = u.id AND d.status = 'active') AS registeredDevices
       FROM vault_users u
       LEFT JOIN vault_biometrics b ON u.id = b.user_id
       ORDER BY u.created_at ASC`
  ).all();
  return jsonOk({
    identities: (results.results || []).map((r) => ({
      userId: r.userId,
      displayName: r.displayName,
      accessLevel: r.accessLevel,
      status: r.status,
      hasFaceTemplate: !!r.hasFaceTemplate,
      referenceSource: r.referenceSource || "none",
      registeredDevices: r.registeredDevices || 0,
      createdAt: r.createdAt
    })),
    totalCount: results.results?.length || 0
  });
}, "onRequestGet");
var onRequestPost6 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  if (body.action === "PROVISION") {
    if (!body.displayName || !body.displayName.trim()) {
      return jsonError(400, "Display name is required");
    }
    const displayName = body.displayName.trim();
    const accessLevel = body.accessLevel || "GUEST";
    const userId = "usr_" + displayName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    await env.WORKSHOP_DB.prepare(
      `INSERT INTO vault_users (id, display_name, access_level, status, updated_at)
         VALUES (?, ?, ?, 'active', unixepoch())
         ON CONFLICT(id) DO UPDATE SET
           display_name = excluded.display_name,
           access_level = excluded.access_level,
           updated_at = unixepoch()`
    ).bind(userId, displayName, accessLevel).run();
    await writeAuditEvent(env, {
      userId,
      event: "IDENTITY_PROVISION",
      result: "SUCCESS",
      ipHash,
      metadata: { displayName, accessLevel }
    });
    return jsonOk({
      success: true,
      userId,
      displayName,
      accessLevel,
      status: "active"
    });
  }
  if (body.action === "ATTACH_REFERENCE") {
    if (!body.userId)
      return jsonError(400, "userId is required");
    const user = await env.WORKSHOP_DB.prepare(`SELECT * FROM vault_users WHERE id = ?`).bind(body.userId).first();
    if (!user)
      return jsonError(404, "User identity not found in directory");
    const source = body.source || "google_photos_picker";
    let vector = new Float32Array(128);
    if (body.embeddingVector && body.embeddingVector.length === 128) {
      let norm = 0;
      for (let i = 0; i < 128; i++) {
        vector[i] = body.embeddingVector[i];
        norm += vector[i] * vector[i];
      }
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < 128; i++)
        vector[i] /= norm;
    } else {
      const nameHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.userId + source)));
      let norm = 0;
      for (let i = 0; i < 128; i++) {
        vector[i] = nameHash[i % nameHash.length] / 255 * 2 - 1;
        norm += vector[i] * vector[i];
      }
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < 128; i++)
        vector[i] /= norm;
    }
    const { ciphertext, iv } = await encryptUnderKek2(
      env.BIOMETRIC_KEK_V1,
      new Uint8Array(vector.buffer)
    );
    await env.WORKSHOP_DB.prepare(
      `INSERT OR REPLACE INTO vault_biometrics
         (user_id, biometric_template_ciphertext, template_iv, template_version, encryption_key_version, source_type, updated_at)
         VALUES (?, ?, ?, 1, 'v1', ?, unixepoch())`
    ).bind(body.userId, ciphertext, iv, source).run();
    await writeAuditEvent(env, {
      userId: body.userId,
      event: "BIOMETRIC_REFERENCE_ATTACHED",
      result: "SUCCESS",
      ipHash,
      metadata: { source }
    });
    return jsonOk({
      success: true,
      userId: body.userId,
      source,
      message: "Biometric reference template attached and encrypted under KEK."
    });
  }
  return jsonError(400, "Unknown action. Must be PROVISION or ATTACH_REFERENCE");
}, "onRequestPost");

// api/vault/liveness/challenge.ts
var LIVENESS_PROMPTS = [
  "TURN_LEFT",
  "TURN_RIGHT",
  "LOOK_UP",
  "NOD_DOWN",
  "BLINK",
  "MOVE_CLOSER",
  "MOVE_BACK"
];
function pickRandomPrompts(n) {
  const shuffled = [...LIVENESS_PROMPTS].sort(() => Math.random() > 0.5 ? 1 : -1);
  return shuffled.slice(0, n);
}
__name(pickRandomPrompts, "pickRandomPrompts");
var onRequestPost7 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  if (body.sessionType !== "ENROLL" && body.sessionType !== "SCAN") {
    return jsonError(400, "Invalid sessionType");
  }
  const prompts = pickRandomPrompts(3);
  const { challengeId } = await createChallenge(env, {
    challengeType: "LIVENESS",
    challengeData: {
      sessionType: body.sessionType,
      prompts,
      promptCount: prompts.length
    },
    ttlSeconds: 90
    // 90 seconds to complete all prompts
  });
  return jsonOk({
    challengeId,
    prompts,
    expiresInSeconds: 90
  });
}, "onRequestPost");

// api/vault/liveness/verify.ts
var MIN_PROMPT_MS = 300;
var MAX_PROMPT_MS = 15e3;
var onRequestPost8 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed) {
    await writeAuditEvent(env, { event: "RATE_LIMITED", result: "DENIED", ipHash });
    return jsonError(429, "Rate limited");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { challengeId, promptCompletions } = body;
  if (!challengeId || !Array.isArray(promptCompletions)) {
    return jsonError(400, "Missing fields");
  }
  const stored = await consumeChallenge(env, challengeId, "LIVENESS");
  if (!stored) {
    await writeAuditEvent(env, {
      event: "LIVENESS_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "challenge_expired_or_used"
    });
    return jsonError(409, "Challenge expired or already used");
  }
  const expectedPrompts = stored.challengeData.prompts ?? [];
  const serverNow = Date.now();
  if (promptCompletions.length !== expectedPrompts.length) {
    await writeAuditEvent(env, {
      event: "LIVENESS_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "wrong_prompt_count"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  for (let i = 0; i < expectedPrompts.length; i++) {
    if (promptCompletions[i].prompt !== expectedPrompts[i]) {
      await writeAuditEvent(env, {
        event: "LIVENESS_FAILURE",
        result: "FAILURE",
        ipHash,
        reasonCode: "wrong_prompt_order"
      });
      return jsonError(401, "VAULT ACCESS DENIED");
    }
  }
  let prevTime = promptCompletions[0]?.completedAt ?? serverNow;
  for (let i = 1; i < promptCompletions.length; i++) {
    const delta = promptCompletions[i].completedAt - prevTime;
    if (delta < MIN_PROMPT_MS || delta > MAX_PROMPT_MS) {
      await writeAuditEvent(env, {
        event: "LIVENESS_FAILURE",
        result: "FAILURE",
        ipHash,
        reasonCode: "implausible_timing",
        metadata: { delta, promptIndex: i }
      });
      return jsonError(401, "VAULT ACCESS DENIED");
    }
    prevTime = promptCompletions[i].completedAt;
  }
  const totalMs = (promptCompletions[promptCompletions.length - 1]?.completedAt ?? 0) - (promptCompletions[0]?.completedAt ?? 0);
  if (totalMs < 0 || totalMs > 12e4) {
    await writeAuditEvent(env, {
      event: "LIVENESS_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "total_duration_invalid"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const { challengeId: livenessToken } = await createChallenge(env, {
    challengeType: "ENROLL_SESSION",
    userId: stored.userId,
    deviceId: stored.deviceId,
    challengeData: { livenessVerified: true, verifiedAt: serverNow },
    ttlSeconds: 120
  });
  return jsonOk({
    livenessVerified: true,
    livenessToken,
    expiresInSeconds: 120
  });
}, "onRequestPost");

// api/vault/photos/picker-complete.ts
async function encryptUnderKek3(kek, plaintextBytes) {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(kek));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    plaintextBytes
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...ivBytes))
  };
}
__name(encryptUnderKek3, "encryptUnderKek");
async function extractEmbeddingAndPurgeBuffer(imageBytes) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", imageBytes));
  const embedding = new Float32Array(128);
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    const val = hash[i % hash.length] / 255 * 2 - 1;
    embedding[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < 128; i++) {
    embedding[i] /= norm;
  }
  imageBytes.fill(0);
  return new Uint8Array(embedding.buffer);
}
__name(extractEmbeddingAndPurgeBuffer, "extractEmbeddingAndPurgeBuffer");
var onRequestPost9 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let session;
  try {
    session = await requireSession(request, env, "GUEST");
  } catch (resp) {
    return resp;
  }
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  if (!body.mediaItemId && !body.photoDataUrl && !body.downloadUrl) {
    return jsonError(400, "Missing media selection");
  }
  let rawImageBytes;
  if (body.photoDataUrl) {
    const base64Part = body.photoDataUrl.split(",")[1] || body.photoDataUrl;
    try {
      const binary = atob(base64Part);
      rawImageBytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch {
      return jsonError(400, "Invalid image data");
    }
  } else if (body.downloadUrl) {
    try {
      const res = await fetch(body.downloadUrl);
      if (!res.ok)
        throw new Error("Download failed");
      const ab = await res.arrayBuffer();
      rawImageBytes = new Uint8Array(ab);
    } catch {
      return jsonError(502, "Could not retrieve selected photo");
    }
  } else {
    rawImageBytes = new TextEncoder().encode(`photo_sim_${body.mediaItemId}_${Date.now()}`);
  }
  if (rawImageBytes.length === 0 || rawImageBytes.length > 10 * 1024 * 1024) {
    rawImageBytes.fill(0);
    return jsonError(400, "Image size out of acceptable bounds");
  }
  const embeddingBytes = await extractEmbeddingAndPurgeBuffer(rawImageBytes);
  const { ciphertext, iv } = await encryptUnderKek3(env.BIOMETRIC_KEK_V1, embeddingBytes);
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_biometrics
         (user_id, biometric_template_ciphertext, template_iv, template_version,
          encryption_key_version, source_type, created_at, updated_at)
       VALUES (?, ?, ?, 1, 'v1', 'google_photos_picker', ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         biometric_template_ciphertext = excluded.biometric_template_ciphertext,
         template_iv = excluded.template_iv,
         source_type = 'google_photos_picker',
         updated_at = excluded.updated_at`
  ).bind(session.userId, ciphertext, iv, now, now).run();
  await writeAuditEvent(env, {
    userId: session.userId,
    deviceId: session.deviceId,
    sessionId: session.sessionId,
    event: "BIOMETRIC_PHOTOS_ENROLL",
    result: "SUCCESS",
    ipHash,
    metadata: { mediaItemId: body.mediaItemId ?? "direct_upload" }
  });
  return jsonOk({
    enrolled: true,
    sourceType: "google_photos_picker",
    userId: session.userId
  });
}, "onRequestPost");

// api/vault/photos/picker-poll.ts
async function decryptUnderKek(kek, ciphertextB64, ivB64) {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(kek));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new Float32Array(plaintext);
}
__name(decryptUnderKek, "decryptUnderKek");
async function encryptUnderKek4(kek, plaintextBytes) {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(kek));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    plaintextBytes
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...ivBytes))
  };
}
__name(encryptUnderKek4, "encryptUnderKek");
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let session;
  try {
    session = await requireSession(request, env, "GUEST");
  } catch (resp) {
    return resp;
  }
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const mockSelect = url.searchParams.get("mockSelect") === "true";
  if (!sessionId) {
    return jsonError(400, "Missing sessionId parameter");
  }
  const challenge = await env.WORKSHOP_DB.prepare(
    `SELECT * FROM vault_challenges WHERE id = ? AND user_id = ? LIMIT 1`
  ).bind(sessionId, session.userId).first();
  if (!challenge) {
    return jsonError(404, "Picker session expired or not found");
  }
  const accessToken = env.GOOGLE_PHOTOS_ACCESS_TOKEN;
  let mediaItemsSet = false;
  let selectedPhotoBytes = null;
  if (accessToken && !sessionId.startsWith("sessions/sim_")) {
    try {
      const checkRes = await fetch(`https://photospicker.googleapis.com/v1/${sessionId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (checkRes.ok) {
        const sData = await checkRes.json();
        mediaItemsSet = !!sData.mediaItemsSet;
        if (mediaItemsSet) {
          const itemsRes = await fetch(`https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (itemsRes.ok) {
            const iData = await itemsRes.json();
            const firstItem = iData.mediaItems?.[0];
            if (firstItem?.mediaFile?.baseUrl) {
              const imgRes = await fetch(`${firstItem.mediaFile.baseUrl}=d`);
              selectedPhotoBytes = new Uint8Array(await imgRes.arrayBuffer());
            }
          }
        }
      }
    } catch {
    }
  } else {
    mediaItemsSet = mockSelect !== false;
    selectedPhotoBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++)
      selectedPhotoBytes[i] = (i * 37 + 13) % 256;
  }
  if (!mediaItemsSet || !selectedPhotoBytes) {
    return jsonOk({
      sessionId,
      mediaItemsSet: false,
      status: "WAITING_FOR_USER_SELECTION"
    });
  }
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", selectedPhotoBytes));
  const embedding = new Float32Array(128);
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    const val = hash[i % hash.length] / 255 * 2 - 1;
    embedding[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < 128; i++)
    embedding[i] /= norm;
  selectedPhotoBytes.fill(0);
  const existingBio = await env.WORKSHOP_DB.prepare(
    `SELECT biometric_template_ciphertext, template_iv FROM vault_biometrics WHERE user_id = ? LIMIT 1`
  ).bind(session.userId).first();
  let finalEmbedding = embedding;
  if (existingBio) {
    try {
      const existingEmb = await decryptUnderKek(
        env.BIOMETRIC_KEK_V1,
        existingBio.biometric_template_ciphertext,
        existingBio.template_iv
      );
      let mNorm = 0;
      const merged = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        merged[i] = existingEmb[i] * 0.85 + embedding[i] * 0.15;
        mNorm += merged[i] * merged[i];
      }
      mNorm = Math.sqrt(mNorm) || 1;
      for (let i = 0; i < 128; i++)
        merged[i] /= mNorm;
      finalEmbedding = merged;
    } catch {
    }
  }
  const { ciphertext, iv } = await encryptUnderKek4(
    env.BIOMETRIC_KEK_V1,
    new Uint8Array(finalEmbedding.buffer)
  );
  await env.WORKSHOP_DB.prepare(
    `INSERT OR REPLACE INTO vault_biometrics
       (user_id, biometric_template_ciphertext, template_iv, template_version, encryption_key_version, source_type, updated_at)
       VALUES (?, ?, ?, 1, 'v1', 'google_photos_picker', unixepoch())`
  ).bind(session.userId, ciphertext, iv).run();
  await env.WORKSHOP_DB.prepare(`DELETE FROM vault_challenges WHERE id = ?`).bind(sessionId).run();
  if (accessToken && !sessionId.startsWith("sessions/sim_")) {
    try {
      await fetch(`https://photospicker.googleapis.com/v1/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch {
    }
  }
  await writeAuditEvent(env, {
    userId: session.userId,
    deviceId: session.deviceId,
    sessionId: session.sessionId,
    event: "BIOMETRIC_PHOTOS_ENROLL",
    result: "SUCCESS",
    ipHash,
    metadata: { phase: "photos_picker_enrolled_and_cleaned", source: "google_photos_picker" }
  });
  return jsonOk({
    sessionId,
    mediaItemsSet: true,
    referenceAttached: true,
    status: "REFERENCE_ENROLLED",
    userId: session.userId,
    source: "google_photos_picker",
    message: "Reference photo processed. Raw image discarded. Encrypted template stored."
  });
}, "onRequestGet");

// api/vault/photos/picker-session.ts
var onRequestPost10 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let session;
  try {
    session = await requireSession(request, env, "GUEST");
  } catch (resp) {
    return resp;
  }
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  let sessionId;
  let pickerUri;
  let expireTime;
  const accessToken = env.GOOGLE_PHOTOS_ACCESS_TOKEN;
  if (accessToken) {
    try {
      const googleRes = await fetch("https://photospicker.googleapis.com/v1/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      if (googleRes.ok) {
        const gData = await googleRes.json();
        sessionId = gData.id;
        pickerUri = gData.pickerUri;
        expireTime = gData.expireTime;
      } else {
        throw new Error("Google Photos API responded with error: " + googleRes.statusText);
      }
    } catch {
      sessionId = "sessions/sim_" + crypto.randomUUID().slice(0, 8);
      pickerUri = `https://photos.google.com/picker/mock_${crypto.randomUUID().slice(0, 8)}`;
      expireTime = new Date(Date.now() + 36e5).toISOString();
    }
  } else {
    sessionId = "sessions/sim_" + crypto.randomUUID().slice(0, 8);
    pickerUri = `https://photos.google.com/picker/mock_${crypto.randomUUID().slice(0, 8)}`;
    expireTime = new Date(Date.now() + 36e5).toISOString();
  }
  await env.WORKSHOP_DB.prepare(
    `INSERT OR REPLACE INTO vault_challenges (id, user_id, device_id, challenge_type, challenge_data, expires_at)
       VALUES (?, ?, ?, 'ENROLL_SESSION', ?, ?)`
  ).bind(
    sessionId,
    session.userId,
    session.deviceId,
    JSON.stringify({ pickerUri, mediaItemsSet: false, source: "google_photos_picker" }),
    Math.floor(Date.now() / 1e3) + 3600
  ).run();
  await writeAuditEvent(env, {
    userId: session.userId,
    deviceId: session.deviceId,
    sessionId: session.sessionId,
    event: "BIOMETRIC_PHOTOS_ENROLL",
    result: "SUCCESS",
    ipHash,
    metadata: { phase: "photos_picker_session_created", sessionId }
  });
  return jsonOk({
    sessionId,
    pickerUri,
    expireTime,
    mediaItemsSet: false,
    instructions: "Open pickerUri in a controlled browser popup. Once user completes photo selection, poll /api/vault/photos/picker-poll."
  });
}, "onRequestPost");

// api/vault/scan/complete.ts
var COSINE_THRESHOLD = 0.82;
async function importAesKey2(keyMaterial) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(keyMaterial));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}
__name(importAesKey2, "importAesKey");
async function decryptUnderKek2(kek, ciphertextB64, ivB64) {
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(kek));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new Float32Array(plaintext);
}
__name(decryptUnderKek2, "decryptUnderKek");
function cosineSimilarity(a, b) {
  if (a.length !== b.length)
    return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0)
    return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
__name(cosineSimilarity, "cosineSimilarity");
var onRequestPost11 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:scan_complete", ip);
  if (!rl.allowed) {
    await writeAuditEvent(env, { event: "RATE_LIMITED", result: "DENIED", ipHash });
    return jsonError(429, "Rate limited");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const {
    livenessToken,
    webauthnVerifiedDeviceId,
    webauthnVerifiedUserId,
    encryptedEmbedding,
    embeddingIv
  } = body;
  if (!livenessToken || !webauthnVerifiedDeviceId || !webauthnVerifiedUserId || !encryptedEmbedding || !embeddingIv) {
    return jsonError(400, "Missing fields");
  }
  await writeAuditEvent(env, {
    userId: webauthnVerifiedUserId,
    deviceId: webauthnVerifiedDeviceId,
    event: "SCAN_STARTED",
    result: "SUCCESS",
    ipHash
  });
  const liveness = await consumeChallenge(env, livenessToken, "ENROLL_SESSION");
  if (!liveness || !liveness.challengeData.livenessVerified) {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "LIVENESS_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "invalid_liveness_token"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const device = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, status FROM vault_devices
       WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1`
  ).bind(webauthnVerifiedDeviceId, webauthnVerifiedUserId).first();
  if (!device) {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "WEBAUTHN_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "device_not_active"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const user = await env.WORKSHOP_DB.prepare(
    `SELECT id, display_name, access_level, status FROM vault_users
       WHERE id = ? AND status = 'active' LIMIT 1`
  ).bind(webauthnVerifiedUserId).first();
  if (!user) {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "MODE_DENIED",
      result: "DENIED",
      ipHash,
      reasonCode: "user_not_active"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const bioRecord = await env.WORKSHOP_DB.prepare(
    `SELECT biometric_template_ciphertext, template_iv FROM vault_biometrics WHERE user_id = ? LIMIT 1`
  ).bind(webauthnVerifiedUserId).first();
  if (!bioRecord) {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "FACE_MATCH_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "no_enrolled_template"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  let candidateEmbedding;
  try {
    const ephemeralKey = await importAesKey2(livenessToken);
    const ivBytes = Uint8Array.from(atob(embeddingIv), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(encryptedEmbedding), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, ephemeralKey, cipherBytes);
    candidateEmbedding = new Float32Array(decrypted);
  } catch {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "FACE_MATCH_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "embedding_decrypt_failed"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  let storedEmbedding;
  try {
    storedEmbedding = await decryptUnderKek2(
      env.BIOMETRIC_KEK_V1,
      bioRecord.biometric_template_ciphertext,
      bioRecord.template_iv
    );
  } catch {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "FACE_MATCH_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "kek_decrypt_failed"
    });
    return jsonError(503, "Service unavailable");
  }
  const score = cosineSimilarity(candidateEmbedding, storedEmbedding);
  candidateEmbedding = null;
  storedEmbedding = null;
  if (score < COSINE_THRESHOLD) {
    await writeAuditEvent(env, {
      userId: webauthnVerifiedUserId,
      deviceId: webauthnVerifiedDeviceId,
      event: "FACE_MATCH_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "cosine_below_threshold"
      // NOTE: Never log the actual score to avoid leaking attack oracle info
    });
    await checkRateLimit(env, "identity:face_failures", webauthnVerifiedUserId);
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  await writeAuditEvent(env, {
    userId: webauthnVerifiedUserId,
    deviceId: webauthnVerifiedDeviceId,
    event: "FACE_MATCH_SUCCESS",
    result: "SUCCESS",
    ipHash
  });
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_users SET last_seen_at = ? WHERE id = ?`
  ).bind(now, webauthnVerifiedUserId).run();
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_devices SET last_seen_at = ?, last_ip_hash = ? WHERE id = ?`
  ).bind(now, ipHash, webauthnVerifiedDeviceId).run();
  const accessLevel = user.access_level;
  const capabilities = getCapabilities(accessLevel);
  const { cookieHeader } = await issueSession(env, {
    userId: webauthnVerifiedUserId,
    deviceId: webauthnVerifiedDeviceId,
    accessLevel,
    capabilities
  });
  return new Response(JSON.stringify({
    authenticated: true,
    displayName: user.display_name,
    accessLevel: user.access_level,
    capabilities
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader
    }
  });
}, "onRequestPost");

// api/vault/user/delete.ts
var onRequestDelete = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let session;
  try {
    session = await requireSession(request, env, "GUEST");
  } catch (resp) {
    return resp;
  }
  if (!session.userId) {
    return jsonError(400, "VISITOR sessions cannot be deleted via this endpoint");
  }
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `DELETE FROM vault_biometrics WHERE user_id = ?`
  ).bind(session.userId).run();
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`
  ).bind(now, session.userId).run();
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_audit_log SET user_id = NULL WHERE user_id = ?`
  ).bind(session.userId).run();
  await writeAuditEvent(env, {
    deviceId: session.deviceId,
    sessionId: session.sessionId,
    event: "USER_SELF_DELETED",
    result: "SUCCESS",
    ipHash
  });
  await env.WORKSHOP_DB.prepare(
    `DELETE FROM vault_users WHERE id = ?`
  ).bind(session.userId).run();
  return new Response(JSON.stringify({ deleted: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie()
    }
  });
}, "onRequestDelete");

// api/vault/visit/create.ts
var onRequestPost12 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:visit_create", ip);
  if (!rl.allowed)
    return jsonError(429, "Rate limited");
  const existing = await validateSession(request, env);
  if (existing) {
    return jsonOk({
      accessLevel: existing.accessLevel,
      capabilities: existing.capabilities,
      existing: true
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  if (!body.deviceSignals)
    return jsonError(400, "Missing device signals");
  const bindingHash = await computeDeviceBindingHash(body.deviceSignals, env.DEVICE_BINDING_SECRET);
  const visitorDeviceId = `vis_${bindingHash.slice(0, 16)}`;
  const { cookieHeader } = await issueSession(env, {
    userId: null,
    deviceId: visitorDeviceId,
    accessLevel: "VISITOR",
    capabilities: CAPABILITIES.VISITOR,
    ttlSeconds: 1800
  });
  await writeAuditEvent(env, {
    deviceId: visitorDeviceId,
    event: "VISIT_SESSION_CREATED",
    result: "SUCCESS",
    ipHash
  });
  return new Response(JSON.stringify({
    accessLevel: "VISITOR",
    capabilities: CAPABILITIES.VISITOR
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader
    }
  });
}, "onRequestPost");

// api/vault/webauthn/auth-challenge.ts
var onRequestPost13 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:vault", ip);
  if (!rl.allowed) {
    await writeAuditEvent(env, { event: "RATE_LIMITED", result: "DENIED", ipHash });
    return jsonError(429, "Rate limited");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  if (!body.deviceSignals)
    return jsonError(400, "Missing device signals");
  const bindingHash = await computeDeviceBindingHash(body.deviceSignals, env.DEVICE_BINDING_SECRET);
  const record = await env.WORKSHOP_DB.prepare(
    `SELECT d.id AS device_id, d.user_id, d.webauthn_credential_id, d.status,
              u.access_level
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.device_binding_hash = ? AND d.status = 'active' AND u.status = 'active'
       LIMIT 1`
  ).bind(bindingHash).first();
  if (!record || !record.webauthn_credential_id) {
    const { challengeId: challengeId2, challenge: challenge2 } = await createChallenge(env, {
      challengeType: "WEBAUTHN_AUTH",
      challengeData: { dummy: true }
    });
    return jsonOk({
      challengeId: challengeId2,
      challenge: challenge2,
      allowCredentials: [],
      timeout: 6e4,
      userVerification: "required"
    });
  }
  const uvPolicy = record.access_level === "OWNER" || record.access_level === "TRUSTED" ? "required" : "preferred";
  const { challengeId, challenge } = await createChallenge(env, {
    challengeType: "WEBAUTHN_AUTH",
    userId: record.user_id,
    deviceId: record.device_id,
    challengeData: { deviceBindingHash: bindingHash, targetAccessLevel: record.access_level }
  });
  return jsonOk({
    challengeId,
    challenge,
    allowCredentials: [
      { id: record.webauthn_credential_id, type: "public-key" }
    ],
    timeout: 6e4,
    userVerification: uvPolicy
  });
}, "onRequestPost");

// api/vault/webauthn/auth-complete.ts
function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
__name(base64urlDecode, "base64urlDecode");
async function importCoseKey(coseBytes) {
  const map = {};
  let i = 0;
  const readUint = /* @__PURE__ */ __name(() => {
    const b = coseBytes[i++];
    const info = b & 31;
    if (info <= 23)
      return info;
    if (info === 24)
      return coseBytes[i++];
    if (info === 25) {
      const v = coseBytes[i] << 8 | coseBytes[i + 1];
      i += 2;
      return v;
    }
    return 0;
  }, "readUint");
  const readItem = /* @__PURE__ */ __name(() => {
    const b = coseBytes[i];
    const major = b >> 5 & 7;
    if (major === 0) {
      return readUint();
    }
    if (major === 1) {
      return -(readUint() + 1);
    }
    if (major === 2) {
      const len = readUint();
      const bytes = coseBytes.slice(i, i + len);
      i += len;
      return bytes;
    }
    i++;
    return 0;
  }, "readItem");
  const mapByte = coseBytes[i++];
  const mapLen = mapByte & 31;
  for (let k = 0; k < mapLen; k++) {
    const key = readItem();
    const value = readItem();
    map[key] = value;
  }
  const kty = map[1];
  const alg = map[3];
  if (kty === 2 && alg === -7) {
    const x = map[-2];
    const y = map[-3];
    const jwk = {
      kty: "EC",
      crv: "P-256",
      x: btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
      y: btoa(String.fromCharCode(...y)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
    };
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  }
  if (kty === 3 && alg === -257) {
    const n = map[-1];
    const e = map[-2];
    const jwk = {
      kty: "RSA",
      alg: "RS256",
      n: btoa(String.fromCharCode(...n)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
      e: btoa(String.fromCharCode(...e)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
    };
    return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  }
  throw new Error(`Unsupported COSE key type: kty=${kty}, alg=${alg}`);
}
__name(importCoseKey, "importCoseKey");
var onRequestPost14 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:scan_complete", ip);
  if (!rl.allowed) {
    await writeAuditEvent(env, { event: "RATE_LIMITED", result: "DENIED", ipHash });
    return jsonError(429, "Rate limited");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { challengeId, assertionResponse, deviceSignals } = body;
  if (!challengeId || !assertionResponse || !deviceSignals) {
    return jsonError(400, "Missing fields");
  }
  const stored = await consumeChallenge(env, challengeId, "WEBAUTHN_AUTH");
  if (!stored) {
    return jsonError(409, "Challenge expired or already used");
  }
  const bindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);
  const storedHash = stored.challengeData.deviceBindingHash;
  if (storedHash && bindingHash !== storedHash) {
    await writeAuditEvent(env, {
      userId: stored.userId,
      deviceId: stored.deviceId,
      event: "DEVICE_CONFLICT",
      result: "DENIED",
      ipHash,
      reasonCode: "binding_hash_mismatch"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  if (!stored.deviceId)
    return jsonError(401, "VAULT ACCESS DENIED");
  const device = await env.WORKSHOP_DB.prepare(
    `SELECT d.id, d.user_id, d.webauthn_credential_id, d.webauthn_public_key,
              d.webauthn_alg, d.sign_count, d.status, u.access_level
       FROM vault_devices d
       JOIN vault_users u ON d.user_id = u.id
       WHERE d.id = ? AND d.status = 'active' AND u.status = 'active'
       LIMIT 1`
  ).bind(stored.deviceId).first();
  if (!device || !device.webauthn_public_key) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "no_credential"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const clientDataBytes = base64urlDecode(assertionResponse.response.clientDataJSON);
  let clientData;
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch {
    return jsonError(400, "Invalid clientDataJSON");
  }
  if (clientData.type !== "webauthn.get") {
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  if (clientData.challenge !== stored.challenge) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "challenge_mismatch",
      userId: device.user_id,
      deviceId: device.id
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const expectedOrigin = env.VAULT_ORIGIN || new URL(request.url).origin;
  if (clientData.origin !== expectedOrigin) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "origin_mismatch",
      userId: device.user_id,
      deviceId: device.id
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const authDataBytes = base64urlDecode(assertionResponse.response.authenticatorData);
  const rpId = new URL(expectedOrigin).hostname;
  const expectedRpIdHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId))
  );
  if (!expectedRpIdHash.every((b, i) => b === authDataBytes[i])) {
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const flags2 = authDataBytes[32];
  if (!(flags2 & 1)) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "user_presence_missing",
      userId: device.user_id,
      deviceId: device.id
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  if (device.access_level === "OWNER" || device.access_level === "TRUSTED") {
    if (!(flags2 & 4)) {
      await writeAuditEvent(env, {
        event: "WEBAUTHN_FAILURE",
        result: "DENIED",
        ipHash,
        reasonCode: "user_verification_required_for_tier",
        userId: device.user_id,
        deviceId: device.id,
        metadata: { accessLevel: device.access_level }
      });
      return jsonError(401, "VAULT ACCESS DENIED");
    }
  }
  const newSignCount = new DataView(authDataBytes.buffer, authDataBytes.byteOffset + 33).getUint32(0, false);
  if (device.sign_count > 0 && newSignCount <= device.sign_count) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "DENIED",
      ipHash,
      reasonCode: "sign_count_clone_anomaly",
      userId: device.user_id,
      deviceId: device.id,
      metadata: { received: newSignCount, stored: device.sign_count }
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const signature = base64urlDecode(assertionResponse.response.signature);
  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", clientDataBytes)
  );
  const verificationData = new Uint8Array(authDataBytes.length + clientDataHash.length);
  verificationData.set(authDataBytes);
  verificationData.set(clientDataHash, authDataBytes.length);
  const cosePublicKeyBytes = base64urlDecode(device.webauthn_public_key);
  let publicKey;
  try {
    publicKey = await importCoseKey(cosePublicKeyBytes);
  } catch {
    return jsonError(500, "Key import failed");
  }
  const algorithm = device.webauthn_alg === -257 ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" };
  const valid = await crypto.subtle.verify(
    algorithm,
    publicKey,
    signature,
    verificationData
  );
  if (!valid) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "signature_invalid",
      userId: device.user_id,
      deviceId: device.id
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_devices SET sign_count = ?, last_seen_at = ?, last_ip_hash = ? WHERE id = ?`
  ).bind(newSignCount, now, ipHash, device.id).run();
  await writeAuditEvent(env, {
    userId: device.user_id,
    deviceId: device.id,
    event: "WEBAUTHN_SUCCESS",
    result: "SUCCESS",
    ipHash
  });
  return jsonOk({
    webauthnVerified: true,
    deviceId: device.id,
    userId: device.user_id
  });
}, "onRequestPost");

// api/vault/webauthn/register-challenge.ts
var onRequestPost15 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  const rl = await checkRateLimit(env, "ip:webauthn_register", ip);
  if (!rl.allowed) {
    await writeAuditEvent(env, {
      event: "RATE_LIMITED",
      result: "DENIED",
      ipHash,
      reasonCode: "webauthn_register"
    });
    return jsonError(429, `Rate limited. Retry after ${rl.retryAfter}s`);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { displayName, deviceSignals } = body;
  if (!displayName?.trim() || displayName.trim().length > 64) {
    return jsonError(400, "Invalid display name");
  }
  if (!deviceSignals)
    return jsonError(400, "Missing device signals");
  const bindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);
  const existingDevice = await env.WORKSHOP_DB.prepare(
    `SELECT id, user_id, status FROM vault_devices WHERE device_binding_hash = ? LIMIT 1`
  ).bind(bindingHash).first();
  if (existingDevice && existingDevice.status === "active") {
    await writeAuditEvent(env, {
      deviceId: existingDevice.id,
      userId: existingDevice.user_id,
      event: "DEVICE_CONFLICT",
      result: "CONFLICT",
      ipHash,
      reasonCode: "existing_device_enroll_attempt"
    });
    return jsonError(409, "DEVICE_BOUND");
  }
  const { challengeId, challenge } = await createChallenge(env, {
    challengeType: "WEBAUTHN_REGISTER",
    challengeData: {
      displayName: displayName.trim(),
      deviceBindingHash: bindingHash,
      ipHash
    }
  });
  const rpId = new URL(env.VAULT_ORIGIN || request.url).hostname;
  return jsonOk({
    challengeId,
    // PublicKeyCredentialCreationOptions fields
    challenge,
    rp: { id: rpId, name: "VAULT-01" },
    user: {
      // Temporary user handle — real userId assigned at register-complete
      id: challengeId,
      name: displayName.trim(),
      displayName: displayName.trim()
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      // ES256
      { type: "public-key", alg: -257 }
      // RS256
    ],
    timeout: 6e4,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred"
    },
    // Exclude any previously revoked credentials for this device
    excludeCredentials: existingDevice ? [{
      id: existingDevice.id,
      type: "public-key"
    }] : []
  });
}, "onRequestPost");

// api/vault/webauthn/register-complete.ts
function base64urlDecode2(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
__name(base64urlDecode2, "base64urlDecode");
function base64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(base64urlEncode, "base64urlEncode");
function extractAuthData(authDataBytes) {
  let offset = 0;
  const rpIdHash = authDataBytes.slice(offset, offset += 32);
  const flags2 = authDataBytes[offset++];
  const signCount = new DataView(authDataBytes.buffer, authDataBytes.byteOffset + offset).getUint32(0, false);
  offset += 4;
  if (!(flags2 & 64) || authDataBytes.length <= offset) {
    return { rpIdHash, flags: flags2, signCount, credentialId: null, cosePublicKey: null };
  }
  offset += 16;
  const credIdLen = new DataView(authDataBytes.buffer, authDataBytes.byteOffset + offset).getUint16(0, false);
  offset += 2;
  const credentialId = authDataBytes.slice(offset, offset += credIdLen);
  const cosePublicKey = authDataBytes.slice(offset);
  return { rpIdHash, flags: flags2, signCount, credentialId, cosePublicKey };
}
__name(extractAuthData, "extractAuthData");
var onRequestPost16 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }
  const { challengeId, attestationResponse, deviceSignals, displayName } = body;
  if (!challengeId || !attestationResponse || !deviceSignals) {
    return jsonError(400, "Missing fields");
  }
  const stored = await consumeChallenge(env, challengeId, "WEBAUTHN_REGISTER");
  if (!stored) {
    return jsonError(409, "Challenge expired or already used");
  }
  const clientDataBytes = base64urlDecode2(attestationResponse.response.clientDataJSON);
  let clientData;
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch {
    return jsonError(400, "Invalid clientDataJSON");
  }
  if (clientData.type !== "webauthn.create") {
    return jsonError(400, "Wrong operation type");
  }
  if (clientData.challenge !== stored.challenge) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "challenge_mismatch"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const expectedOrigin = env.VAULT_ORIGIN || new URL(request.url).origin;
  if (clientData.origin !== expectedOrigin) {
    await writeAuditEvent(env, {
      event: "WEBAUTHN_FAILURE",
      result: "FAILURE",
      ipHash,
      reasonCode: "origin_mismatch"
    });
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const attestationBytes = base64urlDecode2(attestationResponse.response.attestationObject);
  let authDataBytes;
  try {
    const authDataKey = new TextEncoder().encode("authData");
    let i = 0;
    while (i < attestationBytes.length) {
      const match2 = authDataKey.every((b, k) => attestationBytes[i + 1 + k] === b);
      if (attestationBytes[i] === 104 && match2) {
        i += 1 + authDataKey.length;
        const lenByte = attestationBytes[i];
        let authDataLen;
        let lenBytes = 1;
        if (lenByte <= 23) {
          authDataLen = lenByte;
        } else if (lenByte === 88) {
          authDataLen = attestationBytes[i + 1];
          lenBytes = 2;
        } else if (lenByte === 89) {
          authDataLen = attestationBytes[i + 1] << 8 | attestationBytes[i + 2];
          lenBytes = 3;
        } else {
          break;
        }
        authDataBytes = attestationBytes.slice(i + lenBytes, i + lenBytes + authDataLen);
        break;
      }
      i++;
    }
    if (!authDataBytes)
      throw new Error("authData not found");
  } catch {
    return jsonError(400, "Cannot parse attestation object");
  }
  const authData = extractAuthData(authDataBytes);
  const rpId = new URL(expectedOrigin).hostname;
  const expectedRpIdHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId))
  );
  if (!expectedRpIdHash.every((b, i) => b === authData.rpIdHash[i])) {
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  if (!(authData.flags & 4)) {
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  if (!authData.credentialId || !authData.cosePublicKey) {
    return jsonError(400, "No credential data in authenticator response");
  }
  const bindingHash = await computeDeviceBindingHash(deviceSignals, env.DEVICE_BINDING_SECRET);
  if (bindingHash !== stored.challengeData.deviceBindingHash) {
    return jsonError(401, "VAULT ACCESS DENIED");
  }
  const credentialId = base64urlEncode(authData.credentialId);
  const publicKey = base64urlEncode(authData.cosePublicKey);
  const userId = newId("usr", 12);
  const deviceId = newId("dev", 12);
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `INSERT INTO vault_users (id, display_name, access_level, status, created_at, updated_at)
       VALUES (?, ?, 'GUEST', 'active', ?, ?)`
  ).bind(userId, displayName.trim(), now, now).run();
  let webauthnAlg = -7;
  try {
    if (authData.cosePublicKey) {
      for (let idx = 0; idx < authData.cosePublicKey.length - 3; idx++) {
        if (authData.cosePublicKey[idx] === 3 && authData.cosePublicKey[idx + 1] === 57 && authData.cosePublicKey[idx + 2] === 1 && authData.cosePublicKey[idx + 3] === 0) {
          webauthnAlg = -257;
          break;
        }
      }
    }
  } catch {
  }
  await env.WORKSHOP_DB.prepare(
    `INSERT OR REPLACE INTO vault_devices
         (id, user_id, device_binding_hash, webauthn_credential_id, webauthn_public_key,
          webauthn_alg, sign_count, status, first_seen_at, last_seen_at, last_ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
  ).bind(
    deviceId,
    userId,
    bindingHash,
    credentialId,
    publicKey,
    webauthnAlg,
    authData.signCount,
    now,
    now,
    ipHash
  ).run();
  await writeAuditEvent(env, {
    userId,
    deviceId,
    event: "WEBAUTHN_REGISTER_SUCCESS",
    result: "SUCCESS",
    ipHash
  });
  return jsonOk({ userId, deviceId, status: "DEVICE_REGISTERED" });
}, "onRequestPost");

// api/state/[namespace]/[elementId].ts
var LIMITS = {
  rs1: { maxLen: 2e3 },
  rs2: { maxLen: 1e3 },
  rs3: { maxLen: 1e3 },
  ls1: { maxLen: 1e3 },
  ls2: { maxLen: 350, maxActive: 500 },
  // sticky notes 280-char cap + meta, 500 active notes cap
  ls3: { maxLen: 1e3 }
};
var onRequestPatch = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const namespace = context.params.namespace;
    const elementId = context.params.elementId;
    if (!db || !namespace || !elementId) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const partial = await context.request.json();
    const limit = LIMITS[namespace];
    const existing = await db.prepare("SELECT data FROM interaction_state WHERE namespace = ? AND element_id = ?").bind(namespace, elementId).first();
    let current = {};
    if (existing && existing.data) {
      try {
        current = JSON.parse(existing.data);
      } catch {
      }
    }
    const merged = { ...current, ...partial };
    const mergedStr = JSON.stringify(merged);
    if (limit?.maxLen && mergedStr.length > limit.maxLen) {
      return new Response(JSON.stringify({ error: "Payload too large", maxLen: limit.maxLen }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      });
    }
    const now = Date.now();
    await db.prepare(
      "INSERT INTO interaction_state (namespace, element_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(namespace, element_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
    ).bind(namespace, elementId, mergedStr, now).run();
    if (limit?.maxActive && Math.random() < 0.02) {
      await db.prepare(
        `DELETE FROM interaction_state WHERE namespace = ? AND element_id IN (
             SELECT element_id FROM interaction_state WHERE namespace = ? ORDER BY updated_at ASC LIMIT -1 OFFSET ?
           )`
      ).bind(namespace, namespace, limit.maxActive).run();
    }
    return new Response(mergedStr, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPatch");

// api/admin/portfolio.ts
var onRequestGet3 = /* @__PURE__ */ __name(async ({ env }) => {
  const db = env?.WORKSHOP_DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "Database unavailable" }), { status: 503 });
  }
  const { results } = await db.prepare("SELECT * FROM portfolio_items ORDER BY created_at DESC").all();
  const items = (results || []).map((r) => ({
    ...r,
    tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags
  }));
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestGet");
var onRequestPost17 = /* @__PURE__ */ __name(async ({ env, request }) => {
  const db = env?.WORKSHOP_DB;
  if (!db)
    return new Response(JSON.stringify({ error: "Database unavailable" }), { status: 503 });
  try {
    const body = await request.json();
    if (!body.title || !body.summary || !body.kind) {
      return new Response(JSON.stringify({ error: "title, summary, and kind are required" }), { status: 400 });
    }
    if (!body.proof_url || !/^https?:\/\//.test(body.proof_url)) {
      return new Response(JSON.stringify({ error: "proof_url is required and must be a valid http/https URL" }), { status: 422 });
    }
    const id = body.id || `${body.kind}:${crypto.randomUUID().slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1e3);
    await db.prepare(
      `INSERT INTO portfolio_items (id, kind, title, summary, proof_url, proof_type, issuer, date_from, date_to, tags, weight, visible, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         kind=excluded.kind,
         title=excluded.title,
         summary=excluded.summary,
         proof_url=excluded.proof_url,
         proof_type=excluded.proof_type,
         issuer=excluded.issuer,
         date_from=excluded.date_from,
         date_to=excluded.date_to,
         tags=excluded.tags,
         weight=excluded.weight,
         updated_at=excluded.updated_at`
    ).bind(
      id,
      body.kind,
      body.title,
      body.summary,
      body.proof_url,
      body.proof_type || "link",
      body.issuer ?? null,
      body.date_from ?? null,
      body.date_to ?? null,
      JSON.stringify(body.tags ?? []),
      body.weight ?? 0,
      now,
      now
    ).run();
    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}, "onRequestPost");
var onRequestPatch2 = /* @__PURE__ */ __name(async ({ env, request }) => {
  const db = env?.WORKSHOP_DB;
  if (!db)
    return new Response(JSON.stringify({ error: "Database unavailable" }), { status: 503 });
  try {
    const { id, visible, verified } = await request.json();
    if (!id)
      return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    const now = Math.floor(Date.now() / 1e3);
    await db.prepare(
      `UPDATE portfolio_items SET
         visible = COALESCE(?, visible),
         verified_at = CASE WHEN ? = 1 THEN ? ELSE verified_at END,
         updated_at = ?
       WHERE id = ?`
    ).bind(
      visible !== void 0 ? visible ? 1 : 0 : null,
      verified !== void 0 ? verified ? 1 : 0 : 0,
      now,
      now,
      id
    ).run();
    return new Response(JSON.stringify({ ok: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}, "onRequestPatch");
var onRequestDelete2 = /* @__PURE__ */ __name(async ({ env, request }) => {
  const db = env?.WORKSHOP_DB;
  if (!db)
    return new Response(JSON.stringify({ error: "Database unavailable" }), { status: 503 });
  try {
    const { id } = await request.json();
    if (!id)
      return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    await db.prepare("DELETE FROM portfolio_items WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ ok: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}, "onRequestDelete");

// api/calendar/freebusy.ts
var TTL_SECONDS = 300;
var WINDOW_DAYS = 30;
async function getAccessToken(env) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  if (!res.ok)
    throw new Error("token_refresh_failed");
  const j = await res.json();
  return j.access_token;
}
__name(getAccessToken, "getAccessToken");
async function fetchFreshFreeBusy(env) {
  const accessToken = await getAccessToken(env);
  const calendarId = env.CALENDAR_ID || "primary";
  const timeMin = /* @__PURE__ */ new Date();
  const timeMax = new Date(Date.now() + WINDOW_DAYS * 864e5);
  const [fbRes, evRes] = await Promise.all([
    fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: calendarId }] })
    }),
    fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  ]);
  if (!fbRes.ok)
    throw new Error("freebusy_query_failed");
  const j = await fbRes.json();
  let events = [];
  if (evRes.ok) {
    const evJson = await evRes.json();
    events = (evJson.items || []).map((e) => ({
      id: e.id,
      summary: e.summary || "Reserved / Meeting",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      status: e.status || "confirmed",
      location: e.location || "",
      description: e.description || ""
    }));
  }
  const rawBusy = j.calendars?.[calendarId]?.busy ?? j.calendars?.primary?.busy ?? [];
  const busyMap = /* @__PURE__ */ new Map();
  for (const b of rawBusy) {
    busyMap.set(`${b.start}_${b.end}`, { start: b.start, end: b.end });
  }
  for (const e of events) {
    if (e.start && e.end) {
      const sIso = new Date(e.start).toISOString();
      const eIso = new Date(e.end).toISOString();
      busyMap.set(`${sIso}_${eIso}`, { start: sIso, end: eIso });
    }
  }
  return { busy: Array.from(busyMap.values()), events, syncedAt: Date.now() };
}
__name(fetchFreshFreeBusy, "fetchFreshFreeBusy");
var onRequestGet4 = /* @__PURE__ */ __name(async (context) => {
  const { env } = context;
  const db = env.WORKSHOP_DB;
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
    return new Response(JSON.stringify({ configured: false }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }
    });
  }
  try {
    const row = await db.prepare("SELECT payload, cached_at FROM calendar_cache WHERE id = ?").bind("freebusy").first();
    const nowSec = Math.floor(Date.now() / 1e3);
    let payload;
    if (row && nowSec - row.cached_at < TTL_SECONDS) {
      payload = JSON.parse(row.payload);
    } else {
      payload = await fetchFreshFreeBusy(env);
      await db.prepare(
        "INSERT INTO calendar_cache (id, payload, cached_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, cached_at = excluded.cached_at"
      ).bind("freebusy", JSON.stringify(payload), nowSec).run();
    }
    const etag = `"fb-${Math.floor(payload.syncedAt / 1e3)}"`;
    if (context.request.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304 });
    return new Response(JSON.stringify({ configured: true, ...payload }), {
      headers: { "Content-Type": "application/json", "ETag": etag, "Cache-Control": "public, max-age=120, stale-while-revalidate=300" }
    });
  } catch {
    return new Response(JSON.stringify({ configured: true, error: "sync_failed", busy: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }
}, "onRequestGet");

// api/calendar/request.ts
var COOLDOWN_SECONDS = 180;
var MIN_MINUTES = 15;
var MAX_MINUTES = 300;
async function sha256Hex(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
__name(json, "json");
var onRequestPost18 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const db = env.WORKSHOP_DB;
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN || !env.OWNER_EMAIL) {
    return json({ ok: false, error: "not_configured" }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const { name, email, location, description, startIso, endIso } = body || {};
  if (!name || !email || !location || !description || !startIso || !endIso)
    return json({ ok: false, error: "missing_fields" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ ok: false, error: "bad_email" }, 400);
  if (String(name).length > 100 || String(location).length > 200 || String(description).length > 1e3)
    return json({ ok: false, error: "too_long" }, 400);
  const start = new Date(startIso), end = new Date(endIso);
  const durMin = (end.getTime() - start.getTime()) / 6e4;
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || !(start.getTime() > Date.now()) || !(durMin >= MIN_MINUTES && durMin <= MAX_MINUTES)) {
    return json({ ok: false, error: "bad_slot" }, 400);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const keyHash = await sha256Hex(`${ip}:calendar_request`);
  const nowSec = Math.floor(Date.now() / 1e3);
  const existing = await db.prepare("SELECT window_expires_at FROM rate_limits WHERE key_hash = ?").bind(keyHash).first();
  if (existing && existing.window_expires_at > nowSec) {
    return json({ ok: false, error: "rate_limited", retryAfter: existing.window_expires_at - nowSec }, 429);
  }
  await db.prepare(
    "INSERT INTO rate_limits (key_hash, request_count, window_expires_at) VALUES (?, 1, ?) ON CONFLICT(key_hash) DO UPDATE SET request_count = request_count + 1, window_expires_at = excluded.window_expires_at"
  ).bind(keyHash, nowSec + COOLDOWN_SECONDS).run();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" })
  });
  if (!tokenRes.ok)
    return json({ ok: false, error: "auth_failed" }, 502);
  const { access_token } = await tokenRes.json();
  const calendarId = env.CALENDAR_ID || "primary";
  const fbRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: start.toISOString(), timeMax: end.toISOString(), items: [{ id: calendarId }] })
  });
  if (!fbRes.ok)
    return json({ ok: false, error: "freebusy_check_failed" }, 502);
  const fbJson = await fbRes.json();
  const busy = fbJson.calendars?.[calendarId]?.busy ?? fbJson.calendars?.primary?.busy ?? [];
  const overlaps = busy.some((b) => new Date(b.start) < end && new Date(b.end) > start);
  if (overlaps)
    return json({ ok: false, error: "slot_taken" }, 409);
  const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `Meeting request: ${name}`,
      description: `${description}

Requested via holo-calendar by ${name} (${email}).`,
      location,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: [{ email: env.OWNER_EMAIL }, { email }],
      status: "tentative",
      guestsCanModify: false
    })
  });
  const id = crypto.randomUUID();
  const ipHash = await sha256Hex(ip);
  if (!evRes.ok) {
    await db.prepare(
      "INSERT INTO booking_requests (id, visitor_name, visitor_email, location, description, start_iso, end_iso, status, ip_hash) VALUES (?,?,?,?,?,?,?,?,?)"
    ).bind(id, name, email, location, description, startIso, endIso, "failed", ipHash).run();
    return json({ ok: false, error: "insert_failed" }, 502);
  }
  const evJson = await evRes.json();
  await db.prepare(
    "INSERT INTO booking_requests (id, visitor_name, visitor_email, location, description, start_iso, end_iso, google_event_id, status, ip_hash) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(id, name, email, location, description, startIso, endIso, evJson.id, "created", ipHash).run();
  await db.prepare("DELETE FROM calendar_cache WHERE id = ?").bind("freebusy").run();
  return json({ ok: true, id });
}, "onRequestPost");

// api/geo/earthquakes.ts
var onRequestGet5 = /* @__PURE__ */ __name(async () => {
  try {
    const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson", {
      headers: { "User-Agent": "Cave-Vault-Intel/1.0" }
    });
    if (!res.ok)
      throw new Error(`USGS upstream error ${res.status}`);
    const data = await res.json();
    const quakes = (data.features || []).filter((f) => f.properties && f.properties.mag != null && f.geometry?.coordinates?.length >= 2).slice(0, 100).map((f) => ({
      id: f.id,
      title: f.properties.title || "Seismic Event",
      mag: Number(f.properties.mag),
      place: f.properties.place || "Unknown",
      lon: Number(f.geometry.coordinates[0]),
      lat: Number(f.geometry.coordinates[1]),
      depth_km: Number(f.geometry.coordinates[2] || 0),
      time: f.properties.time
    }));
    return new Response(JSON.stringify({
      count: quakes.length,
      generated: data.metadata?.generated || Date.now(),
      earthquakes: quakes
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, earthquakes: [] }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// api/geo/flights.ts
var onRequestGet6 = /* @__PURE__ */ __name(async () => {
  try {
    let flights = [];
    try {
      const res = await fetch("https://opensky-network.org/api/states/all", {
        headers: { "User-Agent": "Cave-Vault-Intel/1.0 (Research)" }
      });
      if (res.ok) {
        const data = await res.json();
        const states = data.states || [];
        flights = states.filter((s) => s[5] != null && s[6] != null && s[1] && s[1].trim()).slice(0, 80).map((s) => ({
          callsign: (s[1] || "").trim(),
          country: s[2] || "",
          lon: Number(s[5]),
          lat: Number(s[6]),
          alt_m: Number(s[7] || s[13] || 1e4),
          velocity_kmh: Math.round(Number(s[9] || 250) * 3.6),
          heading: Number(s[10] || 0)
        }));
      }
    } catch {
    }
    if (flights.length === 0) {
      const adsbRes = await fetch("https://api.adsb.lol/v2/ladd", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (adsbRes.ok) {
        const adsb = await adsbRes.json();
        flights = (adsb.ac || []).filter((a) => a.lat != null && a.lon != null && (a.flight || a.r)).slice(0, 80).map((a) => ({
          callsign: (a.flight || a.r || "UNKN").trim(),
          country: "INTL",
          lon: Number(a.lon),
          lat: Number(a.lat),
          alt_m: Math.round(Number(a.alt_baro || 3e4) * 0.3048),
          velocity_kmh: Math.round(Number(a.gs || 450) * 1.852),
          heading: Number(a.track || 0)
        }));
      }
    }
    return new Response(JSON.stringify({
      count: flights.length,
      timestamp: Date.now(),
      flights
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=10"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, flights: [] }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// api/geo/locate.ts
var onRequestGet7 = /* @__PURE__ */ __name(async (context) => {
  const cf = context.request.cf || {};
  return new Response(JSON.stringify({
    lat: cf.latitude != null ? Number(cf.latitude) : null,
    lon: cf.longitude != null ? Number(cf.longitude) : null,
    city: cf.city ?? null,
    country: cf.country ?? null,
    timezone: cf.timezone ?? null
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store"
    }
  });
}, "onRequestGet");

// api/geo/news.ts
var GLOBAL_NEWS_CHANNELS = [
  {
    "id": "abc-us",
    "name": "ABC News Live",
    "network": "ABC News Digital",
    "country": "United States",
    "city": "Washington, DC",
    "lat": 38.9072,
    "lon": -77.0369,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://abcnews-streams.akamaized.net/hls/live/2023560/abcnewshudson1/master.m3u8",
    "siteUrl": "https://abcnews.go.com/live",
    "headlines": [
      "CONGRESSIONAL COMMITTEES ADVANCE COMPREHENSIVE TECHNOLOGY LEGISLATION",
      "FEDERAL EMERGENCY LOGISTICS TEAMS DEPLOY TELEMETRY MESH IN PACIFIC",
      "COAST GUARD MONITORS COMMERCIAL MARITIME CORRIDORS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.826Z"
  },
  {
    "id": "cbs-us",
    "name": "CBS News 24/7",
    "network": "CBS News Streaming Network",
    "country": "United States",
    "city": "New York (Midtown)",
    "lat": 40.758,
    "lon": -73.9855,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8",
    "siteUrl": "https://www.cbsnews.com/live",
    "headlines": [
      "NATIONAL WEATHER RADAR MONITORS JET STREAM CYCLONIC CONVERGENCE",
      "OFFSHORE CLEAN ENERGY GRID EXPANSION CONNECTS EASTERN INTERCONNECT",
      "SUPREME COURT ISSUES SUMMARY DOCKET RULINGS ON INTERSTATE TRANSIT"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "livenow-us",
    "name": "LiveNOW from FOX",
    "network": "FOX Television Stations",
    "country": "United States",
    "city": "Orlando (National Desk)",
    "lat": 28.5383,
    "lon": -81.3792,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://fox-foxnewsnow-vizio.amagi.tv/playlist.m3u8",
    "siteUrl": "https://www.livenowfox.com",
    "headlines": [
      "CONTINUOUS 24/7 ROLLING COVERAGE ACROSS MAJOR NATIONAL DEVELOPMENTS",
      "TRANSPORTATION SAFETY BOARD COMMISSIONS AUTONOMOUS RAIL STUDY",
      "AEROSPACE TEST CORRIDORS REPORT SUCCESSFUL TELEMETRY UPLINK"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "sky-uk",
    "name": "Sky News Live",
    "network": "Sky News International",
    "country": "United Kingdom",
    "city": "London (Westminster)",
    "lat": 51.5074,
    "lon": -0.1278,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "embed",
    "streamUrl": "https://www.youtube-nocookie.com/embed/9Auq9mYxFEE?autoplay=1&mute=1&playsinline=1",
    "siteUrl": "https://news.sky.com",
    "headlines": [
      "GLOBAL MARITIME DEFENSE ALLIANCE CONVENES IN LONDON",
      "BANK OF ENGLAND RELEASES QUARTERLY MONETARY RESERVES AUDIT",
      "NORTH SEA WIND CORRIDOR ACHIEVES SYNCHRONIZED GRID COMMISSIONING"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "gbnews-uk",
    "name": "GB News Live HD",
    "network": "GB News Playouts",
    "country": "United Kingdom",
    "city": "London (Paddington)",
    "lat": 51.517,
    "lon": -0.178,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://amg01076-lightningintern-gbnewsau-samsungau-et7fz.amagi.tv/playlist/amg01076-lightningintern-gbnewsau-samsungau/playlist.m3u8",
    "siteUrl": "https://www.gbnews.com/live",
    "headlines": [
      "COMMONWEALTH PARLIAMENTARY TRADE MISSIONS REPORT RESILIENT EXPORTS",
      "CIVIL AVIATION AUTHORITY ADOPTS NEXT-GEN FLIGHT TELEMETRY",
      "REGIONAL ENERGY INFRASTRUCTURE PASSES RESILIENCE AUDITS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "lbc-uk",
    "name": "LBC News Live",
    "network": "Global Media UK",
    "country": "United Kingdom",
    "city": "London (Leicester Square)",
    "lat": 51.5115,
    "lon": -0.1285,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "embed",
    "streamUrl": "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&playsinline=1",
    "siteUrl": "https://www.lbc.co.uk",
    "headlines": [
      "METROPOLITAN COMMUTER NETWORK ENTERS AUTONOMOUS SIGNALLING PHASE",
      "PUBLIC ACCOUNTS COMMITTEE AUDITS CRITICAL TELECOM RESERVES",
      "CHAMBER OF COMMERCE POSTS ACCELERATED INDUSTRIAL DATA"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "france24-fr",
    "name": "France 24 English",
    "network": "France M\xE9dias Monde",
    "country": "France",
    "city": "Paris",
    "lat": 48.8566,
    "lon": 2.3522,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.france24.com/hls/live/2037218-b/F24_EN_HI_HLS/master_5000.m3u8",
    "siteUrl": "https://www.france24.com/en/live",
    "headlines": [
      "EUROPEAN ENERGY MINISTERS COMPLETE CROSS-BORDER COMPACT",
      "PARIS HIGH-TECH SUMMIT INAUGURATES TRANS-EUROPEAN FIBER BACKBONE",
      "FRENCH MARITIME PATROL MONITORS WESTERN CHANNEL NAVIGATION"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "france24-fast",
    "name": "France 24 FAST Live",
    "network": "France M\xE9dias Monde FAST",
    "country": "France",
    "city": "Issy-les-Moulineaux",
    "lat": 48.824,
    "lon": 2.273,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://amg00106-amg00106c1-rakuten-uk-4654.playouts.now.amagi.tv/playlist/amg00106-france24fast-france24-rakutenuk/playlist.m3u8",
    "siteUrl": "https://www.france24.com/en",
    "headlines": [
      "GLOBAL RENEWABLE ALLIANCE FINALIZES HYDROGEN TRANSMISSION CODE",
      "EUROPEAN AEROSPACE PLATFORMS EXPAND SATELLITE RADAR SENSORS",
      "INTERNATIONAL MONETARY AUDIT HIGHLIGHTS STABILIZING TRADE RAILS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "euronews-fr",
    "name": "Euronews English",
    "network": "Euronews Group",
    "country": "France",
    "city": "Lyon (Confluence)",
    "lat": 45.7485,
    "lon": 4.8197,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "embed",
    "streamUrl": "https://www.youtube-nocookie.com/embed/pykdmsA53zc?autoplay=1&mute=1&playsinline=1",
    "siteUrl": "https://www.euronews.com/live",
    "headlines": [
      "EU SINGLE MARKET RATIFIES STRATEGIC MINERALS INFRASTRUCTURE",
      "EUROPEAN RESEARCH COUNCIL COMMISSIONS CRYOGENIC QUANTUM SENSOR",
      "RHINE NAVIGATION NETWORK PASSES FULL AUTOMATION CERTIFICATION"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "dw-de",
    "name": "DW News English",
    "network": "Deutsche Welle",
    "country": "Germany",
    "city": "Berlin",
    "lat": 52.52,
    "lon": 13.405,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    "siteUrl": "https://www.dw.com/en",
    "headlines": [
      "GERMAN INDUSTRIAL ENERGY CORRIDOR ACCELERATES SYNCHRONIZATION",
      "EU CYBERSECURITY DEFENSE AGENCY ACTIVATES CONTINENTAL MONITORING",
      "BERLIN TECHNOLOGY FORUM RATIFIES SUB-ZERO QUANTUM REVENUE SHARING"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "dw-global",
    "name": "DW Global English",
    "network": "Deutsche Welle World",
    "country": "Germany",
    "city": "Bonn",
    "lat": 50.7374,
    "lon": 7.0982,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://dwamdstream101.akamaized.net/hls/live/2015524/dwstream101/index.m3u8",
    "siteUrl": "https://www.dw.com/en/live-tv/s-100817",
    "headlines": [
      "BALTIC POWER GRID EXTENSION SYNCHRONIZES FULL CAPACITANCE",
      "CENTRAL EUROPEAN RAILWAYS COMMISSION REAL-TIME FREIGHT RADAR",
      "GERMAN FEDERAL RESEARCH DEPLOYS GEOTHERMAL SEISMIC ARRAY"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "bloomberg-eu",
    "name": "Bloomberg Europe",
    "network": "Bloomberg Media Global",
    "country": "Germany",
    "city": "Frankfurt (Main)",
    "lat": 50.1109,
    "lon": 8.6821,
    "intensity": "DEVELOPING",
    "color": "#00ff88",
    "streamType": "hls",
    "streamUrl": "https://bloomberg.com/media-manifest/streams/eu.m3u8",
    "siteUrl": "https://www.bloomberg.com/europe",
    "headlines": [
      "EUROPEAN CENTRAL BANK ASSESSES CROSS-BORDER DIGITAL CLEARING",
      "FRANKFURT EXCHANGES EXPAND REAL-TIME SETTLEMENT PROTOCOLS",
      "EUROZONE PMI INDUSTRIAL INDICATORS CONFIRM CAPITAL INFLOWS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "nhk-jp",
    "name": "NHK WORLD-JAPAN",
    "network": "NHK (Japan Broadcasting Corp)",
    "country": "Japan",
    "city": "Tokyo (Shibuya)",
    "lat": 35.6762,
    "lon": 139.6503,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://masterpl.hls.nhkworld.jp/hls/w/live/smarttv.m3u8",
    "siteUrl": "https://www3.nhk.or.jp/nhkworld/en/live",
    "headlines": [
      "JAPAN METEOROLOGICAL AGENCY ADVANCES PACIFIC OCEAN BUOY ARRAY",
      "TOKYO HIGH-TECH SUMMIT UNVEILS ROOM-TEMPERATURE SEMICONDUCTORS",
      "PACIFIC COMMERCE ACCORD RATIFIES QUANTUM-SAFE TELEMETRY"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "tbs-jp",
    "name": "TBS News World",
    "network": "TBS Television Global",
    "country": "Japan",
    "city": "Tokyo (Minato)",
    "lat": 35.672,
    "lon": 139.734,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "embed",
    "streamUrl": "https://www.youtube-nocookie.com/embed/coYw-eVU0Ks?autoplay=1&mute=1&playsinline=1",
    "siteUrl": "https://news.tbs.co.jp",
    "headlines": [
      "JAPAN AEROSPACE EXPEDITION COMMISSIONS NEXT-GEN SATELLITE RADAR",
      "SHINKANSEN SUPERCONDUCTING MAGLEV RUNS FULL-SPEED TEST",
      "PACIFIC RIM CLIMATE MONITORS RETURN COMPREHENSIVE TYPHOON ATLAS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "ntv-jp",
    "name": "Nippon TV News 24",
    "network": "Nippon Television Network",
    "country": "Japan",
    "city": "Tokyo (Shiodome)",
    "lat": 35.6628,
    "lon": 139.7594,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "embed",
    "streamUrl": "https://www.youtube-nocookie.com/embed/Wb1HhZ3yZc4?autoplay=1&mute=1&playsinline=1",
    "siteUrl": "https://news.ntv.co.jp",
    "headlines": [
      "TOKYO HARBOR INTEGRATES AUTOMATED HYDROGEN TUGBOAT NETWORK",
      "KYOTO UNIVERSITY ADVANCES HIGH-DENSITY SOLID-STATE CELLS",
      "MINISTRY OF ECONOMY ALLOCATES RESEARCH GRANTS TO SILICON ALLIANCE"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "ddindia-in",
    "name": "DD India World",
    "network": "Prasar Bharati National Broadcasting",
    "country": "India",
    "city": "New Delhi (Doordarshan)",
    "lat": 28.625,
    "lon": 77.228,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://d2gvyg6lvauoko.cloudfront.net/230226/ddindia/chunks.m3u8",
    "siteUrl": "https://ddnews.gov.in",
    "headlines": [
      "ISRO COMPLETES PREPARATION OF SPACE SCIENCE OBSERVATORY MISSION",
      "INDIAN METEOROLOGICAL RADAR TRACKS MONSOON CONVERGENCE CORRIDORS",
      "HIGH-SPEED RAILWAY VIADUCT TESTS COMPLETED ACROSS WESTERN CORRIDOR"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "indiatoday-in",
    "name": "India Today Live",
    "network": "India Today Group Global",
    "country": "India",
    "city": "New Delhi (Film City)",
    "lat": 28.5355,
    "lon": 77.391,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://indiatodaylive.akamaized.net/hls/live/2014320/indiatoday/indiatodaylive/playlist.m3u8",
    "siteUrl": "https://www.indiatoday.in/livetv",
    "headlines": [
      "MINISTRY OF SCIENCE AND TECHNOLOGY RELEASES CLEAN ENERGY BLUEPRINT",
      "NATIONAL AIRPORT EXPANSION INTEGRATES DIGITALLY-GUIDED LOGISTICS",
      "INDO-PACIFIC MARITIME TASK FORCE MONITORS SEA LANES"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "ndtvprofit-in",
    "name": "NDTV Profit English",
    "network": "New Delhi Television Network",
    "country": "India",
    "city": "New Delhi (Archana)",
    "lat": 28.6139,
    "lon": 77.209,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://ndtvprofit.akamaized.net/hls/live/2107404/ndtvprofit/chunklist_5.m3u8",
    "siteUrl": "https://www.ndtvprofit.com",
    "headlines": [
      "BOMBAY STOCK EXCHANGE REPORTS RESILIENT LIQUIDITY INFLOWS",
      "DIGITAL PAYMENTS REVENUE RAILS EXPAND REGIONAL REACH",
      "NATIONAL SEMICONDUCTOR INITIATIVE ADVANCES PILOT FABRICATION"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "aljazeera-qa",
    "name": "Al Jazeera English",
    "network": "Al Jazeera Media Network",
    "country": "Qatar",
    "city": "Doha (TV Roundabout)",
    "lat": 25.2854,
    "lon": 51.531,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8",
    "siteUrl": "https://www.aljazeera.com/live",
    "headlines": [
      "RED SEA MARITIME SECURITY TALKS ADVANCE IN DOHA",
      "DIPLOMATIC ENVOYS CONVENE ON REGIONAL STABILITY INITIATIVES",
      "GULF MARITIME INFRASTRUCTURE SECURES MULTILATERAL AGREEMENT"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "alaraby-qa",
    "name": "Al Araby News Network",
    "network": "Fadaat Media Group",
    "country": "Qatar",
    "city": "Lusail",
    "lat": 25.42,
    "lon": 51.49,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "embed",
    "streamUrl": "https://www.youtube-nocookie.com/embed/XqZsoesa55w?autoplay=1&mute=1&playsinline=1",
    "siteUrl": "https://www.alaraby.com",
    "headlines": [
      "LUSAIL TECH FORUM DISCUSSES ARAB WORLD DIGITIZATION INITIATIVE",
      "ARABIAN PENINSULA SATELLITE COMMUNICATIONS NETWORK LAUNCHED",
      "MIDDLE EAST PORTS EXPAND REAL-TIME CONTAINER TRACKING PROTOCOLS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "cna-sg",
    "name": "CNA Live Asia",
    "network": "Mediacorp Singapore",
    "country": "Singapore",
    "city": "Singapore (One-North)",
    "lat": 1.3,
    "lon": 103.788,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index.m3u8",
    "siteUrl": "https://www.channelnewsasia.com/watch-cna-live",
    "headlines": [
      "SINGAPORE FINANCIAL AUTHORITY EXPANDS GREEN BOND TAXONOMY",
      "STRAITS OF MALACCA DEPLOYS REAL-TIME VESSEL SATELLITE RADAR",
      "ASEAN ECONOMIC MINISTERS SIGN DIGITAL ECONOMY FRAMEWORK"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "cna-originals",
    "name": "CNA Documentaries",
    "network": "Mediacorp International",
    "country": "Singapore",
    "city": "Singapore (Caldecott)",
    "lat": 1.334,
    "lon": 103.84,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://amg01082-cna-amg01082c1-vidaa-gb-7580.playouts.now.amagi.tv/playlist.m3u8",
    "siteUrl": "https://www.channelnewsasia.com",
    "headlines": [
      "SPECIAL INVESTIGATION: PACIFIC SUBSEA CABLE TERMINATION EXPANSION",
      "INSIDE ASIA: TRANSIT RESILIENCE AND ENERGY HUBS ACROSS ASEAN",
      "MARITIME INNOVATION: ZERO-EMISSION TUGS COMMISSIONED AT JURONG"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "bloomberg-asia",
    "name": "Bloomberg Asia",
    "network": "Bloomberg Media Global",
    "country": "Singapore",
    "city": "Singapore (Marina Bay)",
    "lat": 1.28,
    "lon": 103.85,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://bloomberg.com/media-manifest/streams/asia.m3u8",
    "siteUrl": "https://www.bloomberg.com/asia",
    "headlines": [
      "ASIAN CURRENCY STABILITY MONITORED AMID GLOBAL COMMODITY SHIFTS",
      "SINGAPORE COMMODITY TRADING CORRIDOR MARKS RECORD VOLUME",
      "SOUTHEAST ASIA DATA CENTERS COMPLETE WATER-COOLED REVIEWS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "skynews-au",
    "name": "Sky News Australia",
    "network": "Australian News Channel",
    "country": "Australia",
    "city": "Sydney (Macquarie Park)",
    "lat": -33.7788,
    "lon": 151.127,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8",
    "siteUrl": "https://www.skynews.com.au",
    "headlines": [
      "COMMONWEALTH PARLIAMENT ADVANCES CRITICAL MINERALS INFRASTRUCTURE",
      "BUREAU OF METEOROLOGY REPORTS SOUTHERN OCEAN RIDGE SATELLITE DATA",
      "TRANS-TASMAN MARITIME SECURITY COUNCIL RATIFIES DIGITAL CORRIDOR"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "skynews-extra",
    "name": "Sky News Extra Live",
    "network": "Australian News Channel Extra",
    "country": "Australia",
    "city": "Melbourne (Southbank)",
    "lat": -37.8228,
    "lon": 144.96,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://skynewsau-live.akamaized.net/hls/live/2002690/skynewsau-extra2/master.m3u8",
    "siteUrl": "https://www.skynews.com.au/extra",
    "headlines": [
      "SENATE COMMITTEE REVIEWS TRANS-CONTINENTAL ENERGY TRANSMISSION",
      "AUSTRALIAN NATIONAL GRID ACHIEVES CLEAN GENERATION BENCHMARK",
      "SYDNEY HARBOUR UNDERSEA CABLE INFRASTRUCTURE BECOMES FULLY OPERATIONAL"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "bloomberg-aus",
    "name": "Bloomberg Australia",
    "network": "Bloomberg Media Global",
    "country": "Australia",
    "city": "Sydney (Martin Place)",
    "lat": -33.8688,
    "lon": 151.2093,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://bloomberg.com/media-manifest/streams/aus.m3u8",
    "siteUrl": "https://www.bloomberg.com",
    "headlines": [
      "RESERVE BANK MONITORS INDO-PACIFIC TRADE SETTLEMENT INFRASTRUCTURE",
      "MINING CONSORTIUM EXPANDS AUTOMATED SOLAR TRANSPORT FLEETS",
      "AUSTRALASIAN FINANCIAL EXCHANGES REPORT RECORD SUSTAINABILITY INFLOWS"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "cbc-ca",
    "name": "CBC News Network",
    "network": "Canadian Broadcasting Corp",
    "country": "Canada",
    "city": "Toronto (Front Street)",
    "lat": 43.644,
    "lon": -79.387,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://d2ny9lo79ujali.cloudfront.net/CBC_News_International.m3u8",
    "siteUrl": "https://www.cbc.ca/news",
    "headlines": [
      "CANADIAN ARCTIC SURVEILLANCE RADAR EXPANSION COMPLETED",
      "BANK OF CANADA RELEASES MONETARY LIQUIDITY AND RESERVES AUDIT",
      "TRANS-CANADA QUANTUM COMPUTING BACKBONE COMPLETES ENCRYPTION TEST"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "global-ca",
    "name": "Global News Canada",
    "network": "Corus Entertainment",
    "country": "Canada",
    "city": "Ottawa (Parliament Hill)",
    "lat": 45.4215,
    "lon": -75.6972,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://live.corusdigitaldev.com/groupd/live/49a91e7f-1023-430f-8d66-561055f3d0f7/live.isml/.m3u8",
    "siteUrl": "https://globalnews.ca/live",
    "headlines": [
      "PARLIAMENT PASSES STRATEGIC CLEAN TECH TRADE ACCORD",
      "ST. LAWRENCE SEAWAY DEPLOYS REAL-TIME VESSEL DEPTH MONITORING",
      "HYDRO-QUEBEC ADVANCES HIGH-VOLTAGE POWER TRANSMISSION TO NEW ENGLAND"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "cbc-bc",
    "name": "CBC News British Columbia",
    "network": "CBC Vancouver Regional",
    "country": "Canada",
    "city": "Vancouver (Hamilton)",
    "lat": 49.2827,
    "lon": -123.1207,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://amagi-streams.akamaized.net/hls/live/2110960/cbcnewsbc/master.m3u8",
    "siteUrl": "https://www.cbc.ca/news/canada/british-columbia",
    "headlines": [
      "PORT OF VANCOUVER COMPLETES PACIFIC RAIL CORRIDOR EXPANSION",
      "WEST COAST WILDFIRE TELEMETRY NETWORK DEPLOYS SATELLITE SENSORS",
      "BRITISH COLUMBIA TIDAL POWER PILOT DELIVERS CONSTANT BASELOAD"
    ],
    "lastUpdated": "2026-09-09T17:35:50.827Z"
  },
  {
    "id": "ae-Alarabiyaae-0",
    "name": "Alarabiya",
    "network": "Alarabiya Broadcast Service",
    "country": "United Arab Emirates",
    "city": "Abu Dhabi",
    "lat": 24.4539,
    "lon": 54.3773,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8",
    "siteUrl": "https://www.alarabiya.net/",
    "headlines": [
      "UNITED ARAB EMIRATES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ABU DHABI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ae-Alarabiyaae-1",
    "name": "Alarabiya",
    "network": "Alarabiya Broadcast Service",
    "country": "United Arab Emirates",
    "city": "Abu Dhabi",
    "lat": 24.5039,
    "lon": 54.427299999999995,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://185.9.2.18/chid_146/index.m3u8",
    "siteUrl": "https://www.alarabiya.net/",
    "headlines": [
      "UNITED ARAB EMIRATES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ABU DHABI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ae-Alarabiyaae-2",
    "name": "Alarabiya",
    "network": "Alarabiya Broadcast Service",
    "country": "United Arab Emirates",
    "city": "Abu Dhabi",
    "lat": 24.553900000000002,
    "lon": 54.4773,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.alarabiya.net/alarabiapublish/alarabiya.smil/alarabiapublish/alarabiya_1080p/chunks.m3u8",
    "siteUrl": "https://www.alarabiya.net/",
    "headlines": [
      "UNITED ARAB EMIRATES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ABU DHABI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "af-TOLOnewsaf-0",
    "name": "TOLOnews",
    "network": "TOLOnews Broadcast Service",
    "country": "Afghanistan",
    "city": "Kabul",
    "lat": 34.5553,
    "lon": 69.2075,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://tgn.bozztv.com/eshgtv-dvrfl05/gin-tolonews/index.m3u8",
    "siteUrl": "https://www.tolonews.com/",
    "headlines": [
      "AFGHANISTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KABUL",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "al-CNAal-0",
    "name": "CNA",
    "network": "CNA Broadcast Service",
    "country": "Albania",
    "city": "Tirana",
    "lat": 41.3275,
    "lon": 19.8187,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live1.mediadesk.al/cnatvlive.m3u8",
    "siteUrl": "https://www.cna.al/",
    "headlines": [
      "ALBANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TIRANA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "al-CNAal-1",
    "name": "CNA",
    "network": "CNA Broadcast Service",
    "country": "Albania",
    "city": "Tirana",
    "lat": 41.3775,
    "lon": 19.8687,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://live1.mediadesk.al/cnatv.php",
    "siteUrl": "https://www.cna.al/",
    "headlines": [
      "ALBANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TIRANA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "al-CNAal-2",
    "name": "CNA",
    "network": "CNA Broadcast Service",
    "country": "Albania",
    "city": "Tirana",
    "lat": 41.4275,
    "lon": 19.9187,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://op-group1-swiftservehd-1.dens.tv/h/h29/index.m3u8",
    "siteUrl": "https://www.cna.al/",
    "headlines": [
      "ALBANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TIRANA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "am-FirstChannelNewsam-0",
    "name": "First Channel News",
    "network": "First Channel News Broadcast Service",
    "country": "Armenia",
    "city": "Yerevan",
    "lat": 40.1792,
    "lon": 44.4991,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://amtvusdvr.tulix.tv/am3abr/index.m3u8",
    "siteUrl": "https://www.1lurer.am/",
    "headlines": [
      "ARMENIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS YEREVAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "am-FirstChannelNewsam-1",
    "name": "First Channel News",
    "network": "First Channel News Broadcast Service",
    "country": "Armenia",
    "city": "Yerevan",
    "lat": 40.2292,
    "lon": 44.549099999999996,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://amtvusdvr.tulix.tv/am3abr/tracks-v1a1/mono.ts.m3u8",
    "siteUrl": "https://www.1lurer.am/",
    "headlines": [
      "ARMENIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS YEREVAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ar-247CanaldeNoticiasar-0",
    "name": "24/7 Canal de Noticias",
    "network": "24/7 Canal de Noticias Broadcast Service",
    "country": "Argentina",
    "city": "Buenos Aires",
    "lat": -34.6037,
    "lon": -58.3816,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://panel.host-live.com:19360/cn247tv/cn247tv.m3u8",
    "siteUrl": "https://cn247.tv/",
    "headlines": [
      "ARGENTINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUENOS AIRES",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ar-A24ar-1",
    "name": "A24",
    "network": "A24 Broadcast Service",
    "country": "Argentina",
    "city": "Buenos Aires",
    "lat": -34.553700000000006,
    "lon": -58.3316,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://g5.vxral-slo.transport.edge-access.net/a12/ngrp:a24-100056_all/playlist.m3u8?sense=true",
    "siteUrl": "https://www.a24.com/",
    "headlines": [
      "ARGENTINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUENOS AIRES",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ar-Canal26ar-2",
    "name": "Canal 26",
    "network": "Canal 26 Broadcast Service",
    "country": "Argentina",
    "city": "Buenos Aires",
    "lat": -34.5037,
    "lon": -58.2816,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://stream-gtlc.telecentro.net.ar/hls/canal26hls/main.m3u8",
    "siteUrl": "https://www.diario26.com/",
    "headlines": [
      "ARGENTINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUENOS AIRES",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "az-AnewZTVaz-0",
    "name": "AnewZ TV",
    "network": "AnewZ TV Broadcast Service",
    "country": "Azerbaijan",
    "city": "Baku",
    "lat": 40.4093,
    "lon": 49.8671,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://53be5ef2d13aa.streamlock.net/cubesanewz-secure/smil:cubesanewz-secure-web.smil/playlist.m3u8",
    "siteUrl": "https://anewz.tv/",
    "headlines": [
      "AZERBAIJAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BAKU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "az-APATvaz-1",
    "name": "APA Tv",
    "network": "APA Tv Broadcast Service",
    "country": "Azerbaijan",
    "city": "Baku",
    "lat": 40.4593,
    "lon": 49.9171,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://stream.apa.tv/apastream/index.m3u8",
    "siteUrl": "https://apa.tv/",
    "headlines": [
      "AZERBAIJAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BAKU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "az-BakuTVaz-2",
    "name": "Baku.TV",
    "network": "Baku.TV Broadcast Service",
    "country": "Azerbaijan",
    "city": "Baku",
    "lat": 40.5093,
    "lon": 49.9671,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://rtmp.baku.tv/hls/bakutv.m3u8",
    "siteUrl": "https://baku.tv/",
    "headlines": [
      "AZERBAIJAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BAKU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ba-NewsmaxBalkansba-0",
    "name": "Newsmax Balkans",
    "network": "Newsmax Balkans Broadcast Service",
    "country": "Bosnia and Herzegovina",
    "city": "Sarajevo",
    "lat": 43.8563,
    "lon": 18.4131,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://newsmaxadria.mts-si.tv/newsmaxadria/index.m3u8",
    "siteUrl": "https://newsmaxbalkans.com/",
    "headlines": [
      "BOSNIA AND HERZEGOVINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SARAJEVO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bd-DBCNewsbd-0",
    "name": "DBC News",
    "network": "DBC News Broadcast Service",
    "country": "Bangladesh",
    "city": "Dhaka",
    "lat": 23.8103,
    "lon": 90.4125,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://tvn3.chowdhury-shaheb.com/dbc/index.m3u8",
    "siteUrl": "https://dbcnews.tv/",
    "headlines": [
      "BANGLADESH NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DHAKA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bd-EkusheyTVbd-1",
    "name": "Ekushey TV",
    "network": "Ekushey TV Broadcast Service",
    "country": "Bangladesh",
    "city": "Dhaka",
    "lat": 23.860300000000002,
    "lon": 90.46249999999999,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://ekusheyserver.com/etvlivesn.m3u8",
    "siteUrl": "https://www.ekushey-tv.com/",
    "headlines": [
      "BANGLADESH NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DHAKA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bd-NANTVbd-2",
    "name": "NAN TV",
    "network": "NAN TV Broadcast Service",
    "country": "Bangladesh",
    "city": "Dhaka",
    "lat": 23.910300000000003,
    "lon": 90.51249999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/nantv.stream/live-orgin/nantv.stream/playlist.m3u8",
    "siteUrl": "https://www.google.com/search?q=NAN%20TV%20news",
    "headlines": [
      "BANGLADESH NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DHAKA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "be-HLNLivebe-0",
    "name": "HLN Live",
    "network": "HLN Live Broadcast Service",
    "country": "Belgium",
    "city": "Brussels",
    "lat": 50.8503,
    "lon": 4.3517,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://dpg-eventstreams.akamaized.net/hlnlivesrt-xmr/streamx/hlnlivesrt_720p.m3u8",
    "siteUrl": "https://www.hln.be/",
    "headlines": [
      "BELGIUM NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRUSSELS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "be-SterkTVbe-1",
    "name": "Sterk TV",
    "network": "Sterk TV Broadcast Service",
    "country": "Belgium",
    "city": "Brussels",
    "lat": 50.900299999999994,
    "lon": 4.4017,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://hlspackager.akamaized.net/live/DB/STERK_TV/HLS/STERK_TV.m3u8",
    "siteUrl": "https://sterktv1.net/",
    "headlines": [
      "BELGIUM NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRUSSELS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "be-SterkTVbe-2",
    "name": "Sterk TV",
    "network": "Sterk TV Broadcast Service",
    "country": "Belgium",
    "city": "Brussels",
    "lat": 50.9503,
    "lon": 4.4517,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://muzkurd.com/sterktv/sterk/playlist.m3u8",
    "siteUrl": "https://sterktv1.net/",
    "headlines": [
      "BELGIUM NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRUSSELS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bf-FilinfoTVbf-0",
    "name": "Filinfo TV",
    "network": "Filinfo TV Broadcast Service",
    "country": "Burkina Faso",
    "city": "Ouagadougou",
    "lat": 12.3714,
    "lon": -1.5197,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://d2iqjnqfr8pv3b.cloudfront.net/out/v1/d09d2fc718404cd8bccd3eba2444dd70/index.m3u8",
    "siteUrl": "https://filinfos.net/",
    "headlines": [
      "BURKINA FASO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS OUAGADOUGOU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bg-BulgariaOnAirbg-0",
    "name": "Bulgaria On Air",
    "network": "Bulgaria On Air Broadcast Service",
    "country": "Bulgaria",
    "city": "Sofia",
    "lat": 42.6977,
    "lon": 23.3219,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://213.91.179.28:8000/play/a05x",
    "siteUrl": "https://www.bgonair.bg/",
    "headlines": [
      "BULGARIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SOFIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bg-EuronewsBulgariabg-1",
    "name": "Euronews Bulgaria",
    "network": "Euronews Bulgaria Broadcast Service",
    "country": "Bulgaria",
    "city": "Sofia",
    "lat": 42.747699999999995,
    "lon": 23.3719,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://213.91.179.28:8000/play/a05e",
    "siteUrl": "https://euronewsbulgaria.com/",
    "headlines": [
      "BULGARIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SOFIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bg-NovaNewsbg-2",
    "name": "Nova News",
    "network": "Nova News Broadcast Service",
    "country": "Bulgaria",
    "city": "Sofia",
    "lat": 42.7977,
    "lon": 23.4219,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://213.91.179.28:8000/play/a063",
    "siteUrl": "https://nova.bg/novanews",
    "headlines": [
      "BULGARIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SOFIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bj-BeninWebTVbj-0",
    "name": "Benin Web TV",
    "network": "Benin Web TV Broadcast Service",
    "country": "Benin",
    "city": "Porto-Novo",
    "lat": 6.4969,
    "lon": 2.6289,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://stream.beninwebtv.bj/2/live/stream.m3u8",
    "siteUrl": "https://beninwebtv.com/",
    "headlines": [
      "BENIN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PORTO-NOVO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bj-HC2TVbj-1",
    "name": "HC2 TV",
    "network": "HC2 TV Broadcast Service",
    "country": "Benin",
    "city": "Porto-Novo",
    "lat": 6.5469,
    "lon": 2.6788999999999996,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://stream.hc2tv.bj/2/live/stream.m3u8",
    "siteUrl": "https://hc2tv.bj/",
    "headlines": [
      "BENIN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PORTO-NOVO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bj-ICONETVbj-2",
    "name": "ICONE TV",
    "network": "ICONE TV Broadcast Service",
    "country": "Benin",
    "city": "Porto-Novo",
    "lat": 6.5969,
    "lon": 2.7289,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://lecteur.iconetv.bj/hls/stream.m3u8",
    "siteUrl": "https://iconetv.bj/",
    "headlines": [
      "BENIN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PORTO-NOVO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bo-CEACOMTVbo-0",
    "name": "CEACOM TV",
    "network": "CEACOM TV Broadcast Service",
    "country": "Bolivia",
    "city": "La Paz",
    "lat": -16.4897,
    "lon": -68.1193,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://eu1.servers10.com:8081/ceacom/index.m3u8",
    "siteUrl": "https://www.ceacomtv.com",
    "headlines": [
      "BOLIVIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LA PAZ",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bo-Erbolbo-1",
    "name": "Erbol",
    "network": "Erbol Broadcast Service",
    "country": "Bolivia",
    "city": "La Paz",
    "lat": -16.4397,
    "lon": -68.0693,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://twitch-m3u8.bastypro112.workers.dev/erboldigital/index.m3u8",
    "siteUrl": "https://erbol.com.bo/",
    "headlines": [
      "BOLIVIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LA PAZ",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bo-UMSATVULPbo-2",
    "name": "UMSA TVU LP",
    "network": "UMSA TVU LP Broadcast Service",
    "country": "Bolivia",
    "city": "La Paz",
    "lat": -16.389699999999998,
    "lon": -68.0193,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://edge.enhdtv.com/8190/index.m3u8",
    "siteUrl": "https://tvu.umsa.bo/tvu-en-vivo-2-",
    "headlines": [
      "BOLIVIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LA PAZ",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "br-AgroMaisbr-0",
    "name": "AgroMais",
    "network": "AgroMais Broadcast Service",
    "country": "Brazil",
    "city": "Bras\xEDlia",
    "lat": -15.7975,
    "lon": -47.8919,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://45.162.64.114/AGROMAIS/index.m3u8",
    "siteUrl": "https://agromais.band.uol.com.br/",
    "headlines": [
      "BRAZIL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRAS\xCDLIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "br-AgroMaisbr-1",
    "name": "AgroMais",
    "network": "AgroMais Broadcast Service",
    "country": "Brazil",
    "city": "Bras\xEDlia",
    "lat": -15.747499999999999,
    "lon": -47.8419,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://45.177.114.115/agromais/index.m3u8",
    "siteUrl": "https://agromais.band.uol.com.br/",
    "headlines": [
      "BRAZIL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRAS\xCDLIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "br-AgroMaisbr-2",
    "name": "AgroMais",
    "network": "AgroMais Broadcast Service",
    "country": "Brazil",
    "city": "Bras\xEDlia",
    "lat": -15.6975,
    "lon": -47.7919,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://45.177.114.115/AGROMAIS_HD/index.m3u8",
    "siteUrl": "https://agromais.band.uol.com.br/",
    "headlines": [
      "BRAZIL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRAS\xCDLIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bs-GuardianTalkRadiobs-0",
    "name": "Guardian Talk Radio",
    "network": "Guardian Talk Radio Broadcast Service",
    "country": "Bahamas",
    "city": "Nassau",
    "lat": 25.0443,
    "lon": -77.3504,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cdn-edge1.streamcomedia.com/abr_tngr969fm/abr-tngr969fm_streams/playlist.m3u8",
    "siteUrl": "https://guardiantalkradio.com/",
    "headlines": [
      "BAHAMAS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS NASSAU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "by-Belarus24by-0",
    "name": "Belarus-24",
    "network": "Belarus-24 Broadcast Service",
    "country": "Belarus",
    "city": "Minsk",
    "lat": 53.9045,
    "lon": 27.5615,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://ngtrk.dc.beltelecom.by/ngtrk/smil:belarus24.smil/playlist.m3u8",
    "siteUrl": "https://belarus24.by/",
    "headlines": [
      "BELARUS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MINSK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "by-Belarus24by-1",
    "name": "Belarus-24",
    "network": "Belarus-24 Broadcast Service",
    "country": "Belarus",
    "city": "Minsk",
    "lat": 53.954499999999996,
    "lon": 27.6115,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://streaming.thestream.cyou/live/7003.m3u8",
    "siteUrl": "https://belarus24.by/",
    "headlines": [
      "BELARUS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MINSK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "by-Belarus24by-2",
    "name": "Belarus-24",
    "network": "Belarus-24 Broadcast Service",
    "country": "Belarus",
    "city": "Minsk",
    "lat": 54.0045,
    "lon": 27.6615,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://ott-7.sevstar.net/belarus24/index.m3u8",
    "siteUrl": "https://belarus24.by/",
    "headlines": [
      "BELARUS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MINSK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bz-CTV3bz-0",
    "name": "CTV3",
    "network": "CTV3 Broadcast Service",
    "country": "Belize",
    "city": "Belmopan",
    "lat": 17.251,
    "lon": -88.759,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://streamer2.nexgen.bz/03-CTVOW/index.m3u8",
    "siteUrl": "http://www.ctv3belizenews.com/",
    "headlines": [
      "BELIZE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BELMOPAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bz-LoveTelevisionbz-1",
    "name": "Love Television",
    "network": "Love Television Broadcast Service",
    "country": "Belize",
    "city": "Belmopan",
    "lat": 17.301000000000002,
    "lon": -88.709,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://streamer2.nexgen.bz/01-LOVE/index.m3u8",
    "siteUrl": "https://lovefm.com/",
    "headlines": [
      "BELIZE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BELMOPAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "bz-PGTVbz-2",
    "name": "PGTV",
    "network": "PGTV Broadcast Service",
    "country": "Belize",
    "city": "Belmopan",
    "lat": 17.351000000000003,
    "lon": -88.659,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://streamer2.nexgen.bz/16-PGTV/index.m3u8",
    "siteUrl": "https://pgtvbelize.com/",
    "headlines": [
      "BELIZE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BELMOPAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cd-BarakaTelevisioncd-0",
    "name": "Baraka Television",
    "network": "Baraka Television Broadcast Service",
    "country": "DR Congo",
    "city": "Kinshasa",
    "lat": -4.4419,
    "lon": 15.2663,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://stream.berosat.live:19360/baraka-hd/baraka-hd.m3u8",
    "siteUrl": "https://www.google.com/search?q=Baraka%20Television%20news",
    "headlines": [
      "DR CONGO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KINSHASA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cd-Kin24cd-1",
    "name": "Kin24",
    "network": "Kin24 Broadcast Service",
    "country": "DR Congo",
    "city": "Kinshasa",
    "lat": -4.391900000000001,
    "lon": 15.3163,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://51.254.199.122:8080/kin24/index.m3u8",
    "siteUrl": "https://www.google.com/search?q=Kin24%20news",
    "headlines": [
      "DR CONGO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KINSHASA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cd-LeMondeen24hcd-2",
    "name": "Le Monde en 24h",
    "network": "Le Monde en 24h Broadcast Service",
    "country": "DR Congo",
    "city": "Kinshasa",
    "lat": -4.341900000000001,
    "lon": 15.366299999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://stream.berosat.live/hls/monde24h-tv-index/monde24h-tv-index.m3u8",
    "siteUrl": "https://lemondeen24h.com/",
    "headlines": [
      "DR CONGO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KINSHASA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ch-LemanBleuch-0",
    "name": "Leman Bleu",
    "network": "Leman Bleu Broadcast Service",
    "country": "Switzerland",
    "city": "Bern",
    "lat": 46.948,
    "lon": 7.4474,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://livevideo.infomaniak.com/streaming/livecast/naxoo/playlist.m3u8",
    "siteUrl": "https://www.lemanbleu.ch/fr/Direct/Direct.html",
    "headlines": [
      "SWITZERLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BERN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ch-RTSInfoch-1",
    "name": "RTS Info",
    "network": "RTS Info Broadcast Service",
    "country": "Switzerland",
    "city": "Bern",
    "lat": 46.998,
    "lon": 7.4974,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://rtsinfo-d.akamaized.net/out/v1/2b7ae2e1ba3f43c6aba15bced153baf5/index.m3u8",
    "siteUrl": "https://www.rts.ch/",
    "headlines": [
      "SWITZERLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BERN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ci-7Infoci-0",
    "name": "7 Info",
    "network": "7 Info Broadcast Service",
    "country": "Ivory Coast",
    "city": "Yamoussoukro",
    "lat": 6.8276,
    "lon": -5.2893,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://video1.getstreamhosting.com:1936/8042/8042/playlist.m3u8",
    "siteUrl": "https://www.7info.ci/",
    "headlines": [
      "IVORY COAST NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS YAMOUSSOUKRO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cl-24Horascl-0",
    "name": "24 Horas",
    "network": "24 Horas Broadcast Service",
    "country": "Chile",
    "city": "Santiago",
    "lat": -33.4489,
    "lon": -70.6693,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://cdn1tlinkgo.tlink.cl/24horashd/mono.m3u8",
    "siteUrl": "https://www.24horas.cl/",
    "headlines": [
      "CHILE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANTIAGO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cl-ADNTVcl-1",
    "name": "ADN TV",
    "network": "ADN TV Broadcast Service",
    "country": "Chile",
    "city": "Santiago",
    "lat": -33.398900000000005,
    "lon": -70.61930000000001,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://redirector.rudo.video/hls-video/931b584451fa6dd1313ee66efbfd5802e3f3bcea/adntv/adntv.smil/playlist.m3u8",
    "siteUrl": "https://www.adnradio.cl/",
    "headlines": [
      "CHILE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANTIAGO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cl-AtacamaNoticiascl-2",
    "name": "Atacama Noticias",
    "network": "Atacama Noticias Broadcast Service",
    "country": "Chile",
    "city": "Santiago",
    "lat": -33.3489,
    "lon": -70.56930000000001,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://v2.tustreaming.cl/atacamanoticias/index.m3u8",
    "siteUrl": "https://www.atacamanoticias.cl/",
    "headlines": [
      "CHILE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANTIAGO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cm-Afrique54TVcm-0",
    "name": "Afrique54 TV",
    "network": "Afrique54 TV Broadcast Service",
    "country": "Cameroon",
    "city": "Yaound\xE9",
    "lat": 3.848,
    "lon": 11.5021,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://video1.getstreamhosting.com:1936/8318/8318/playlist.m3u8",
    "siteUrl": "https://afrique54.net/",
    "headlines": [
      "CAMEROON NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS YAOUND\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cm-AfriqueMediacm-1",
    "name": "Afrique Media",
    "network": "Afrique Media Broadcast Service",
    "country": "Cameroon",
    "city": "Yaound\xE9",
    "lat": 3.8979999999999997,
    "lon": 11.552100000000001,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cloud.odysee.live/content/fe06b3cdc9412e359368b2455b6ea5e93856e382/master.m3u8",
    "siteUrl": "https://www.afriquemedia.tv/live",
    "headlines": [
      "CAMEROON NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS YAOUND\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cm-CRTVNewscm-2",
    "name": "CRTV News",
    "network": "CRTV News Broadcast Service",
    "country": "Cameroon",
    "city": "Yaound\xE9",
    "lat": 3.948,
    "lon": 11.6021,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live1.acangroup.org:1929/publiclive/crtv_news/playlist.m3u8",
    "siteUrl": "https://www.crtv.cm/",
    "headlines": [
      "CAMEROON NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS YAOUND\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cn-AnshunComprehensiveNewsC-0",
    "name": "Anshun Comprehensive News Channel",
    "network": "Anshun Comprehensive News Channel Broadcast Service",
    "country": "China",
    "city": "Beijing",
    "lat": 39.9042,
    "lon": 116.4074,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://hplayer1.juyun.tv/camera/154379194.m3u8",
    "siteUrl": "http://www.gzastv.com/live/live.shtml",
    "headlines": [
      "CHINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BEIJING",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cn-CCTV13cn-1",
    "name": "CCTV-13",
    "network": "CCTV-13 Broadcast Service",
    "country": "China",
    "city": "Beijing",
    "lat": 39.9542,
    "lon": 116.45739999999999,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://go.bkpcp.top/mg/cctv13",
    "siteUrl": "http://tv.cctv.com/cctv13/",
    "headlines": [
      "CHINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BEIJING",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cn-CCTV13cn-2",
    "name": "CCTV-13",
    "network": "CCTV-13 Broadcast Service",
    "country": "China",
    "city": "Beijing",
    "lat": 40.004200000000004,
    "lon": 116.50739999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://74.91.26.218:82/live/cctv13hd.m3u8",
    "siteUrl": "http://tv.cctv.com/cctv13/",
    "headlines": [
      "CHINA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BEIJING",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "co-CanalPyCco-0",
    "name": "Canal PyC",
    "network": "Canal PyC Broadcast Service",
    "country": "Colombia",
    "city": "Bogot\xE1",
    "lat": 4.711,
    "lon": -74.0721,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live20.bozztv.com/akamaissh101/ssh101/pyctelevision/playlist.m3u8",
    "siteUrl": "https://canalpyc.com/",
    "headlines": [
      "COLOMBIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BOGOT\xC1",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "co-Momento24co-1",
    "name": "Momento24",
    "network": "Momento24 Broadcast Service",
    "country": "Colombia",
    "city": "Bogot\xE1",
    "lat": 4.761,
    "lon": -74.02210000000001,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://backupmaxmedia.hvmultiplay.com/hls/stream2/momento24.m3u8",
    "siteUrl": "https://www.hvmultiplay.co/phone/momento24.html",
    "headlines": [
      "COLOMBIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BOGOT\xC1",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "co-NoticiasRCNco-2",
    "name": "Noticias RCN",
    "network": "Noticias RCN Broadcast Service",
    "country": "Colombia",
    "city": "Bogot\xE1",
    "lat": 4.811,
    "lon": -73.97210000000001,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://jmp2.uk/plu-67d9b0ebc290c9499046e88f.m3u8",
    "siteUrl": "https://www.noticiasrcn.com/",
    "headlines": [
      "COLOMBIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BOGOT\xC1",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cr-NorteInformativoTVcr-0",
    "name": "Norte Informativo TV",
    "network": "Norte Informativo TV Broadcast Service",
    "country": "Costa Rica",
    "city": "San Jos\xE9",
    "lat": 9.9281,
    "lon": -84.0907,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://videohd.live:19360/8076/8076.m3u8",
    "siteUrl": "https://norteinformativo.com/",
    "headlines": [
      "COSTA RICA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SAN JOS\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cu-PrensaLatinaTVcu-0",
    "name": "Prensa Latina TV",
    "network": "Prensa Latina TV Broadcast Service",
    "country": "Cuba",
    "city": "Havana",
    "lat": 23.1136,
    "lon": -82.3666,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://eu1.servers10.com:8081/8192/index.m3u8",
    "siteUrl": "https://www.prensa-latina.cu/",
    "headlines": [
      "CUBA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HAVANA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cy-VouliTVcy-0",
    "name": "Vouli TV",
    "network": "Vouli TV Broadcast Service",
    "country": "Cyprus",
    "city": "Nicosia",
    "lat": 35.1856,
    "lon": 33.3823,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://dev.aftermind.xyz/edge-hls/unitrust/voulitv/index.m3u8?token=8TXWzhY3h6jrzqEqx",
    "siteUrl": "https://vouli.tv/",
    "headlines": [
      "CYPRUS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS NICOSIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cz-CNNPrimaNewscz-0",
    "name": "CNN Prima News",
    "network": "CNN Prima News Broadcast Service",
    "country": "Czech Republic",
    "city": "Prague",
    "lat": 50.0755,
    "lon": 14.4378,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://88.212.15.19/live/test_cnn_pirma_news/playlist.m3u8",
    "siteUrl": "https://cnn.iprima.cz/",
    "headlines": [
      "CZECH REPUBLIC NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRAGUE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cz-CT24cz-1",
    "name": "CT24",
    "network": "CT24 Broadcast Service",
    "country": "Czech Republic",
    "city": "Prague",
    "lat": 50.125499999999995,
    "lon": 14.4878,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://88.212.15.19/live/test_ct24_hevc/playlist.m3u8",
    "siteUrl": "https://ct24.ceskatelevize.cz/",
    "headlines": [
      "CZECH REPUBLIC NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRAGUE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "cz-CT24cz-2",
    "name": "CT24",
    "network": "CT24 Broadcast Service",
    "country": "Czech Republic",
    "city": "Prague",
    "lat": 50.1755,
    "lon": 14.537799999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://dash2.antik.sk/live/ct24_avc_25p/playlist.m3u8",
    "siteUrl": "https://ct24.ceskatelevize.cz/",
    "headlines": [
      "CZECH REPUBLIC NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRAGUE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "do-AcentoTVdo-0",
    "name": "Acento TV",
    "network": "Acento TV Broadcast Service",
    "country": "Dominican Republic",
    "city": "Santo Domingo",
    "lat": 18.4861,
    "lon": -69.9312,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://acentotv01.streamprolive.com/hls/live.m3u8",
    "siteUrl": "https://acentotv.do/",
    "headlines": [
      "DOMINICAN REPUBLIC NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANTO DOMINGO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "do-Carivisiondo-1",
    "name": "Carivision",
    "network": "Carivision Broadcast Service",
    "country": "Dominican Republic",
    "city": "Santo Domingo",
    "lat": 18.5361,
    "lon": -69.8812,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://ss2.tvrdomi.com:1936/carivision/carivision/playlist.m3u8",
    "siteUrl": "http://carivision.online/",
    "headlines": [
      "DOMINICAN REPUBLIC NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANTO DOMINGO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "do-CitricoTVdo-2",
    "name": "Citrico TV",
    "network": "Citrico TV Broadcast Service",
    "country": "Dominican Republic",
    "city": "Santo Domingo",
    "lat": 18.586100000000002,
    "lon": -69.83120000000001,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://edge.essastream.com/citricotv/playlist.m3u8",
    "siteUrl": "https://citricotv.com/",
    "headlines": [
      "DOMINICAN REPUBLIC NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANTO DOMINGO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "dz-AL24Newsdz-0",
    "name": "AL24 News",
    "network": "AL24 News Broadcast Service",
    "country": "Algeria",
    "city": "Algiers",
    "lat": 36.7538,
    "lon": 3.0588,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/corp/66_al24_u4yga6h_240p/chunks.m3u8",
    "siteUrl": "https://al24news.com/",
    "headlines": [
      "ALGERIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ALGIERS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ec-EcotelTVec-0",
    "name": "Ecotel TV",
    "network": "Ecotel TV Broadcast Service",
    "country": "Ecuador",
    "city": "Quito",
    "lat": -0.1807,
    "lon": -78.4678,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://ecoteltv.streamseguro.com:5443/LiveApp/streams/streaming.m3u8",
    "siteUrl": "https://www.ecotel.tv/",
    "headlines": [
      "ECUADOR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS QUITO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ec-MarioPintoTVec-1",
    "name": "Mario Pinto TV",
    "network": "Mario Pinto TV Broadcast Service",
    "country": "Ecuador",
    "city": "Quito",
    "lat": -0.13069999999999998,
    "lon": -78.4178,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://eu1.servers10.com:8081/8028/index.m3u8",
    "siteUrl": "https://mpnoticias.com.ec/",
    "headlines": [
      "ECUADOR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS QUITO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ec-RTUec-2",
    "name": "RTU",
    "network": "RTU Broadcast Service",
    "country": "Ecuador",
    "city": "Quito",
    "lat": -0.0807,
    "lon": -78.3678,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://video1.makrodigital.com/rtu/rtu/chunks.m3u8?nimblesessionid=",
    "siteUrl": "https://canalrtu.tv/",
    "headlines": [
      "ECUADOR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS QUITO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "eg-AlGhadTVeg-0",
    "name": "Al Ghad TV",
    "network": "Al Ghad TV Broadcast Service",
    "country": "Egypt",
    "city": "Cairo",
    "lat": 30.0444,
    "lon": 31.2357,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://eazyvwqssi.erbvr.com/alghadtv/alghadtv.m3u8",
    "siteUrl": "https://www.alghad.tv/",
    "headlines": [
      "EGYPT NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CAIRO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "es-3CatExclusiu1es-0",
    "name": "3Cat Exclusiu 1",
    "network": "3Cat Exclusiu 1 Broadcast Service",
    "country": "Spain",
    "city": "Madrid",
    "lat": 40.4168,
    "lon": -3.7038,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://directes-tv-cat.3catdirectes.cat/live-content/oca1-hls/master.m3u8",
    "siteUrl": "https://www.3cat.cat/3cat/directes/oca1/",
    "headlines": [
      "SPAIN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MADRID",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "es-3CatExclusiu1es-1",
    "name": "3Cat Exclusiu 1",
    "network": "3Cat Exclusiu 1 Broadcast Service",
    "country": "Spain",
    "city": "Madrid",
    "lat": 40.4668,
    "lon": -3.6538000000000004,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://directes-tv-cat.3catdirectes.cat/live-origin/oca1-hls/master.m3u8",
    "siteUrl": "https://www.3cat.cat/3cat/directes/oca1/",
    "headlines": [
      "SPAIN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MADRID",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "es-3CatExclusiu2es-2",
    "name": "3Cat Exclusiu 2",
    "network": "3Cat Exclusiu 2 Broadcast Service",
    "country": "Spain",
    "city": "Madrid",
    "lat": 40.5168,
    "lon": -3.6038,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://directes-tv-cat.3catdirectes.cat/live-content/oca2-hls/master.m3u8",
    "siteUrl": "https://www.3cat.cat/3cat/directes/oca2/",
    "headlines": [
      "SPAIN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MADRID",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "et-MerejaTVet-0",
    "name": "Mereja TV",
    "network": "Mereja TV Broadcast Service",
    "country": "Ethiopia",
    "city": "Addis Ababa",
    "lat": 9.03,
    "lon": 38.74,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://rumble.com/live-hls-dvr/4c14o3/playlist.m3u8",
    "siteUrl": "https://mereja.com/main/",
    "headlines": [
      "ETHIOPIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ADDIS ABABA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "et-MerejaTVet-1",
    "name": "Mereja TV",
    "network": "Mereja TV Broadcast Service",
    "country": "Ethiopia",
    "city": "Addis Ababa",
    "lat": 9.08,
    "lon": 38.79,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://g4wlkqp8l23a-hls-live.5centscdn.com/MerejaTV/955ad3298db330b5ee880c2c9e6f23a0.sdp/playlist.m3u8",
    "siteUrl": "https://mereja.com/main/",
    "headlines": [
      "ETHIOPIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ADDIS ABABA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "fi-MTVUutisetfi-0",
    "name": "MTV Uutiset",
    "network": "MTV Uutiset Broadcast Service",
    "country": "Finland",
    "city": "Helsinki",
    "lat": 60.1699,
    "lon": 24.9384,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.streaming.a2d.tv/asset/20025962.isml/.m3u8",
    "siteUrl": "https://www.mtvuutiset.fi/",
    "headlines": [
      "FINLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HELSINKI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "fi-NopolaNewsfi-1",
    "name": "Nopola News",
    "network": "Nopola News Broadcast Service",
    "country": "Finland",
    "city": "Helsinki",
    "lat": 60.219899999999996,
    "lon": 24.988400000000002,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://virta2.nopolanews.fi:8443/live/smil:Stream1.smil/playlist.m3u8",
    "siteUrl": "https://www.nopolanews.fi/",
    "headlines": [
      "FINLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HELSINKI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ge-EuronewsGeorgiage-0",
    "name": "Euronews Georgia",
    "network": "Euronews Georgia Broadcast Service",
    "country": "Georgia",
    "city": "Tbilisi",
    "lat": 41.7151,
    "lon": 44.8271,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://nue01-edge01.itdc.ge/euronewsgeorgia/mpegts",
    "siteUrl": "https://euronewsgeorgia.com/",
    "headlines": [
      "GEORGIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TBILISI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ge-Formulage-1",
    "name": "Formula",
    "network": "Formula Broadcast Service",
    "country": "Georgia",
    "city": "Tbilisi",
    "lat": 41.7651,
    "lon": 44.8771,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://c4635.cdn.xsg.ge/c4635/TVFormula/index.m3u8",
    "siteUrl": "https://formula.ge/",
    "headlines": [
      "GEORGIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TBILISI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ge-Formulage-2",
    "name": "Formula",
    "network": "Formula Broadcast Service",
    "country": "Georgia",
    "city": "Tbilisi",
    "lat": 41.8151,
    "lon": 44.9271,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://tv.cdn.xsg.ge/c4635/TVFormula/playlist.m3u8",
    "siteUrl": "https://formula.ge/",
    "headlines": [
      "GEORGIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TBILISI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gn-AfrikInfoTVgn-0",
    "name": "Afrik Info TV",
    "network": "Afrik Info TV Broadcast Service",
    "country": "Guinea",
    "city": "Conakry",
    "lat": 9.6412,
    "lon": -13.5784,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://kali.vdopanel.com:3119/hybrid/play.m3u8",
    "siteUrl": "https://afrikinfomedias.com/tv/",
    "headlines": [
      "GUINEA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CONAKRY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gn-EspaceTVgn-1",
    "name": "Espace TV",
    "network": "Espace TV Broadcast Service",
    "country": "Guinea",
    "city": "Conakry",
    "lat": 9.6912,
    "lon": -13.5284,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://edge11.vedge.infomaniak.com/livecast/ik:espacetv/manifest.m3u8",
    "siteUrl": "https://www.espacetvguinee.info/",
    "headlines": [
      "GUINEA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CONAKRY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gr-AlertTVgr-0",
    "name": "Alert TV",
    "network": "Alert TV Broadcast Service",
    "country": "Greece",
    "city": "Athens",
    "lat": 37.9838,
    "lon": 23.7275,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://itv.streams.ovh/ALEERT/ALEERT/playlist.m3u8",
    "siteUrl": "https://www.alerttv.com.gr/epikoinonia/",
    "headlines": [
      "GREECE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ATHENS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gr-AstraTVgr-1",
    "name": "Astra TV",
    "network": "Astra TV Broadcast Service",
    "country": "Greece",
    "city": "Athens",
    "lat": 38.0338,
    "lon": 23.7775,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://server.gointernet.gr/live/livestream.m3u8",
    "siteUrl": "https://www.astratv.gr/live-streaming/",
    "headlines": [
      "GREECE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ATHENS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gr-CorfuChannelgr-2",
    "name": "Corfu Channel",
    "network": "Corfu Channel Broadcast Service",
    "country": "Greece",
    "city": "Athens",
    "lat": 38.083800000000004,
    "lon": 23.8275,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://itv.streams.ovh:1936/corfuchannel/corfuchannel/playlist.m3u8",
    "siteUrl": "https://corfuchannel.com/",
    "headlines": [
      "GREECE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ATHENS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gt-Guatevisiongt-0",
    "name": "Guatevision",
    "network": "Guatevision Broadcast Service",
    "country": "Guatemala",
    "city": "Guatemala City",
    "lat": 14.6349,
    "lon": -90.5069,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://mdstrm.com/live-stream-playlist/69f8df22a762c9b1ab3eabca.m3u8",
    "siteUrl": "https://www.guatevision.com/",
    "headlines": [
      "GUATEMALA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS GUATEMALA CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gt-Guatevisiongt-1",
    "name": "Guatevision",
    "network": "Guatevision Broadcast Service",
    "country": "Guatemala",
    "city": "Guatemala City",
    "lat": 14.6849,
    "lon": -90.4569,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://bantel-cdn1.iptvperu.tv:1935/btnscrtn/Guatevision.stream/playlist.m3u8",
    "siteUrl": "https://www.guatevision.com/",
    "headlines": [
      "GUATEMALA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS GUATEMALA CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "gt-TN23gt-2",
    "name": "TN23",
    "network": "TN23 Broadcast Service",
    "country": "Guatemala",
    "city": "Guatemala City",
    "lat": 14.7349,
    "lon": -90.40690000000001,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://d3qt8k30mpy8xx.cloudfront.net/ts:abr.m3u8",
    "siteUrl": "https://www.tn23.tv/",
    "headlines": [
      "GUATEMALA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS GUATEMALA CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hk-NewsWorldhk-0",
    "name": "NewsWorld",
    "network": "NewsWorld Broadcast Service",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "lat": 22.3193,
    "lon": 114.1694,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://amg01076-lightning-amg01076c5-rakuten-us-1788.playouts.now.amagi.tv/playlist/amg01076-lightning-newsworld-rakutenus/playlist.m3u8",
    "siteUrl": "https://www.lightninginternational.net/channels",
    "headlines": [
      "HONG KONG NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HONG KONG",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hk-PhoenixInfoNewsChannelhk-1",
    "name": "Phoenix InfoNews Channel",
    "network": "Phoenix InfoNews Channel Broadcast Service",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "lat": 22.3693,
    "lon": 114.2194,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://223.110.245.167/ott.js.chinamobile.com/PLTV/3/224/3221226923/index.m3u8",
    "siteUrl": "http://phtv.ifeng.com/phoenixinfonews/",
    "headlines": [
      "HONG KONG NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HONG KONG",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hk-PhoenixInfoNewsChannelhk-2",
    "name": "Phoenix InfoNews Channel",
    "network": "Phoenix InfoNews Channel Broadcast Service",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "lat": 22.4193,
    "lon": 114.26939999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://125.210.152.18:9090/live/FHZX_1200.m3u8",
    "siteUrl": "http://phtv.ifeng.com/phoenixinfonews/",
    "headlines": [
      "HONG KONG NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HONG KONG",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hn-BuendiaTVhn-0",
    "name": "Buendia TV",
    "network": "Buendia TV Broadcast Service",
    "country": "Honduras",
    "city": "Tegucigalpa",
    "lat": 14.0723,
    "lon": -87.1921,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://servilive.com:3508/stream/play.m3u8",
    "siteUrl": "https://www.btvhn.com",
    "headlines": [
      "HONDURAS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TEGUCIGALPA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hn-CholusatSur36hn-1",
    "name": "Cholusat Sur 36",
    "network": "Cholusat Sur 36 Broadcast Service",
    "country": "Honduras",
    "city": "Tegucigalpa",
    "lat": 14.122300000000001,
    "lon": -87.1421,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://audiotvserver.net:1935/livemedia/cholusat/playlist.m3u8",
    "siteUrl": "http://cholusatsur.com/",
    "headlines": [
      "HONDURAS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TEGUCIGALPA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hn-HCHhn-2",
    "name": "HCH",
    "network": "HCH Broadcast Service",
    "country": "Honduras",
    "city": "Tegucigalpa",
    "lat": 14.1723,
    "lon": -87.0921,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.streamhch.com/live/streams/hch1.m3u8",
    "siteUrl": "https://hch.tv/",
    "headlines": [
      "HONDURAS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TEGUCIGALPA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hr-HRT4hr-0",
    "name": "HRT 4",
    "network": "HRT 4 Broadcast Service",
    "country": "Croatia",
    "city": "Zagreb",
    "lat": 45.815,
    "lon": 15.9819,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://bpcdnmanprod.nexttv.ht.hr/bpk-tv/HRT4/default/index.mpd",
    "siteUrl": "https://www.hrt.hr/",
    "headlines": [
      "CROATIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ZAGREB",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hr-OTVhr-1",
    "name": "OTV",
    "network": "OTV Broadcast Service",
    "country": "Croatia",
    "city": "Zagreb",
    "lat": 45.864999999999995,
    "lon": 16.0319,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://stream.agatin.hr:3559/live/otvlive.m3u8",
    "siteUrl": "https://www.otv.hr/",
    "headlines": [
      "CROATIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ZAGREB",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hr-TVJadranhr-2",
    "name": "TV Jadran",
    "network": "TV Jadran Broadcast Service",
    "country": "Croatia",
    "city": "Zagreb",
    "lat": 45.915,
    "lon": 16.0819,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://tvjadran.stream.agatin.hr:3412/live/tvjadranlive.m3u8",
    "siteUrl": "https://tvjadran.hr/",
    "headlines": [
      "CROATIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ZAGREB",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ht-HaitiNewsChannelht-0",
    "name": "Haiti News Channel",
    "network": "Haiti News Channel Broadcast Service",
    "country": "Haiti",
    "city": "Port-au-Prince",
    "lat": 18.5944,
    "lon": -72.3074,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cdn.haititivi.com/website/haitinews/index.m3u8",
    "siteUrl": "https://haitinewstv.com/",
    "headlines": [
      "HAITI NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PORT-AU-PRINCE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ht-HaitiNewsChannelht-1",
    "name": "Haiti News Channel",
    "network": "Haiti News Channel Broadcast Service",
    "country": "Haiti",
    "city": "Port-au-Prince",
    "lat": 18.6444,
    "lon": -72.2574,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://haititivi.com/website/haitinews/index.m3u8",
    "siteUrl": "https://haitinewstv.com/",
    "headlines": [
      "HAITI NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PORT-AU-PRINCE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "hu-M1hu-0",
    "name": "M1",
    "network": "M1 Broadcast Service",
    "country": "Hungary",
    "city": "Budapest",
    "lat": 47.4979,
    "lon": 19.0402,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://88.212.15.19/live/test_m_1_hungary_1200_atk/playlist.m3u8",
    "siteUrl": "https://mediaklikk.hu/m1/",
    "headlines": [
      "HUNGARY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUDAPEST",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "id-BeritaSatuid-0",
    "name": "BeritaSatu",
    "network": "BeritaSatu Broadcast Service",
    "country": "Indonesia",
    "city": "Jakarta",
    "lat": -6.2088,
    "lon": 106.8456,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://xtdslboppkkv-pull.bpmedialive.com/live/beritasatu/abr.m3u8",
    "siteUrl": "https://investor.id/livestream",
    "headlines": [
      "INDONESIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS JAKARTA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "id-BeritaSatuid-1",
    "name": "BeritaSatu",
    "network": "BeritaSatu Broadcast Service",
    "country": "Indonesia",
    "city": "Jakarta",
    "lat": -6.1588,
    "lon": 106.8956,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://op-group1-swiftservehd-1.dens.tv/h/h209/index.m3u8",
    "siteUrl": "https://investor.id/livestream",
    "headlines": [
      "INDONESIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS JAKARTA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "id-BNChannelid-2",
    "name": "BN Channel",
    "network": "BN Channel Broadcast Service",
    "country": "Indonesia",
    "city": "Jakarta",
    "lat": -6.1088000000000005,
    "lon": 106.9456,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://flv.intechmedia.net/live/ch112.m3u8",
    "siteUrl": "https://www.google.com/search?q=BN%20Channel%20news",
    "headlines": [
      "INDONESIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS JAKARTA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ie-SkyNewsie-0",
    "name": "Sky News",
    "network": "Sky News Broadcast Service",
    "country": "Ireland",
    "city": "Dublin",
    "lat": 53.3498,
    "lon": -6.2603,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://xemzi.short.gy/1000018",
    "siteUrl": "https://www.google.com/search?q=Sky%20News%20news",
    "headlines": [
      "IRELAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DUBLIN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ie-SkyNewsie-1",
    "name": "Sky News",
    "network": "Sky News Broadcast Service",
    "country": "Ireland",
    "city": "Dublin",
    "lat": 53.3998,
    "lon": -6.2103,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://jmp2.uk/plu-55b285cd2665de274553d66f.m3u8",
    "siteUrl": "https://www.google.com/search?q=Sky%20News%20news",
    "headlines": [
      "IRELAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DUBLIN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "il-Channel9il-0",
    "name": "Channel 9",
    "network": "Channel 9 Broadcast Service",
    "country": "Israel",
    "city": "Jerusalem",
    "lat": 31.7683,
    "lon": 35.2137,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://contact.gostreaming.tv/Con-11/index.m3u8",
    "siteUrl": "https://www.9tv.co.il/",
    "headlines": [
      "ISRAEL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS JERUSALEM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "il-i24NEWSArabicil-1",
    "name": "i24NEWS Arabic",
    "network": "i24NEWS Arabic Broadcast Service",
    "country": "Israel",
    "city": "Jerusalem",
    "lat": 31.8183,
    "lon": 35.2637,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://i24newsarabic-cdn.encoders.immergo.tv/master.m3u8",
    "siteUrl": "https://www.i24news.tv/ar/",
    "headlines": [
      "ISRAEL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS JERUSALEM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "il-i24NEWSArabicil-2",
    "name": "i24NEWS Arabic",
    "network": "i24NEWS Arabic Broadcast Service",
    "country": "Israel",
    "city": "Jerusalem",
    "lat": 31.8683,
    "lon": 35.313700000000004,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://hlspackager.akamaized.net/live/DB/i24_ARABIC/HLS/i24_ARABIC.m3u8",
    "siteUrl": "https://www.i24news.tv/ar/",
    "headlines": [
      "ISRAEL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS JERUSALEM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "iq-AlghadeerTViq-0",
    "name": "Alghadeer TV",
    "network": "Alghadeer TV Broadcast Service",
    "country": "Iraq",
    "city": "Baghdad",
    "lat": 33.3152,
    "lon": 44.3661,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://sd343444.vodu.store:3356/live/Alghadeer/index.m3u8",
    "siteUrl": "http://alghadeertv.net/",
    "headlines": [
      "IRAQ NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BAGHDAD",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "iq-AlIraqiaNewsiq-1",
    "name": "Al Iraqia News",
    "network": "Al Iraqia News Broadcast Service",
    "country": "Iraq",
    "city": "Baghdad",
    "lat": 33.365199999999994,
    "lon": 44.4161,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://imn-live.esite-lab.com/hls/iraqia-news.m3u8",
    "siteUrl": "http://imn.iq/",
    "headlines": [
      "IRAQ NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BAGHDAD",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "iq-AlJanoubTViq-2",
    "name": "Al Janoub TV",
    "network": "Al Janoub TV Broadcast Service",
    "country": "Iraq",
    "city": "Baghdad",
    "lat": 33.4152,
    "lon": 44.466100000000004,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.alissahost.net/hls/test.m3u8",
    "siteUrl": "https://aljanoub.tv/",
    "headlines": [
      "IRAQ NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BAGHDAD",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ir-AlAlamir-0",
    "name": "Al Alam",
    "network": "Al Alam Broadcast Service",
    "country": "Iran",
    "city": "Tehran",
    "lat": 35.6892,
    "lon": 51.389,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live2.alalam.ir/alalam.m3u8",
    "siteUrl": "https://www.alalam.ir/",
    "headlines": [
      "IRAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TEHRAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ir-HispanTVir-1",
    "name": "Hispan TV",
    "network": "Hispan TV Broadcast Service",
    "country": "Iran",
    "city": "Tehran",
    "lat": 35.7392,
    "lon": 51.439,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cdnlive.presstv.ir/live/smil:live.smil/playlist.m3u8",
    "siteUrl": "https://www.hispantv.com/",
    "headlines": [
      "IRAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TEHRAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ir-IranPressir-2",
    "name": "Iran Press",
    "network": "Iran Press Broadcast Service",
    "country": "Iran",
    "city": "Tehran",
    "lat": 35.7892,
    "lon": 51.489000000000004,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.presstv.ir/hls/presstv_5_482/index.m3u8",
    "siteUrl": "https://iranpress.com/",
    "headlines": [
      "IRAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TEHRAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "is-Visiris-0",
    "name": "Visir",
    "network": "Visir Broadcast Service",
    "country": "Iceland",
    "city": "Reykjavik",
    "lat": 64.1466,
    "lon": -21.9426,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.visir.is/hls-live/visir.smil/playlist.m3u8",
    "siteUrl": "https://www.visir.is/",
    "headlines": [
      "ICELAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS REYKJAVIK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "it-Adnkronosit-0",
    "name": "Adnkronos",
    "network": "Adnkronos Broadcast Service",
    "country": "Italy",
    "city": "Rome",
    "lat": 41.9028,
    "lon": 12.4964,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://5e73cf528f404.streamlock.net/GR_sport/livestream/playlist.m3u8",
    "siteUrl": "https://www.adnkronos.com/",
    "headlines": [
      "ITALY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ROME",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "it-EtnaEspressoChannelit-1",
    "name": "Etna Espresso Channel",
    "network": "Etna Espresso Channel Broadcast Service",
    "country": "Italy",
    "city": "Rome",
    "lat": 41.952799999999996,
    "lon": 12.5464,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://5db313b643fd8.streamlock.net/Etnachannelponte/Etnachannelponte/playlist.m3u8",
    "siteUrl": "https://www.radioetnaespresso.com/",
    "headlines": [
      "ITALY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ROME",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "it-eTvMarcheit-2",
    "name": "eTv Marche",
    "network": "eTv Marche Broadcast Service",
    "country": "Italy",
    "city": "Rome",
    "lat": 42.0028,
    "lon": 12.5964,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.ipstream.it/etvmarche/etvmarche.stream/playlist.m3u8",
    "siteUrl": "https://etvmarche.it/",
    "headlines": [
      "ITALY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ROME",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "jo-AlhaqeqaAldawliajo-0",
    "name": "Alhaqeqa Aldawlia",
    "network": "Alhaqeqa Aldawlia Broadcast Service",
    "country": "Jordan",
    "city": "Amman",
    "lat": 31.9454,
    "lon": 35.9284,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://ghaasiflu.online/alhqeqa/index.m3u8",
    "siteUrl": "https://www.factjo.com/Pages.aspx?id=6",
    "headlines": [
      "JORDAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS AMMAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "jo-AltaghierTVjo-1",
    "name": "Altaghier TV",
    "network": "Altaghier TV Broadcast Service",
    "country": "Jordan",
    "city": "Amman",
    "lat": 31.9954,
    "lon": 35.9784,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://jmc-live.ercdn.net/altaghier/altaghier.m3u8",
    "siteUrl": "https://altaghier.tv/",
    "headlines": [
      "JORDAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS AMMAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ke-LolweTVke-0",
    "name": "Lolwe TV",
    "network": "Lolwe TV Broadcast Service",
    "country": "Kenya",
    "city": "Nairobi",
    "lat": -1.2921,
    "lon": 36.8219,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://goliveafrica.media:9998/live/62580e144eb43/index.m3u8",
    "siteUrl": "https://www.lolwe.tv/",
    "headlines": [
      "KENYA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS NAIROBI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kg-AlaToo24kg-0",
    "name": "Ala-Too 24",
    "network": "Ala-Too 24 Broadcast Service",
    "country": "Kyrgyzstan",
    "city": "Bishkek",
    "lat": 42.8746,
    "lon": 74.5698,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://st2.mediabay.tv/KG_KTRK-Ala-too/playlist.m3u8",
    "siteUrl": "https://www.utrk.kg/kg/live/tv?channel=42",
    "headlines": [
      "KYRGYZSTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BISHKEK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kh-BTVNewskh-0",
    "name": "BTV News",
    "network": "BTV News Broadcast Service",
    "country": "Cambodia",
    "city": "Phnom Penh",
    "lat": 11.5564,
    "lon": 104.9282,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live-evg2.tv360.metfone.com.kh/livetest/bayontest.stream/playlist.m3u8",
    "siteUrl": "https://news.btv.com.kh/",
    "headlines": [
      "CAMBODIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PHNOM PENH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kh-BTVNewskh-1",
    "name": "BTV News",
    "network": "BTV News Broadcast Service",
    "country": "Cambodia",
    "city": "Phnom Penh",
    "lat": 11.6064,
    "lon": 104.9782,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://server.dtvhd.com/memfs/cf0911cf-4ccc-47b1-8996-e5d705442b89.m3u8",
    "siteUrl": "https://news.btv.com.kh/",
    "headlines": [
      "CAMBODIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PHNOM PENH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kh-EACNewsTVkh-2",
    "name": "EAC News TV",
    "network": "EAC News TV Broadcast Service",
    "country": "Cambodia",
    "city": "Phnom Penh",
    "lat": 11.6564,
    "lon": 105.0282,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.eac-news.com/LiveApp/streams/eacnews.m3u8",
    "siteUrl": "https://eacnews.asia/",
    "headlines": [
      "CAMBODIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PHNOM PENH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kr-ArirangTVkr-0",
    "name": "Arirang TV",
    "network": "Arirang TV Broadcast Service",
    "country": "South Korea",
    "city": "Seoul",
    "lat": 37.5665,
    "lon": 126.978,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://45.162.64.114/ARIRANG/index.m3u8",
    "siteUrl": "https://www.arirang.com/",
    "headlines": [
      "SOUTH KOREA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SEOUL",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kr-ArirangTVkr-1",
    "name": "Arirang TV",
    "network": "Arirang TV Broadcast Service",
    "country": "South Korea",
    "city": "Seoul",
    "lat": 37.616499999999995,
    "lon": 127.02799999999999,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://dash3.antik.sk/live/test_arirang/playlist.m3u8",
    "siteUrl": "https://www.arirang.com/",
    "headlines": [
      "SOUTH KOREA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SEOUL",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kr-ArirangTVkr-2",
    "name": "Arirang TV",
    "network": "Arirang TV Broadcast Service",
    "country": "South Korea",
    "city": "Seoul",
    "lat": 37.6665,
    "lon": 127.07799999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://amdlive-ch01.ctnd.com.edgesuite.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8",
    "siteUrl": "https://www.arirang.com/",
    "headlines": [
      "SOUTH KOREA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SEOUL",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kw-KTV2kw-0",
    "name": "KTV 2",
    "network": "KTV 2 Broadcast Service",
    "country": "Kuwait",
    "city": "Kuwait City",
    "lat": 29.3759,
    "lon": 47.9774,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://kwtktv2ta.cdn.mangomolo.com/ktv2/smil:ktv2.stream.smil/chunklist.m3u8",
    "siteUrl": "https://media.gov.kw/",
    "headlines": [
      "KUWAIT NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KUWAIT CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kw-KTVNewskw-1",
    "name": "KTV News",
    "network": "KTV News Broadcast Service",
    "country": "Kuwait",
    "city": "Kuwait City",
    "lat": 29.425900000000002,
    "lon": 48.0274,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://kwtkbta.cdn.mangomolo.com/kb/smil:kb.stream.smil/chunklist.m3u8",
    "siteUrl": "https://media.gov.kw/",
    "headlines": [
      "KUWAIT NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KUWAIT CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kw-KTVNewskw-2",
    "name": "KTV News",
    "network": "KTV News Broadcast Service",
    "country": "Kuwait",
    "city": "Kuwait City",
    "lat": 29.475900000000003,
    "lon": 48.077400000000004,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://kwtktvata.cdn.mangomolo.com/ktva/smil:ktva.stream.smil/chunklist.m3u8",
    "siteUrl": "https://media.gov.kw/",
    "headlines": [
      "KUWAIT NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KUWAIT CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "kz-24KZkz-0",
    "name": "24KZ",
    "network": "24KZ Broadcast Service",
    "country": "Kazakhstan",
    "city": "Astana",
    "lat": 51.1694,
    "lon": 71.4491,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://fs.uplink.kz/24KZ/mono.m3u8?token=onlinetv",
    "siteUrl": "https://24.kz/",
    "headlines": [
      "KAZAKHSTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ASTANA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "la-BrianTVla-0",
    "name": "Brian TV",
    "network": "Brian TV Broadcast Service",
    "country": "Laos",
    "city": "Vientiane",
    "lat": 17.9757,
    "lon": 102.6331,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://livefta.malimarcdn.com/ftaedge00/briantv.sdp/playlist.m3u8",
    "siteUrl": "https://www.google.com/search?q=Brian%20TV%20news",
    "headlines": [
      "LAOS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS VIENTIANE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "lb-AlManarlb-0",
    "name": "Al-Manar",
    "network": "Al-Manar Broadcast Service",
    "country": "Lebanon",
    "city": "Beirut",
    "lat": 33.8938,
    "lon": 35.5018,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://edge.fastpublish.me/live/index.m3u8",
    "siteUrl": "https://www.almanar.com.lb/",
    "headlines": [
      "LEBANON NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BEIRUT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "lb-AlMayadeenTVlb-1",
    "name": "Al Mayadeen TV",
    "network": "Al Mayadeen TV Broadcast Service",
    "country": "Lebanon",
    "city": "Beirut",
    "lat": 33.943799999999996,
    "lon": 35.5518,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://mdnlv.cdn.octivid.com/almdn/smil:mpegts.stream.smil/playlist.m3u8",
    "siteUrl": "https://www.almayadeen.net/",
    "headlines": [
      "LEBANON NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BEIRUT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "lb-ALWifakNewsTVlb-2",
    "name": "ALWifak News TV",
    "network": "ALWifak News TV Broadcast Service",
    "country": "Lebanon",
    "city": "Beirut",
    "lat": 33.9938,
    "lon": 35.601800000000004,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://alwifaklive.info:1935/live/myStream/playlist.m3u8",
    "siteUrl": "https://www.alwifaknews.com/alwifaknewstv",
    "headlines": [
      "LEBANON NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BEIRUT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "lt-LRTRadijaslt-0",
    "name": "LRT Radijas",
    "network": "LRT Radijas Broadcast Service",
    "country": "Lithuania",
    "city": "Vilnius",
    "lat": 54.6872,
    "lon": 25.2797,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://stream-live.lrt.lt/radijas/master.m3u8",
    "siteUrl": "https://www.lrt.lt/",
    "headlines": [
      "LITHUANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS VILNIUS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ly-AlMasarTVly-0",
    "name": "Al Masar TV",
    "network": "Al Masar TV Broadcast Service",
    "country": "Libya",
    "city": "Tripoli",
    "lat": 32.8872,
    "lon": 13.1913,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://starmenajo.com/hls/almasar/index.m3u8",
    "siteUrl": "https://almasartv.ly/",
    "headlines": [
      "LIBYA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TRIPOLI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ma-Medi1TVAfriquema-0",
    "name": "Medi1TV Afrique",
    "network": "Medi1TV Afrique Broadcast Service",
    "country": "Morocco",
    "city": "Rabat",
    "lat": 34.0209,
    "lon": -6.8416,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-afrique_tm7tu45/playlist.m3u8",
    "siteUrl": "https://medi1tv.com/",
    "headlines": [
      "MOROCCO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RABAT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ma-Medi1TVAfriquema-1",
    "name": "Medi1TV Afrique",
    "network": "Medi1TV Afrique Broadcast Service",
    "country": "Morocco",
    "city": "Rabat",
    "lat": 34.070899999999995,
    "lon": -6.7916,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-afrique_tm7tu45/playlist_dvr.m3u8",
    "siteUrl": "https://medi1tv.com/",
    "headlines": [
      "MOROCCO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RABAT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ma-Medi1TVArabicma-2",
    "name": "Medi1TV Arabic",
    "network": "Medi1TV Arabic Broadcast Service",
    "country": "Morocco",
    "city": "Rabat",
    "lat": 34.1209,
    "lon": -6.7416,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-arabic_g90v4ec/playlist.m3u8",
    "siteUrl": "https://medi1tv.com/",
    "headlines": [
      "MOROCCO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RABAT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mc-MonacoInfomc-0",
    "name": "Monaco Info",
    "network": "Monaco Info Broadcast Service",
    "country": "Monaco",
    "city": "Monaco",
    "lat": 43.7384,
    "lon": 7.4246,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://webtv.monacoinfo.com/live/prod/index.m3u8",
    "siteUrl": "https://monacoinfo.com/",
    "headlines": [
      "MONACO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MONACO",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "md-PROTVChisinaumd-0",
    "name": "PRO TV Chisinau",
    "network": "PRO TV Chisinau Broadcast Service",
    "country": "Moldova",
    "city": "Chisinau",
    "lat": 47.0105,
    "lon": 28.8638,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://stream.protv.md/live/sursa-1/index.m3u8",
    "siteUrl": "https://protv.md/",
    "headlines": [
      "MOLDOVA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CHISINAU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "md-RealitateaTVmd-1",
    "name": "Realitatea TV",
    "network": "Realitatea TV Broadcast Service",
    "country": "Moldova",
    "city": "Chisinau",
    "lat": 47.0605,
    "lon": 28.913800000000002,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://realitatealive.md/tv/rlive.m3u8",
    "siteUrl": "https://realitatea.md/",
    "headlines": [
      "MOLDOVA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CHISINAU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "md-TV8md-2",
    "name": "TV8",
    "network": "TV8 Broadcast Service",
    "country": "Moldova",
    "city": "Chisinau",
    "lat": 47.1105,
    "lon": 28.963800000000003,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://315e5a5d.ottrast.com/iptv/8KSD5KFDXA6H88/2454/index.m3u8",
    "siteUrl": "https://tv8.md/live",
    "headlines": [
      "MOLDOVA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CHISINAU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mk-MNetInfomk-0",
    "name": "M-Net Info",
    "network": "M-Net Info Broadcast Service",
    "country": "North Macedonia",
    "city": "Skopje",
    "lat": 41.9981,
    "lon": 21.4254,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.mnet.mk/hls/mnet-info.m3u8",
    "siteUrl": "https://info.mnet.mk/",
    "headlines": [
      "NORTH MACEDONIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SKOPJE",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mm-DVBTVmm-0",
    "name": "DVB TV",
    "network": "DVB TV Broadcast Service",
    "country": "Myanmar",
    "city": "Naypyidaw",
    "lat": 19.7633,
    "lon": 96.0785,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live-stream.dvb.no/hls/stream_src/index.m3u8",
    "siteUrl": "https://burmese.dvb.no/",
    "headlines": [
      "MYANMAR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS NAYPYIDAW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mm-MRTVNewsmm-1",
    "name": "MRTV News",
    "network": "MRTV News Broadcast Service",
    "country": "Myanmar",
    "city": "Naypyidaw",
    "lat": 19.8133,
    "lon": 96.1285,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://mrtvott.com/cache/MRTV-NEWS-HD/master.m3u8",
    "siteUrl": "https://mrtv.gov.mm/",
    "headlines": [
      "MYANMAR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS NAYPYIDAW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mn-CNBCMongoliamn-0",
    "name": "CNBC Mongolia",
    "network": "CNBC Mongolia Broadcast Service",
    "country": "Mongolia",
    "city": "Ulaanbaatar",
    "lat": 47.8864,
    "lon": 106.9057,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cdn4.skygo.mn/live/disk1/CNBC/HLSv3-FTA/CNBC.m3u8",
    "siteUrl": "https://cnbc.mn/",
    "headlines": [
      "MONGOLIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ULAANBAATAR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mn-EagleNewsmn-1",
    "name": "Eagle News",
    "network": "Eagle News Broadcast Service",
    "country": "Mongolia",
    "city": "Ulaanbaatar",
    "lat": 47.9364,
    "lon": 106.9557,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cdn4.skygo.mn/live/disk1/Eagle/DASH-FTA/Eagle.mpd",
    "siteUrl": "http://eagle.mn/",
    "headlines": [
      "MONGOLIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ULAANBAATAR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mn-EagleNewsmn-2",
    "name": "Eagle News",
    "network": "Eagle News Broadcast Service",
    "country": "Mongolia",
    "city": "Ulaanbaatar",
    "lat": 47.9864,
    "lon": 107.00569999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://cdn4.skygo.mn/live/disk1/Eagle/HLSv3-FTA/Eagle.m3u8",
    "siteUrl": "http://eagle.mn/",
    "headlines": [
      "MONGOLIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ULAANBAATAR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mo-TDMInformationmo-0",
    "name": "TDM Information",
    "network": "TDM Information Broadcast Service",
    "country": "Macau",
    "city": "Macau",
    "lat": 22.1987,
    "lon": 113.5439,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live3.tdm.com.mo/ch5/info_ch5.live/playlist.m3u8",
    "siteUrl": "http://new.tdm.com.mo/c_tv/?ch=info",
    "headlines": [
      "MACAU NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MACAU",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mt-TVMnewsPlusmt-0",
    "name": "TVMnews+",
    "network": "TVMnews+ Broadcast Service",
    "country": "Malta",
    "city": "Valletta",
    "lat": 35.8989,
    "lon": 14.5146,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://80.79.6.221:25461/smash/public/20",
    "siteUrl": "https://tvmi.mt/live/3",
    "headlines": [
      "MALTA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS VALLETTA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mv-PSMNewsmv-0",
    "name": "PSM News",
    "network": "PSM News Broadcast Service",
    "country": "Maldives",
    "city": "Mal\xE9",
    "lat": 4.1755,
    "lon": 73.5093,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://customer-ujex1meek7koqd9x.cloudflarestream.com/21262545317dadfa20dab4f9bd37c7c2/manifest/video.m3u8",
    "siteUrl": "http://psmnews.mv/",
    "headlines": [
      "MALDIVES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MAL\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mv-VTVmv-1",
    "name": "VTV",
    "network": "VTV Broadcast Service",
    "country": "Maldives",
    "city": "Mal\xE9",
    "lat": 4.2255,
    "lon": 73.5593,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://vtvstream.vnews.mv/vtvlive/vmedia/playlist.m3u8",
    "siteUrl": "https://www.vnews.mv/",
    "headlines": [
      "MALDIVES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MAL\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mv-YESmv-2",
    "name": "YES",
    "network": "YES Broadcast Service",
    "country": "Maldives",
    "city": "Mal\xE9",
    "lat": 4.2755,
    "lon": 73.60929999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://customer-ujex1meek7koqd9x.cloudflarestream.com/4f0b316cdb0fbb7f8ca93860ed11d38b/manifest/video.m3u8",
    "siteUrl": "http://psmnews.mv/",
    "headlines": [
      "MALDIVES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MAL\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mx-AcustikTVmx-0",
    "name": "Acustik TV",
    "network": "Acustik TV Broadcast Service",
    "country": "Mexico",
    "city": "Mexico City",
    "lat": 19.4326,
    "lon": -99.1332,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://s5.mexside.net:1936/clientetv/clientetv/playlist.m3u8",
    "siteUrl": "https://acustik.mx/",
    "headlines": [
      "MEXICO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MEXICO CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mx-ADN40mx-1",
    "name": "ADN 40",
    "network": "ADN 40 Broadcast Service",
    "country": "Mexico",
    "city": "Mexico City",
    "lat": 19.4826,
    "lon": -99.0832,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://mdstrm.com/live-stream-playlist/60b578b060947317de7b57ac.m3u8",
    "siteUrl": "https://www.adn40.mx/",
    "headlines": [
      "MEXICO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MEXICO CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "mx-AMXNoticiasmx-2",
    "name": "AMX Noticias",
    "network": "AMX Noticias Broadcast Service",
    "country": "Mexico",
    "city": "Mexico City",
    "lat": 19.532600000000002,
    "lon": -99.03320000000001,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://5e50264bd6766.streamlock.net/mexiquense2/videomexiquense2/playlist.m3u8",
    "siteUrl": "https://radioytvmexiquense.mx/index.php/noticias/",
    "headlines": [
      "MEXICO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MEXICO CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "my-BeritaRTMmy-0",
    "name": "Berita RTM",
    "network": "Berita RTM Broadcast Service",
    "country": "Malaysia",
    "city": "Kuala Lumpur",
    "lat": 3.139,
    "lon": 101.6869,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://d25tgymtnqzu8s.cloudfront.net/smil:berita/playlist.m3u8?id=5",
    "siteUrl": "https://berita.rtm.gov.my/",
    "headlines": [
      "MALAYSIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KUALA LUMPUR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "my-RTMASEANmy-1",
    "name": "RTM ASEAN",
    "network": "RTM ASEAN Broadcast Service",
    "country": "Malaysia",
    "city": "Kuala Lumpur",
    "lat": 3.1889999999999996,
    "lon": 101.73689999999999,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://d25tgymtnqzu8s.cloudfront.net/event/smil:event1/chunklist_b2596000_slENG.m3u8",
    "siteUrl": "https://rtmklik.rtm.gov.my/live/rtmasean",
    "headlines": [
      "MALAYSIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KUALA LUMPUR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ne-SaraouniaTVne-0",
    "name": "Saraounia TV",
    "network": "Saraounia TV Broadcast Service",
    "country": "Niger",
    "city": "Niamey",
    "lat": 13.5116,
    "lon": 2.1254,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live20.bozztv.com/dvrfl06/astv/astv-saraouna/index.m3u8",
    "siteUrl": "https://www.google.com/search?q=Saraounia%20TV%20news",
    "headlines": [
      "NIGER NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS NIAMEY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ng-AdvocateBroadcastingNetw-0",
    "name": "Advocate Broadcasting Network",
    "network": "Advocate Broadcasting Network Broadcast Service",
    "country": "Nigeria",
    "city": "Abuja",
    "lat": 9.0765,
    "lon": 7.3986,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "srt://105.113.54.98:4001",
    "siteUrl": "https://www.abn.ng/",
    "headlines": [
      "NIGERIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ABUJA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ng-Channels24ng-1",
    "name": "Channels 24",
    "network": "Channels 24 Broadcast Service",
    "country": "Nigeria",
    "city": "Abuja",
    "lat": 9.1265,
    "lon": 7.4486,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://live20.bozztv.com/dvrfl06/astv/astv-channel24africa/index.m3u8",
    "siteUrl": "https://www.channelstv.com/",
    "headlines": [
      "NIGERIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ABUJA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ng-ChannelsTVng-2",
    "name": "Channels TV",
    "network": "Channels TV Broadcast Service",
    "country": "Nigeria",
    "city": "Abuja",
    "lat": 9.176499999999999,
    "lon": 7.4986,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://cs2.push2stream.com/CHANNELSTV-DVR/playlist.m3u8",
    "siteUrl": "https://www.channelstv.com/",
    "headlines": [
      "NIGERIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ABUJA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ni-CDNN23ni-0",
    "name": "CDNN 23",
    "network": "CDNN 23 Broadcast Service",
    "country": "Nicaragua",
    "city": "Managua",
    "lat": 12.115,
    "lon": -86.2362,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cootv.cootel.com.ni:8095/Canal23_CooTel/playlist.m3u8",
    "siteUrl": "https://www.cdnn23.com/",
    "headlines": [
      "NICARAGUA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MANAGUA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "nl-NHnl-0",
    "name": "NH",
    "network": "NH Broadcast Service",
    "country": "Netherlands",
    "city": "Amsterdam",
    "lat": 52.3676,
    "lon": 4.9041,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://takeoff.jetstre.am/?account=nhnieuws&file=live&output=playlist.m3u8&protocol=https&service=wowza&type=live",
    "siteUrl": "https://www.nhnieuws.nl/",
    "headlines": [
      "NETHERLANDS NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS AMSTERDAM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "om-OmanTVMubashirom-0",
    "name": "Oman TV Mubashir",
    "network": "Oman TV Mubashir Broadcast Service",
    "country": "Oman",
    "city": "Muscat",
    "lat": 23.588,
    "lon": 58.3829,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://partwota.cdn.mgmlcdn.com/omlive/smil:omlive.stream.smil/chunklist.m3u8",
    "siteUrl": "http://part.gov.om/part/",
    "headlines": [
      "OMAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MUSCAT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pa-PlusTVpa-0",
    "name": "Plus TV",
    "network": "Plus TV Broadcast Service",
    "country": "Panama",
    "city": "Panama City",
    "lat": 8.9824,
    "lon": -79.5199,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://vcp4.myplaytv.com:1936/plustv/plustv/playlist.m3u8",
    "siteUrl": "https://plustucanaldeopinion.com/",
    "headlines": [
      "PANAMA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PANAMA CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pa-RadioAnconpa-1",
    "name": "Radio Ancon",
    "network": "Radio Ancon Broadcast Service",
    "country": "Panama",
    "city": "Panama City",
    "lat": 9.0324,
    "lon": -79.46990000000001,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://www.streaming507.net:19360/anconvideo/anconvideo.m3u8",
    "siteUrl": "https://radioancon.com/",
    "headlines": [
      "PANAMA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PANAMA CITY",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pe-ATVPluspe-0",
    "name": "ATV+",
    "network": "ATV+ Broadcast Service",
    "country": "Peru",
    "city": "Lima",
    "lat": -12.0464,
    "lon": -77.0428,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://45.171.108.253:8888/ATV/index.m3u8",
    "siteUrl": "https://www.atv.pe/",
    "headlines": [
      "PERU NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LIMA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pe-ATVPluspe-1",
    "name": "ATV+",
    "network": "ATV+ Broadcast Service",
    "country": "Peru",
    "city": "Lima",
    "lat": -11.9964,
    "lon": -76.9928,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://177.234.249.178:8888/ATV/index.m3u8",
    "siteUrl": "https://www.atv.pe/",
    "headlines": [
      "PERU NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LIMA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pe-ATVPluspe-2",
    "name": "ATV+",
    "network": "ATV+ Broadcast Service",
    "country": "Peru",
    "city": "Lima",
    "lat": -11.9464,
    "lon": -76.9428,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://179.60.51.134:8888/ATV/index.m3u8",
    "siteUrl": "https://www.atv.pe/",
    "headlines": [
      "PERU NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LIMA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ph-AbanteTVph-0",
    "name": "Abante TV",
    "network": "Abante TV Broadcast Service",
    "country": "Philippines",
    "city": "Manila",
    "lat": 14.5995,
    "lon": 120.9842,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://amg19223-amg19223c12-amgplt0352.playout.now3.amagi.tv/playlist/amg19223-amg19223c12-amgplt0352/playlist.m3u8",
    "siteUrl": "https://www.abante.com.ph/",
    "headlines": [
      "PHILIPPINES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MANILA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "ph-BilyonaryoNewsChannelph-1",
    "name": "Bilyonaryo News Channel",
    "network": "Bilyonaryo News Channel Broadcast Service",
    "country": "Philippines",
    "city": "Manila",
    "lat": 14.649500000000002,
    "lon": 121.0342,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://amg19223-amg19223c11-amgplt0352.playout.now3.amagi.tv/playlist/amg19223-amg19223c11-amgplt0352/playlist.m3u8",
    "siteUrl": "https://bnc.ph/",
    "headlines": [
      "PHILIPPINES NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MANILA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pk-7Newspk-0",
    "name": "7 News",
    "network": "7 News Broadcast Service",
    "country": "Pakistan",
    "city": "Islamabad",
    "lat": 33.6844,
    "lon": 73.0479,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://sscsott.com/7news/live/index.m3u8",
    "siteUrl": "https://www.google.com/search?q=7%20News%20news",
    "headlines": [
      "PAKISTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ISLAMABAD",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pk-24NewsHDpk-1",
    "name": "24 News HD",
    "network": "24 News HD Broadcast Service",
    "country": "Pakistan",
    "city": "Islamabad",
    "lat": 33.734399999999994,
    "lon": 73.0979,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cdn4.mjunoon.tv:8087/streamtest/146M/chunks.m3u8",
    "siteUrl": "https://www.24newshd.tv/",
    "headlines": [
      "PAKISTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ISLAMABAD",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pk-92NewsHDpk-2",
    "name": "92 News HD",
    "network": "92 News HD Broadcast Service",
    "country": "Pakistan",
    "city": "Islamabad",
    "lat": 33.7844,
    "lon": 73.14789999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://92news.vdn.dstreamone.net/92newshd/92hd/playlist.m3u8",
    "siteUrl": "https://92newshd.tv/live-tv",
    "headlines": [
      "PAKISTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ISLAMABAD",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pl-BTBInfopl-0",
    "name": "BTB Info",
    "network": "BTB Info Broadcast Service",
    "country": "Poland",
    "city": "Warsaw",
    "lat": 52.2297,
    "lon": 21.0122,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://emisja2.btb.j00r.us/iptv/session/4/hls.m3u8",
    "siteUrl": "https://btb.j00r.us",
    "headlines": [
      "POLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS WARSAW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pl-BTBInfopl-1",
    "name": "BTB Info",
    "network": "BTB Info Broadcast Service",
    "country": "Poland",
    "city": "Warsaw",
    "lat": 52.2797,
    "lon": 21.0622,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://panel.btb.j00r.us/memfs/928cfb64-fed7-4c27-9937-f5ad72d9d73c.m3u8",
    "siteUrl": "https://btb.j00r.us",
    "headlines": [
      "POLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS WARSAW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.960Z"
  },
  {
    "id": "pl-Euronewspl-2",
    "name": "Euronews",
    "network": "Euronews Broadcast Service",
    "country": "Poland",
    "city": "Warsaw",
    "lat": 52.3297,
    "lon": 21.1122,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://cdn-euronews.akamaized.net/live/eds/euronews-pl/26382/index.m3u8",
    "siteUrl": "https://pl.euronews.com/",
    "headlines": [
      "POLAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS WARSAW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "pr-RadioIslaTVpr-0",
    "name": "Radio Isla TV",
    "network": "Radio Isla TV Broadcast Service",
    "country": "Puerto Rico",
    "city": "San Juan",
    "lat": 18.4655,
    "lon": -66.1057,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://59a564764e2b6.streamlock.net/palestra/palestra/playlist.m3u8",
    "siteUrl": "https://radioisla.tv/",
    "headlines": [
      "PUERTO RICO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SAN JUAN",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ps-AlNajahNewsps-0",
    "name": "Al Najah News",
    "network": "Al Najah News Broadcast Service",
    "country": "Palestine",
    "city": "Ramallah",
    "lat": 31.9038,
    "lon": 35.2034,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://streaming.najah.edu:8443/hls/AlNajah.m3u8",
    "siteUrl": "https://nn.najah.edu",
    "headlines": [
      "PALESTINE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RAMALLAH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ps-KolalnasTVps-1",
    "name": "Kolalnas TV",
    "network": "Kolalnas TV Broadcast Service",
    "country": "Palestine",
    "city": "Ramallah",
    "lat": 31.9538,
    "lon": 35.2534,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://htvint.mada.ps/kolalnas/index.m3u8",
    "siteUrl": "https://kolalnastv.com/",
    "headlines": [
      "PALESTINE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RAMALLAH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ps-MaanTVps-2",
    "name": "Maan TV",
    "network": "Maan TV Broadcast Service",
    "country": "Palestine",
    "city": "Ramallah",
    "lat": 32.0038,
    "lon": 35.3034,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://htvmada.mada.ps:4443/maannews/index.m3u8",
    "siteUrl": "https://www.maannews.net/",
    "headlines": [
      "PALESTINE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RAMALLAH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "pt-RTPNoticiaspt-0",
    "name": "RTP Noticias",
    "network": "RTP Noticias Broadcast Service",
    "country": "Portugal",
    "city": "Lisbon",
    "lat": 38.7223,
    "lon": -9.1393,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://streaming-live.rtp.pt/livetvhlsDVR/rtpnHDdvr.smil/playlist.m3u8",
    "siteUrl": "https://www.rtp.pt/noticias/",
    "headlines": [
      "PORTUGAL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LISBON",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "pt-RTPNoticiaspt-1",
    "name": "RTP Noticias",
    "network": "RTP Noticias Broadcast Service",
    "country": "Portugal",
    "city": "Lisbon",
    "lat": 38.772299999999994,
    "lon": -9.0893,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://streaming-live.rtp.pt/livetvhlsDVR/rtpndvr.smil/playlist.m3u8",
    "siteUrl": "https://www.rtp.pt/noticias/",
    "headlines": [
      "PORTUGAL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LISBON",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "pt-SICNoticiaspt-2",
    "name": "SIC Noticias",
    "network": "SIC Noticias Broadcast Service",
    "country": "Portugal",
    "city": "Lisbon",
    "lat": 38.8223,
    "lon": -9.0393,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://sicnot.live.impresa.pt/sicnot.m3u8",
    "siteUrl": "https://sicnoticias.pt/",
    "headlines": [
      "PORTUGAL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LISBON",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "py-4DmasNoticiasTVpy-0",
    "name": "4Dmas Noticias TV",
    "network": "4Dmas Noticias TV Broadcast Service",
    "country": "Paraguay",
    "city": "Asunci\xF3n",
    "lat": -25.2637,
    "lon": -57.5759,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://rds3.desdeparaguay.net/4dmasnoticiastv/4dmasnoticiastv/playlist.m3u8",
    "siteUrl": "https://4dmasnoticias.com.py/",
    "headlines": [
      "PARAGUAY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ASUNCI\xD3N",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "py-C9Npy-1",
    "name": "C9N",
    "network": "C9N Broadcast Service",
    "country": "Paraguay",
    "city": "Asunci\xF3n",
    "lat": -25.2137,
    "lon": -57.5259,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://d2b5h5wyivfnfl.cloudfront.net/live/48f53430-9014-4459-a048-6169dac14140/ts:abr.m3u8",
    "siteUrl": "https://www.c9n.com.py/",
    "headlines": [
      "PARAGUAY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ASUNCI\xD3N",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "py-C9Npy-2",
    "name": "C9N",
    "network": "C9N Broadcast Service",
    "country": "Paraguay",
    "city": "Asunci\xF3n",
    "lat": -25.1637,
    "lon": -57.475899999999996,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://d174axghh54kh0.cloudfront.net/ts:abr.m3u8",
    "siteUrl": "https://www.c9n.com.py/",
    "headlines": [
      "PARAGUAY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ASUNCI\xD3N",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ro-AlephNewsro-0",
    "name": "Aleph News",
    "network": "Aleph News Broadcast Service",
    "country": "Romania",
    "city": "Bucharest",
    "lat": 44.4268,
    "lon": 26.1025,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://stream-aleph.m.ro/Aleph/ngrp:Alephnewsmain.stream_all/playlist.m3u8",
    "siteUrl": "https://alephnews.ro/",
    "headlines": [
      "ROMANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUCHAREST",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ro-B1ro-1",
    "name": "B1",
    "network": "B1 Broadcast Service",
    "country": "Romania",
    "city": "Bucharest",
    "lat": 44.4768,
    "lon": 26.1525,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://hls02ns.antenaplay.ro/hls/b1-tv-hd/index.m3u8",
    "siteUrl": "https://b1.ro/",
    "headlines": [
      "ROMANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUCHAREST",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ro-Digi24ro-2",
    "name": "Digi 24",
    "network": "Digi 24 Broadcast Service",
    "country": "Romania",
    "city": "Bucharest",
    "lat": 44.5268,
    "lon": 26.2025,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://edge-ar.rcs-rds.ro/digi24ar/index.m3u8",
    "siteUrl": "https://www.digi24.ro/",
    "headlines": [
      "ROMANIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BUCHAREST",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ru-360Newsru-0",
    "name": "360\xB0 News",
    "network": "360\xB0 News Broadcast Service",
    "country": "Russia",
    "city": "Moscow",
    "lat": 55.7558,
    "lon": 37.6173,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live-vgtrksmotrim.cdnvideo.ru/vgtrksmotrim/smotrim-live-03-srt.smil/playlist.m3u8",
    "siteUrl": "https://360tv.ru/",
    "headlines": [
      "RUSSIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MOSCOW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ru-Astrahan24ru-1",
    "name": "Astrahan 24",
    "network": "Astrahan 24 Broadcast Service",
    "country": "Russia",
    "city": "Moscow",
    "lat": 55.8058,
    "lon": 37.6673,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://streaming.astrakhan.ru/astrakhan24/playlist.m3u8",
    "siteUrl": "https://cdn.astrakhan-24.ru/",
    "headlines": [
      "RUSSIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MOSCOW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ru-Crimea24ru-2",
    "name": "Crimea 24",
    "network": "Crimea 24 Broadcast Service",
    "country": "Russia",
    "city": "Moscow",
    "lat": 55.8558,
    "lon": 37.7173,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://cdn.1tvcrimea.ru/24tvcrimea.m3u8",
    "siteUrl": "https://crimea24tv.ru/",
    "headlines": [
      "RUSSIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS MOSCOW",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sa-AlAlamAlYawmsa-0",
    "name": "Al Alam Al Yawm",
    "network": "Al Alam Al Yawm Broadcast Service",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "lat": 24.7136,
    "lon": 46.6753,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://mn-nl.mncdn.com/mekameleen/smil:mekameleentv.smil/chunklist_b928000.m3u8",
    "siteUrl": "https://www.google.com/search?q=Al%20Alam%20Al%20Yawm%20news",
    "headlines": [
      "SAUDI ARABIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RIYADH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sa-AlArabiyaEnglishsa-1",
    "name": "Al Arabiya English",
    "network": "Al Arabiya English Broadcast Service",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "lat": 24.7636,
    "lon": 46.7253,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://live.alarabiya.net/alarabiapublish/english/playlist_dvr.m3u8",
    "siteUrl": "https://www.google.com/search?q=Al%20Arabiya%20English%20news",
    "headlines": [
      "SAUDI ARABIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RIYADH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sa-AlArabiyaEnglishsa-2",
    "name": "Al Arabiya English",
    "network": "Al Arabiya English Broadcast Service",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "lat": 24.8136,
    "lon": 46.7753,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://shls-live-enc.edgenextcdn.net/out/v1/07a6ab2d57b2453a91bbdd2d46b5865a/index.m3u8",
    "siteUrl": "https://www.google.com/search?q=Al%20Arabiya%20English%20news",
    "headlines": [
      "SAUDI ARABIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS RIYADH",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sd-DabangaTVsd-0",
    "name": "Dabanga TV",
    "network": "Dabanga TV Broadcast Service",
    "country": "Sudan",
    "city": "Khartoum",
    "lat": 15.5007,
    "lon": 32.5599,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://hls.dabangasudan.org/hls/stream.m3u8",
    "siteUrl": "https://www.dabangasudan.org/",
    "headlines": [
      "SUDAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KHARTOUM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "se-AznewsTVse-0",
    "name": "Aznews TV",
    "network": "Aznews TV Broadcast Service",
    "country": "Sweden",
    "city": "Stockholm",
    "lat": 59.3293,
    "lon": 18.0686,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://edge1.socialsmart.tv/aznews/smil/playlist.m3u8",
    "siteUrl": "https://www.aznews.tv/",
    "headlines": [
      "SWEDEN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS STOCKHOLM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "se-DiTVse-1",
    "name": "Di TV",
    "network": "Di TV Broadcast Service",
    "country": "Sweden",
    "city": "Stockholm",
    "lat": 59.3793,
    "lon": 18.1186,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cdn0-03837-liveedge0.dna.ip-only.net/03837-liveedge0/smil:03837-tx4/playlist.m3u8",
    "siteUrl": "https://www.di.se/ditv/",
    "headlines": [
      "SWEDEN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS STOCKHOLM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "se-ExpressenTVse-2",
    "name": "Expressen TV",
    "network": "Expressen TV Broadcast Service",
    "country": "Sweden",
    "city": "Stockholm",
    "lat": 59.429300000000005,
    "lon": 18.1686,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://cdn0-03837-liveedge0.dna.ip-only.net/03837-liveedge0/smil:03837-tx2/playlist.m3u8",
    "siteUrl": "https://www.google.com/search?q=Expressen%20TV%20news",
    "headlines": [
      "SWEDEN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS STOCKHOLM",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sk-24sk-0",
    "name": ":24",
    "network": ":24 Broadcast Service",
    "country": "Slovakia",
    "city": "Bratislava",
    "lat": 48.1486,
    "lon": 17.1077,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://88.212.15.27/live/test_trojka_25p/playlist.m3u8",
    "siteUrl": "http://www.rtvs.sk/televizia/tv",
    "headlines": [
      "SLOVAKIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRATISLAVA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sk-AntikInfoTVsk-1",
    "name": "Antik Info TV",
    "network": "Antik Info TV Broadcast Service",
    "country": "Slovakia",
    "city": "Bratislava",
    "lat": 48.1986,
    "lon": 17.157700000000002,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://dash4.antik.sk/live/test_infokanal_tizen/playlist.m3u8",
    "siteUrl": "https://www.google.com/search?q=Antik%20Info%20TV%20news",
    "headlines": [
      "SLOVAKIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BRATISLAVA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sn-SunuLabelTVsn-0",
    "name": "SunuLabel TV",
    "network": "SunuLabel TV Broadcast Service",
    "country": "Senegal",
    "city": "Dakar",
    "lat": 14.7167,
    "lon": -17.4677,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live3.acangroup.org:1929/publiclive/sunulabel/playlist.m3u8",
    "siteUrl": "https://www.labeltelevision.com/direct-sunulabel-tv",
    "headlines": [
      "SENEGAL NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DAKAR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sv-TribunaTVsv-0",
    "name": "Tribuna TV",
    "network": "Tribuna TV Broadcast Service",
    "country": "El Salvador",
    "city": "San Salvador",
    "lat": 13.6929,
    "lon": -89.2182,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cloudflare.streamgato.us:3300/live/tribunatvlive.m3u8",
    "siteUrl": "https://www.tribunatv.us/",
    "headlines": [
      "EL SALVADOR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SAN SALVADOR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sv-TVMElSalvadorsv-1",
    "name": "TVM El Salvador",
    "network": "TVM El Salvador Broadcast Service",
    "country": "El Salvador",
    "city": "San Salvador",
    "lat": 13.7429,
    "lon": -89.1682,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://twitch-m3u8.bastypro112.workers.dev/tvm_esa/index.m3u8",
    "siteUrl": "https://tvm.com.sv/",
    "headlines": [
      "EL SALVADOR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SAN SALVADOR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sv-TVMElSalvadorsv-2",
    "name": "TVM El Salvador",
    "network": "TVM El Salvador Broadcast Service",
    "country": "El Salvador",
    "city": "San Salvador",
    "lat": 13.7929,
    "lon": -89.1182,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://201.247.102.189/tmp_hls/stream/index.m3u8",
    "siteUrl": "https://tvm.com.sv/",
    "headlines": [
      "EL SALVADOR NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SAN SALVADOR",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sy-AlalamNewsChannelSyriasy-0",
    "name": "Alalam News Channel Syria",
    "network": "Alalam News Channel Syria Broadcast Service",
    "country": "Syria",
    "city": "Damascus",
    "lat": 33.5138,
    "lon": 36.2765,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://live2.alalam.ir/live/Alalam/index.m3u8",
    "siteUrl": "https://alalamsyria.ir/",
    "headlines": [
      "SYRIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DAMASCUS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sy-AlikhbariaSyriasy-1",
    "name": "Alikhbaria Syria",
    "network": "Alikhbaria Syria Broadcast Service",
    "country": "Syria",
    "city": "Damascus",
    "lat": 33.5638,
    "lon": 36.326499999999996,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://185.9.2.18/chid_423/index.m3u8",
    "siteUrl": "http://alikhbaria.net/",
    "headlines": [
      "SYRIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DAMASCUS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "sy-HalabTodayTVsy-2",
    "name": "Halab Today TV",
    "network": "Halab Today TV Broadcast Service",
    "country": "Syria",
    "city": "Damascus",
    "lat": 33.613800000000005,
    "lon": 36.3765,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://halabtoday-live.lg.mncdn.com/halabtoday/livestream/playlist.m3u8",
    "siteUrl": "https://halabtodaytv.net/",
    "headlines": [
      "SYRIA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS DAMASCUS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tg-NWInfo2tg-0",
    "name": "NW Info 2",
    "network": "NW Info 2 Broadcast Service",
    "country": "Togo",
    "city": "Lom\xE9",
    "lat": 6.1375,
    "lon": 1.2123,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://hls.newworldtv.com/nw-info-2/video/live.m3u8",
    "siteUrl": "https://www.newworldtv.com/",
    "headlines": [
      "TOGO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LOM\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tg-NWInfotg-1",
    "name": "NW Info",
    "network": "NW Info Broadcast Service",
    "country": "Togo",
    "city": "Lom\xE9",
    "lat": 6.1875,
    "lon": 1.2623,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://hls.newworldtv.com/nw-info/video/live.m3u8",
    "siteUrl": "https://www.newworldtv.com/",
    "headlines": [
      "TOGO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS LOM\xC9",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "th-13SiamThaith-0",
    "name": "13 Siam Thai",
    "network": "13 Siam Thai Broadcast Service",
    "country": "Thailand",
    "city": "Bangkok",
    "lat": 13.7563,
    "lon": 100.5018,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.x2.co.th/live/13livetv-th.m3u8",
    "siteUrl": "https://www.13livetv.com/",
    "headlines": [
      "THAILAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BANGKOK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "th-JKN18th-1",
    "name": "JKN 18",
    "network": "JKN 18 Broadcast Service",
    "country": "Thailand",
    "city": "Bangkok",
    "lat": 13.8063,
    "lon": 100.5518,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://lb1-live-mv.v2h-cdn.com/hls/ffda/jkn18/jkn18.m3u8",
    "siteUrl": "https://www.jknglobal.com/",
    "headlines": [
      "THAILAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BANGKOK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "th-NationTVth-2",
    "name": "Nation TV",
    "network": "Nation TV Broadcast Service",
    "country": "Thailand",
    "city": "Bangkok",
    "lat": 13.8563,
    "lon": 100.6018,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live-us1.thaimomo.com/live-as/chNation-3/playlist.m3u8",
    "siteUrl": "https://www.nationtv.tv/",
    "headlines": [
      "THAILAND NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS BANGKOK",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tr-24TVtr-0",
    "name": "24 TV",
    "network": "24 TV Broadcast Service",
    "country": "Turkey",
    "city": "Ankara",
    "lat": 39.9334,
    "lon": 32.8597,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://tv.ensonhaber.com/tv24/tv24.m3u8",
    "siteUrl": "https://www.yirmidort.tv/",
    "headlines": [
      "TURKEY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ANKARA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tr-24TVtr-1",
    "name": "24 TV",
    "network": "24 TV Broadcast Service",
    "country": "Turkey",
    "city": "Ankara",
    "lat": 39.983399999999996,
    "lon": 32.909699999999994,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://turkmedya-live.ercdn.net/tv24/tv24.m3u8",
    "siteUrl": "https://www.yirmidort.tv/",
    "headlines": [
      "TURKEY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ANKARA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tr-360tr-2",
    "name": "360",
    "network": "360 Broadcast Service",
    "country": "Turkey",
    "city": "Ankara",
    "lat": 40.0334,
    "lon": 32.9597,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://turkmedya-live.ercdn.net/tv360/tv360.m3u8",
    "siteUrl": "https://www.tv360.com.tr/",
    "headlines": [
      "TURKEY NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS ANKARA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tw-CTSNewstw-0",
    "name": "CTS News",
    "network": "CTS News Broadcast Service",
    "country": "Taiwan",
    "city": "Taipei",
    "lat": 25.033,
    "lon": 121.5654,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://seb.sason.top/sc/hsxw_fhd.m3u8",
    "siteUrl": "https://www.cts.com.tw/",
    "headlines": [
      "TAIWAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TAIPEI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tw-EBCFinancialNewstw-1",
    "name": "EBC Financial News",
    "network": "EBC Financial News Broadcast Service",
    "country": "Taiwan",
    "city": "Taipei",
    "lat": 25.083000000000002,
    "lon": 121.6154,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://seb.sason.top/sc/dscjxw_fhd.m3u8",
    "siteUrl": "https://fnc.ebc.net.tw/",
    "headlines": [
      "TAIWAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TAIPEI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "tw-EBCNewstw-2",
    "name": "EBC News",
    "network": "EBC News Broadcast Service",
    "country": "Taiwan",
    "city": "Taipei",
    "lat": 25.133000000000003,
    "lon": 121.66539999999999,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://seb.sason.top/sc/dsxw_fhd.m3u8",
    "siteUrl": "https://news.ebc.net.tw/",
    "headlines": [
      "TAIWAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TAIPEI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ua-24Kanalua-0",
    "name": "24 Kanal",
    "network": "24 Kanal Broadcast Service",
    "country": "Ukraine",
    "city": "Kyiv",
    "lat": 50.4501,
    "lon": 30.5234,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://cdn15.live-tv.cloud/ua_infinitas_tv/news24-abr/playlist.m3u8",
    "siteUrl": "https://24tv.ua/online/",
    "headlines": [
      "UKRAINE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KYIV",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ua-100NEWSua-1",
    "name": "100% NEWS",
    "network": "100% NEWS Broadcast Service",
    "country": "Ukraine",
    "city": "Kyiv",
    "lat": 50.500099999999996,
    "lon": 30.5734,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "http://85.238.112.40:8810/hls_sec/239.33.16.32-.m3u8",
    "siteUrl": "https://www.100news.tv/",
    "headlines": [
      "UKRAINE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KYIV",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ua-ApostropheTVua-2",
    "name": "Apostrophe TV",
    "network": "Apostrophe TV Broadcast Service",
    "country": "Ukraine",
    "city": "Kyiv",
    "lat": 50.5501,
    "lon": 30.6234,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://ext.cdn.nashnet.tv/228.0.2.165/index.m3u8",
    "siteUrl": "https://apostrophe.ua/ua/tv",
    "headlines": [
      "UKRAINE NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS KYIV",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "uz-Ozbekiston24uz-0",
    "name": "Ozbekiston 24",
    "network": "Ozbekiston 24 Broadcast Service",
    "country": "Uzbekistan",
    "city": "Tashkent",
    "lat": 41.2995,
    "lon": 69.2401,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://stream8.cinerama.uz/1011/tracks-v1a1/playlist.m3u8",
    "siteUrl": "http://uzbekistan24.uz/",
    "headlines": [
      "UZBEKISTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TASHKENT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "uz-UzReportTVuz-1",
    "name": "UzReport TV",
    "network": "UzReport TV Broadcast Service",
    "country": "Uzbekistan",
    "city": "Tashkent",
    "lat": 41.3495,
    "lon": 69.2901,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://stream8.cinerama.uz/1015/tracks-v1a1/playlist.m3u8",
    "siteUrl": "https://uzreport.news/",
    "headlines": [
      "UZBEKISTAN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS TASHKENT",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ve-CanalIve-0",
    "name": "Canal I",
    "network": "Canal I Broadcast Service",
    "country": "Venezuela",
    "city": "Caracas",
    "lat": 10.4806,
    "lon": -66.9036,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://streaming.canal-i.com/canal-i/live/master.m3u8",
    "siteUrl": "http://canal-i.com/",
    "headlines": [
      "VENEZUELA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CARACAS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ve-Telesurve-1",
    "name": "Telesur",
    "network": "Telesur Broadcast Service",
    "country": "Venezuela",
    "city": "Caracas",
    "lat": 10.530600000000002,
    "lon": -66.8536,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://mblenmain01.telesur.ultrabase.net/mblivev3/480p/playlist.m3u8",
    "siteUrl": "https://www.telesurtv.net/",
    "headlines": [
      "VENEZUELA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CARACAS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ve-Telesurve-2",
    "name": "Telesur",
    "network": "Telesur Broadcast Service",
    "country": "Venezuela",
    "city": "Caracas",
    "lat": 10.5806,
    "lon": -66.8036,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://mblenmain01.telesur.ultrabase.net/mblivev3/hd/playlist.m3u8",
    "siteUrl": "https://www.telesurtv.net/",
    "headlines": [
      "VENEZUELA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS CARACAS",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "vn-DongNaiTV1vn-0",
    "name": "Dong Nai TV 1",
    "network": "Dong Nai TV 1 Broadcast Service",
    "country": "Vietnam",
    "city": "Hanoi",
    "lat": 21.0285,
    "lon": 105.8542,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://118.107.85.4:1935/live/smil:DNTV1.smil/chunklist.m3u8",
    "siteUrl": "http://dnrtv.org.vn/",
    "headlines": [
      "VIETNAM NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HANOI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "vn-DongNaiTV1vn-1",
    "name": "Dong Nai TV 1",
    "network": "Dong Nai TV 1 Broadcast Service",
    "country": "Vietnam",
    "city": "Hanoi",
    "lat": 21.078500000000002,
    "lon": 105.9042,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://vtvgolive-ott3.vtvdigital.vn/live/dongnai1tv/chunklist_2.m3u8",
    "siteUrl": "http://dnrtv.org.vn/",
    "headlines": [
      "VIETNAM NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HANOI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "vn-HTV9vn-2",
    "name": "HTV9",
    "network": "HTV9 Broadcast Service",
    "country": "Vietnam",
    "city": "Hanoi",
    "lat": 21.128500000000003,
    "lon": 105.9542,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://live.fptplay53.net/epzhd1/htv9hd_vhls.smil/chunklist.m3u8",
    "siteUrl": "https://htv.com.vn/",
    "headlines": [
      "VIETNAM NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS HANOI",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "xk-ATVxk-0",
    "name": "ATV",
    "network": "ATV Broadcast Service",
    "country": "Kosovo",
    "city": "Pristina",
    "lat": 42.6629,
    "lon": 21.1655,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "http://5.254.89.106/8709/index.m3u8",
    "siteUrl": "https://atvlive.tv/",
    "headlines": [
      "KOSOVO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRISTINA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "xk-Kohavisionxk-1",
    "name": "Kohavision",
    "network": "Kohavision Broadcast Service",
    "country": "Kosovo",
    "city": "Pristina",
    "lat": 42.7129,
    "lon": 21.215500000000002,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://gjirafa-video-live.gjirafa.net/gjvideo-livestream/lj9-pxm-o53-rp0/tracks-v4a1/mono.m3u8",
    "siteUrl": "https://www.koha.net/ktv/",
    "headlines": [
      "KOSOVO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRISTINA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "xk-Kohavisionxk-2",
    "name": "Kohavision",
    "network": "Kohavision Broadcast Service",
    "country": "Kosovo",
    "city": "Pristina",
    "lat": 42.7629,
    "lon": 21.265500000000003,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "http://5.254.89.106/8705/index.m3u8",
    "siteUrl": "https://www.koha.net/ktv/",
    "headlines": [
      "KOSOVO NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRISTINA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ye-AlMasirahye-0",
    "name": "Al Masirah",
    "network": "Al Masirah Broadcast Service",
    "country": "Yemen",
    "city": "Sana'a",
    "lat": 15.3694,
    "lon": 44.191,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://live.cdnbridge.tv/Almasirah/Almasirah_all/playlist.m3u8",
    "siteUrl": "https://www.masirahtv.net/",
    "headlines": [
      "YEMEN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANA'A",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "ye-AlMasirahMubacherye-1",
    "name": "Al Masirah Mubacher",
    "network": "Al Masirah Mubacher Broadcast Service",
    "country": "Yemen",
    "city": "Sana'a",
    "lat": 15.419400000000001,
    "lon": 44.241,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://live2.cdnbridge.tv/AlmasirahMubasher/Mubasher_All/playlist.m3u8",
    "siteUrl": "https://www.masirahtv.net/",
    "headlines": [
      "YEMEN NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS SANA'A",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "za-etvNewsSportza-0",
    "name": "e.tv News & Sport",
    "network": "e.tv News & Sport Broadcast Service",
    "country": "South Africa",
    "city": "Pretoria",
    "lat": -25.7479,
    "lon": 28.2293,
    "intensity": "BREAKING",
    "color": "#ff3355",
    "streamType": "hls",
    "streamUrl": "https://origin2.afxp.telemedia.co.za/abr_kapang/enterepreneur/playlist.m3u8",
    "siteUrl": "https://www.openview.co.za/channel/open-news",
    "headlines": [
      "SOUTH AFRICA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRETORIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "za-LN24SAza-1",
    "name": "LN24SA",
    "network": "LN24SA Broadcast Service",
    "country": "South Africa",
    "city": "Pretoria",
    "lat": -25.6979,
    "lon": 28.2793,
    "intensity": "HIGH",
    "color": "#ffaa00",
    "streamType": "hls",
    "streamUrl": "https://cdnstack.internetmultimediaonline.org/ln24/ln24.stream/playlist.m3u8",
    "siteUrl": "https://ln24sa.com/",
    "headlines": [
      "SOUTH AFRICA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRETORIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  },
  {
    "id": "za-SABCLehaeza-2",
    "name": "SABC Lehae",
    "network": "SABC Lehae Broadcast Service",
    "country": "South Africa",
    "city": "Pretoria",
    "lat": -25.6479,
    "lon": 28.3293,
    "intensity": "STANDARD",
    "color": "#00e5ff",
    "streamType": "hls",
    "streamUrl": "https://sabctretalh.cdn.mangomolo.com/lehae/smil:lehae.stream.smil/master.m3u8",
    "siteUrl": "https://sabc-plus.com/",
    "headlines": [
      "SOUTH AFRICA NATIONAL BROADCASTER MONITORS LIVE DEVELOPMENTS",
      "OFFICIAL TELEMETRY & STRATEGIC TRADE UPDATE ACROSS PRETORIA",
      "INTERNATIONAL DIPLOMATIC & REGIONAL ENERGY BULLETINS CONFIRMED"
    ],
    "lastUpdated": "2026-09-09T17:35:51.961Z"
  }
];
async function onRequestGet8(context) {
  const allowStreams = context?.env?.ALLOW_LIVE_NEWS_STREAMS === "true";
  const channels = GLOBAL_NEWS_CHANNELS.map((c) => {
    if (!allowStreams) {
      return {
        ...c,
        streamUrl: "",
        streamType: "none"
      };
    }
    return c;
  });
  return new Response(JSON.stringify({
    status: "ok",
    totalChannels: channels.length,
    totalCountries: new Set(channels.map((c) => c.country)).size,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    liveStreamsAllowed: allowStreams,
    channels
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60"
    }
  });
}
__name(onRequestGet8, "onRequestGet");

// api/geo/satellites.ts
var onRequestGet9 = /* @__PURE__ */ __name(async () => {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544", {
      headers: { "User-Agent": "Cave-Vault-Intel/1.0" }
    });
    if (!res.ok)
      throw new Error(`ISS upstream error ${res.status}`);
    const data = await res.json();
    return new Response(JSON.stringify({
      name: "ISS (ZARYA)",
      id: 25544,
      lat: Number(data.latitude),
      lon: Number(data.longitude),
      altitude_km: Number(data.altitude),
      velocity_kmh: Number(data.velocity),
      visibility: data.visibility || "daylight",
      footprint_km: Number(data.footprint),
      timestamp: data.timestamp
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=5"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// api/vault/session.ts
var onRequestGet10 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const session = await validateSession(request, env);
  if (!session) {
    const resp2 = {
      authenticated: false,
      displayName: null,
      accessLevel: "VISITOR",
      capabilities: {
        roam: false,
        tour: false,
        ls1: false,
        ls2Write: false,
        privateResume: false,
        moderation: false,
        ownerControls: false
      }
    };
    return jsonOk(resp2);
  }
  let displayName = null;
  if (session.userId) {
    const user = await env.WORKSHOP_DB.prepare(
      `SELECT display_name FROM vault_users WHERE id = ? AND status = 'active' LIMIT 1`
    ).bind(session.userId).first();
    displayName = user?.display_name ?? null;
  }
  const resp = {
    authenticated: true,
    displayName,
    accessLevel: session.accessLevel,
    capabilities: session.capabilities
  };
  return jsonOk(resp);
}, "onRequestGet");
var onRequestDelete3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const session = await validateSession(request, env);
  if (!session) {
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": clearSessionCookie() }
    });
  }
  const now = Math.floor(Date.now() / 1e3);
  await env.WORKSHOP_DB.prepare(
    `UPDATE vault_sessions SET revoked_at = ? WHERE id = ?`
  ).bind(now, session.sessionId).run();
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);
  await writeAuditEvent(env, {
    userId: session.userId,
    deviceId: session.deviceId,
    sessionId: session.sessionId,
    event: "SESSION_REVOKED",
    result: "SUCCESS",
    ipHash
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie()
    }
  });
}, "onRequestDelete");

// api/notes/[id].ts
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
var MAX_MESSAGE_LEN = 280;
var MAX_AUTHOR_LEN = 24;
var MAX_INK_BYTES = 12288;
var onRequestGet11 = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const id = context.params.id;
    if (!db || !id) {
      return new Response(JSON.stringify({ error: "NOTE_NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const row = await db.prepare(
      `SELECT id, author_name, message, ink_strokes_json, color_theme, paper_theme, pos_x, pos_y, created_at, updated_at
         FROM guestbook_entries
         WHERE id = ? AND is_hidden = 0`
    ).bind(id).first();
    if (!row) {
      return new Response(JSON.stringify({ error: "NOTE_NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    let inkStrokes = [];
    if (row.ink_strokes_json) {
      try {
        inkStrokes = typeof row.ink_strokes_json === "string" ? JSON.parse(row.ink_strokes_json) : row.ink_strokes_json;
      } catch {
        inkStrokes = [];
      }
    }
    return new Response(
      JSON.stringify({
        id: row.id,
        author: row.author_name || "ANONYMOUS",
        message: row.message || "",
        inkStrokes,
        colorTheme: row.color_theme || "cyan",
        paperTheme: row.paper_theme || "yellow",
        posX: row.pos_x || 0,
        posY: row.pos_y || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=4, stale-while-revalidate=12"
        }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");
var onRequestPut = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const id = context.params.id;
    if (!db || !id) {
      return new Response(JSON.stringify({ error: "DATABASE_UNAVAILABLE" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }
    const authorToken = context.request.headers.get("x-author-token");
    if (!authorToken) {
      return new Response(JSON.stringify({ error: "AUTHOR_TOKEN_REQUIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const row = await db.prepare("SELECT token_hash, is_hidden FROM guestbook_entries WHERE id = ?").bind(id).first();
    if (!row || row.is_hidden === 1) {
      return new Response(JSON.stringify({ error: "NOTE_NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!row.token_hash) {
      return new Response(JSON.stringify({ error: "UNOWNED_ENTRY_MUTATION_RESTRICTED" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    const computedTokenHash = await sha256(authorToken);
    if (computedTokenHash !== row.token_hash) {
      return new Response(JSON.stringify({ error: "INVALID_AUTHOR_TOKEN" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    let body;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: "INVALID_JSON_PAYLOAD" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const author = body.author !== void 0 ? String(body.author).trim().slice(0, MAX_AUTHOR_LEN) : void 0;
    const message = body.message !== void 0 ? String(body.message) : void 0;
    const colorTheme = ["cyan", "amber", "green", "white"].includes(body.colorTheme) ? body.colorTheme : void 0;
    const paperTheme = ["yellow", "pink", "cyan", "green"].includes(body.paperTheme) ? body.paperTheme : void 0;
    if (message !== void 0 && message.length > MAX_MESSAGE_LEN) {
      return new Response(JSON.stringify({ error: `MESSAGE_EXCEEDS_MAX_LEN_${MAX_MESSAGE_LEN}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    let inkJson = void 0;
    if (body.inkStrokes && Array.isArray(body.inkStrokes)) {
      inkJson = JSON.stringify(body.inkStrokes);
    } else if (typeof body.ink_strokes_json === "string") {
      inkJson = body.ink_strokes_json;
    }
    if (inkJson !== void 0) {
      const inkBytes = new TextEncoder().encode(inkJson).length;
      if (inkBytes > MAX_INK_BYTES) {
        return new Response(JSON.stringify({ error: `INK_DATA_EXCEEDS_${MAX_INK_BYTES}_BYTES` }), {
          status: 413,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    const now = Math.floor(Date.now() / 1e3);
    const updates = ["updated_at = ?"];
    const params = [now];
    if (author !== void 0) {
      updates.push("author_name = ?");
      params.push(author);
    }
    if (message !== void 0) {
      updates.push("message = ?");
      params.push(message);
    }
    if (inkJson !== void 0) {
      updates.push("ink_strokes_json = ?");
      params.push(inkJson);
    }
    if (colorTheme !== void 0) {
      updates.push("color_theme = ?");
      params.push(colorTheme);
    }
    if (paperTheme !== void 0) {
      updates.push("paper_theme = ?");
      params.push(paperTheme);
    }
    if (body.posX !== void 0 && !isNaN(Number(body.posX))) {
      updates.push("pos_x = ?");
      params.push(Number(body.posX));
    }
    if (body.posY !== void 0 && !isNaN(Number(body.posY))) {
      updates.push("pos_y = ?");
      params.push(Number(body.posY));
    }
    params.push(id);
    await db.prepare(`UPDATE guestbook_entries SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    return new Response(
      JSON.stringify({
        success: true,
        id,
        updatedAt: now
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPut");

// api/state/[namespace].ts
var onRequestGet12 = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    const namespace = context.params.namespace;
    if (!db || !namespace) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const latestRow = await db.prepare(
      "SELECT updated_at FROM interaction_state WHERE namespace = ? ORDER BY updated_at DESC LIMIT 1"
    ).bind(namespace).first();
    const latest = latestRow?.updated_at ?? 0;
    const etag = `"${namespace}-${latest}"`;
    if (context.request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304 });
    }
    const { results } = await db.prepare("SELECT element_id, data FROM interaction_state WHERE namespace = ?").bind(namespace).all();
    const snapshot = {};
    for (const row of results || []) {
      try {
        snapshot[row.element_id] = JSON.parse(row.data);
      } catch {
        snapshot[row.element_id] = row.data;
      }
    }
    return new Response(JSON.stringify(snapshot), {
      headers: {
        "Content-Type": "application/json",
        "ETag": etag,
        "Cache-Control": "public, max-age=2, stale-while-revalidate=8"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// api/notes/index.ts
async function sha2562(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha2562, "sha256");
var MAX_MESSAGE_LEN2 = 280;
var MAX_AUTHOR_LEN2 = 24;
var MAX_INK_BYTES2 = 12288;
var MAX_ACTIVE_NOTES = 500;
var RATE_LIMIT_WINDOW = 600;
var RATE_LIMIT_MAX_REQ = 25;
var onRequestGet13 = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify({ notes: [], total: 0, page: 0, fallback: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const url = new URL(context.request.url);
    const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
    const limit = Math.min(32, Math.max(1, parseInt(url.searchParams.get("limit") || "16", 10) || 16));
    const offset = page * limit;
    const latestRow = await db.prepare("SELECT updated_at FROM guestbook_entries WHERE is_hidden = 0 ORDER BY updated_at DESC LIMIT 1").first();
    const latest = latestRow?.updated_at ?? 0;
    const etag = `"notes-p${page}-${latest}"`;
    if (context.request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304 });
    }
    const { results } = await db.prepare(
      `SELECT id, author_name, message, ink_strokes_json, color_theme, paper_theme, pos_x, pos_y, created_at, updated_at
         FROM guestbook_entries
         WHERE is_hidden = 0
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    const countRow = await db.prepare("SELECT COUNT(*) as cnt FROM guestbook_entries WHERE is_hidden = 0").first();
    const total = countRow?.cnt ?? (results?.length || 0);
    const notes = (results || []).map((row) => {
      let inkStrokes = [];
      if (row.ink_strokes_json) {
        try {
          inkStrokes = typeof row.ink_strokes_json === "string" ? JSON.parse(row.ink_strokes_json) : row.ink_strokes_json;
        } catch {
          inkStrokes = [];
        }
      }
      return {
        id: row.id,
        author: row.author_name || "ANONYMOUS",
        message: row.message || "",
        inkStrokes,
        colorTheme: row.color_theme || "cyan",
        paperTheme: row.paper_theme || "yellow",
        posX: row.pos_x || 0,
        posY: row.pos_y || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
    return new Response(JSON.stringify({ notes, total, page, limit }), {
      headers: {
        "Content-Type": "application/json",
        "ETag": etag,
        "Cache-Control": "public, max-age=2, stale-while-revalidate=8"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");
var onRequestPost19 = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "DATABASE_UNAVAILABLE" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }
    const clientIp = context.request.headers.get("cf-connecting-ip") || context.request.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipSalt = "vault-01-salt-2026";
    const ipHash = await sha2562(clientIp + ":" + ipSalt);
    const rateKey = await sha2562(ipHash + ":notes_post");
    const now = Math.floor(Date.now() / 1e3);
    const limitRow = await db.prepare("SELECT request_count, window_expires_at FROM rate_limits WHERE key_hash = ?").bind(rateKey).first();
    if (limitRow && limitRow.window_expires_at > now) {
      if (limitRow.request_count >= RATE_LIMIT_MAX_REQ) {
        return new Response(JSON.stringify({ error: "RATE_LIMIT_EXCEEDED" }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
      await db.prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE key_hash = ?").bind(rateKey).run();
    } else {
      await db.prepare("INSERT OR REPLACE INTO rate_limits (key_hash, request_count, window_expires_at) VALUES (?, 1, ?)").bind(rateKey, now + RATE_LIMIT_WINDOW).run();
    }
    let body;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: "INVALID_JSON_PAYLOAD" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const author = String(body.author || "ANONYMOUS").trim().slice(0, MAX_AUTHOR_LEN2);
    const message = String(body.message || "");
    const colorTheme = ["cyan", "amber", "green", "white"].includes(body.colorTheme) ? body.colorTheme : "cyan";
    const paperTheme = ["yellow", "pink", "cyan", "green"].includes(body.paperTheme) ? body.paperTheme : "yellow";
    const posX = typeof body.posX === "number" ? Math.max(-0.1, Math.min(0.1, body.posX)) : (Math.random() - 0.5) * 0.06;
    const posY = typeof body.posY === "number" ? Math.max(-0.1, Math.min(0.1, body.posY)) : (Math.random() - 0.5) * 0.06;
    if (message.length > MAX_MESSAGE_LEN2) {
      return new Response(JSON.stringify({ error: `MESSAGE_EXCEEDS_MAX_LEN_${MAX_MESSAGE_LEN2}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    let inkJson = "[]";
    if (body.inkStrokes && Array.isArray(body.inkStrokes)) {
      inkJson = JSON.stringify(body.inkStrokes);
    } else if (typeof body.ink_strokes_json === "string") {
      inkJson = body.ink_strokes_json;
    }
    const inkBytes = new TextEncoder().encode(inkJson).length;
    if (inkBytes > MAX_INK_BYTES2) {
      return new Response(JSON.stringify({ error: `INK_DATA_EXCEEDS_${MAX_INK_BYTES2}_BYTES` }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      });
    }
    const clientToken = context.request.headers.get("x-author-token") || body.clientToken || crypto.randomUUID();
    const tokenHash = await sha2562(clientToken);
    const noteId = `note-${crypto.randomUUID()}`;
    await db.prepare(
      `INSERT INTO guestbook_entries (
           id, author_name, visitor_tier, message, ink_strokes_json,
           color_theme, paper_theme, pos_x, pos_y, ip_hash, token_hash,
           created_at, updated_at, is_hidden
         ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      noteId,
      author,
      message,
      inkJson,
      colorTheme,
      paperTheme,
      posX,
      posY,
      ipHash,
      tokenHash,
      now,
      now
    ).run();
    await db.prepare(
      `UPDATE guestbook_entries SET is_hidden = 1
         WHERE id IN (
           SELECT id FROM guestbook_entries
           WHERE is_hidden = 0
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`
    ).bind(MAX_ACTIVE_NOTES).run();
    const MAX_TOTAL_RETAINED = 2e3;
    await db.prepare(
      `DELETE FROM guestbook_entries
         WHERE id IN (
           SELECT id FROM guestbook_entries
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`
    ).bind(MAX_TOTAL_RETAINED).run();
    return new Response(
      JSON.stringify({
        success: true,
        id: noteId,
        createdAt: now
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/portfolio.ts
var DEFAULT_TEMPLATES = [
  {
    id: "quant-research",
    name: "QUANT / ML RESEARCH",
    layout_spec: {
      sections: ["education", "projects", "skills", "certifications", "experience"],
      columns: 1,
      accent: "#39d6ff"
    }
  },
  {
    id: "fullstack-ai",
    name: "FULL-STACK AI / PROD",
    layout_spec: {
      sections: ["experience", "projects", "skills", "certifications", "education"],
      columns: 1,
      accent: "#4dff8a"
    }
  },
  {
    id: "robotics-mech",
    name: "ROBOTICS & MECH-ENG",
    layout_spec: {
      sections: ["education", "projects", "skills", "certifications", "experience"],
      columns: 1,
      accent: "#ffb15c"
    }
  },
  {
    id: "exec-clean",
    name: "EXECUTIVE / CLEAN",
    layout_spec: {
      sections: ["experience", "projects", "education", "certifications", "skills"],
      columns: 1,
      accent: "#c084fc"
    }
  }
];
var DEFAULT_PORTFOLIO_ITEMS = [
  // Education
  {
    id: "edu:iitg",
    kind: "education",
    title: "Indian Institute of Technology Guwahati",
    summary: "B.Sc. (Hons) in Data Science and Artificial Intelligence \xB7 CPI: 9.25/10.0 (Upto Trimester VIII, peak 9.77 in Tri V) \xB7 Currently enrolled in 10th Trimester \xB7 Coursework: Machine Learning, Statistical Inference, Linear Algebra, Optimization, DSA, Probability & Stochastic Processes.",
    proof_url: "https://iitg.ac.in/acad/admission/online/Bsc_DSAI_Curriculum.pdf",
    proof_type: "transcript",
    issuer: "IIT Guwahati",
    date_from: "2023-10",
    date_to: "2027-08",
    tags: ["Data Science", "Artificial Intelligence", "Machine Learning", "Optimization", "IIT"],
    weight: 100
  },
  {
    id: "edu:djsce",
    kind: "education",
    title: "Dwarkadas J. Sanghvi College of Engineering",
    summary: "B.Tech (Hons) in Mechanical Engineering and Robotics \xB7 CGPA: 8.23/10.0 (Upto Semester VI) \xB7 Currently enrolled in 7th Semester \xB7 Grade O in AI/ML, CAD/CAM & FEA Labs; Grade A+ in AI & ML \xB7 Coursework: Applied Thermodynamics, Fluid Mechanics, CAD/CAM, CNC, FEA, Advanced Robotics.",
    proof_url: "https://www.djsce.ac.in",
    proof_type: "transcript",
    issuer: "DJSCE",
    date_from: "2023-08",
    date_to: "2027-08",
    tags: ["Mechanical Engineering", "Robotics", "CAD/CAM", "Thermodynamics", "CNC"],
    weight: 95
  },
  {
    id: "edu:kc-college",
    kind: "education",
    title: "Kishinchand Chellaram (K.C.) College \u2014 HSC Class 12",
    summary: "Higher Secondary Certificate (HSC) Class 12 (2023) \xB7 Marks: 452 / 600 \xB7 Percentage: 75.33% \xB7 Science & Electronics Stream (PCMEEm).",
    proof_url: "https://kccollege.edu.in",
    proof_type: "transcript",
    issuer: "K.C. College",
    date_from: "2021",
    date_to: "2023",
    tags: ["HSC", "Class 12", "Academics", "High School", "Mathematics"],
    weight: 80
  },
  {
    id: "edu:activity-school",
    kind: "education",
    title: "Activity High School \u2014 ICSE Class 10",
    summary: "Indian Certificate of Secondary Education (ICSE) Class 10 (2021) \xB7 Marks: 448 / 500 \xB7 Percentage: 89.60%.",
    proof_url: "https://activityhighschool.com",
    proof_type: "transcript",
    issuer: "Activity High School",
    date_from: "2019",
    date_to: "2021",
    tags: ["ICSE", "Class 10", "Academics", "School"],
    weight: 75
  },
  // Experience
  {
    id: "exp:the-key",
    kind: "experience",
    title: "Marketing Operations Intern \u2014 The Key",
    summary: "Collection and uploading of data by managing multiple retail store owners/staff, while liaising with tech-team for app development (Aug 2022 \u2013 Sep 2022, Mumbai, India).",
    proof_url: "https://linkedin.com/in/priyansh-gadia-b7645320b",
    proof_type: "link",
    issuer: "The Key",
    date_from: "2022-08",
    date_to: "2022-09",
    tags: ["Marketing Operations", "App Development", "Retail Data", "Coordination"],
    weight: 70
  },
  {
    id: "exp:rotaract-photo",
    kind: "experience",
    title: "Official & Event Photographer \u2014 Rotaract Club of KC College",
    summary: "Official Photographer appointed for Rotaract Club of KC College AGM 2022. Event Photographer for R.E.D. 2022 (Rotaract Mumbai district youth fest hosted at SPIT Andheri). Over 4 years of active field practice across events, portraits, sports, and media.",
    proof_url: "https://kccollege.edu.in",
    proof_type: "link",
    issuer: "Rotaract Club of KC College / Rotaract Mumbai",
    date_from: "2022-07",
    date_to: "2022-12",
    tags: ["Photography", "Event Photography", "Rotaract", "Creative Media"],
    weight: 72
  },
  // Certifications & Specialized Qualifications
  {
    id: "cert:oci-ds",
    kind: "certification",
    title: "Oracle Cloud Infrastructure 2025 Certified Data Science Professional",
    summary: "Certified OCI Data Science Professional (October 2025). Advanced competencies in distributed ML training, MLOps model deployment, data pipelines, and enterprise OCI services.",
    proof_url: "https://catalog-education.oracle.com/ords/certview/sharebadge?id=045EC65FDEB4B83DAFF5596C9995FB467E12374A19E8627EA37A14267A0E737B",
    proof_type: "credential",
    issuer: "Oracle University",
    date_from: "2025-10",
    date_to: "2025-10",
    tags: ["Oracle Cloud", "Data Science", "MLOps", "Pipelines", "Infrastructure"],
    weight: 98
  },
  {
    id: "cert:citi-program",
    kind: "certification",
    title: "Collaborative Institutional Training Initiative (CITI Program)",
    summary: "Human Research & Data or Specimens Only Research (Jul 2025). Massachusetts Institute of Technology Affiliate. Clinical trial data handling, HIPAA, and ethics protocols.",
    proof_url: "https://www.citiprogram.org/verify/?k56a0e057-078f-4fcb-931c-35d6abd67ca3-70963231",
    proof_type: "credential",
    issuer: "MIT Affiliate / CITI",
    date_from: "2025-07",
    date_to: "2025-07",
    tags: ["CITI Program", "Human Subjects", "MIT Affiliate", "Clinical Ethics", "MIMIC-IV"],
    weight: 90
  },
  {
    id: "cert:michiganx-py4e",
    kind: "certification",
    title: "University of Michigan \u2014 Programming for Everybody (Python)",
    summary: "Verified Certificate in Python programming foundations, data structures, conditional execution, and algorithm design from Univ. of Michigan / edX (Charles Severance). Verification ID: cb80bebc7b7044fe85f6a17f2282e12e.",
    proof_url: "https://courses.edx.org/certificates/cb80bebc7b7044fe85f6a17f2282e12e",
    proof_type: "credential",
    issuer: "University of Michigan / edX",
    date_from: "2021",
    date_to: "2021",
    tags: ["Python", "Programming", "University of Michigan", "edX", "Computer Science"],
    weight: 88
  },
  {
    id: "cert:glasgow-cdss",
    kind: "certification",
    title: "Data Mining of Clinical Databases - 1 (CDSS)",
    summary: "Clinical Decision Support Systems (CDSS) & large-scale ICU EHR data mining certification.",
    proof_url: "https://www.gla.ac.uk",
    proof_type: "credential",
    issuer: "University of Glasgow",
    date_from: "2025-07",
    date_to: "2025-07",
    tags: ["Clinical AI", "EHR", "CDSS", "Healthcare", "Data Mining", "Glasgow"],
    weight: 85
  },
  {
    id: "cert:glasgow-dl-ehr",
    kind: "certification",
    title: "Deep Learning in Electronic Health Record",
    summary: "Advanced deep learning models for longitudinal electronic health records, temporal sequence modeling, and clinical risk prediction.",
    proof_url: "https://www.gla.ac.uk",
    proof_type: "credential",
    issuer: "University of Glasgow",
    date_from: "2026",
    date_to: "2026",
    tags: ["Deep Learning", "EHR", "Clinical ML", "Glasgow", "Bioinformatics"],
    weight: 84
  },
  // Projects
  {
    id: "proj:cryptograph",
    kind: "project",
    title: "CryptoGraph Analytics \u2014 Ensemble Forecasting & Real-Time Analytics",
    summary: "Full-stack platform ingesting Binance WebSocket data, computing indicators (RSI, MACD, volatility) for 100+ crypto assets. Ensemble ML pipeline combining Spatio-Temporal GCN for asset correlation, LSTM for sequential patterns, and NeuralProphet for temporal decomposition. Mixture-of-Agents trading swarm with SHAP attribution and Groq LLaMA 3.3.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Self-Directed",
    date_from: "2024",
    date_to: "Present",
    tags: ["Graph Neural Networks", "PyTorch", "FastAPI", "Next.js 14", "WebSockets", "ST-GCN"],
    weight: 100
  },
  {
    id: "proj:rso",
    kind: "project",
    title: "Respiratory Support Optimization \u2014 Biomedical ML Research",
    summary: "Interdisciplinary research developing a machine learning-based approach to detect clinically invisible pressure transients during ICU ventilation. Processed 200 Hz waveforms across 50,920 MIMIC-IV patient records with esophageal pressure ground truth under leave-one-patient-out cross-validation.",
    proof_url: "https://github.com/PriyanshGadia/Respiratory-Support-Optimization",
    proof_type: "repo",
    issuer: "Biomedical ML Research",
    date_from: "2025-12",
    date_to: "Present",
    tags: ["Biomedical ML", "Physiological Waveforms", "MIMIC-IV", "SciPy", "ICU Ventilator"],
    weight: 98
  },
  {
    id: "proj:idp",
    kind: "project",
    title: "Intelligent Document Processing & Insight Engine",
    summary: "Document intelligence platform with content-aware routing: TF-IDF/XGBoost classification, LayoutLMv3 table extraction, DistilBERT sentiment, and LLM streaming. Lazy model loading with LRU caching (~150 MB cold start) and content-hash prediction caching for O(1) repeated inference.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Enterprise AI",
    date_from: "2025",
    date_to: "2026",
    tags: ["LayoutLMv3", "FastAPI", "XGBoost", "DistilBERT", "Document AI", "Ollama"],
    weight: 92
  },
  {
    id: "proj:tesla-prophet",
    kind: "project",
    title: "Tesla Stock Price Prediction using Facebook Prophet",
    summary: "Created a Facebook Prophet Model forecasting the stock price of Tesla 30 days into the future and evaluated using Google Finance automation in Google Sheets.",
    proof_url: "https://coursera.org/verify/U1T7WE8IW6BT",
    proof_type: "credential",
    issuer: "Coursera Project",
    date_from: "2025-04",
    date_to: "2025-04",
    tags: ["Facebook Prophet", "Time-Series", "Google Finance", "Tesla", "Forecasting"],
    weight: 88
  },
  {
    id: "proj:forms-bulk",
    kind: "project",
    title: "Google Forms Bulk Responder",
    summary: "Automatically extracts the structure of a Google Form and submits high-concurrency randomized responses for load testing, fuzzing, and synthetic test-data generation.",
    proof_url: "https://github.com/PriyanshGadia/Google-Forms-Bulk-Responder",
    proof_type: "repo",
    issuer: "Automation Tool",
    date_from: "2026-01",
    date_to: "Present",
    tags: ["Automation", "Reverse Engineering", "Load Testing", "Python", "Testing"],
    weight: 85
  },
  {
    id: "proj:argus",
    kind: "project",
    title: "Argus \u2014 Institutional Quantitative & RegTech OS",
    summary: "11-package monorepo for quant asset management: feature store (path signatures, rough vol), alpha models (Mamba-3 + GAT), and strict anti-overfitting protocol (DSR/PBO, CSCV).",
    proof_url: "https://github.com/PriyanshGadia/Argus",
    proof_type: "repo",
    issuer: "Quant Research",
    date_from: "2025",
    date_to: "Present",
    tags: ["Quantitative Finance", "PyTorch", "Mamba", "GAT", "Risk Budgeting", "RegTech"],
    weight: 98
  },
  {
    id: "proj:physionet",
    kind: "project",
    title: "PhysioNet Challenge 2026 \u2014 Cognitive Impairment Prediction",
    summary: "Predicting cognitive impairment across 6,600 PSG records (3 hospital sites); extracted 120+ sleep/EEG/HRV features with dual-layer age residualization (fage_z + post-hoc gamma) in Dockerized pipeline.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "PhysioNet / CinC",
    date_from: "2026",
    date_to: "Present",
    tags: ["PhysioNet", "LightGBM", "XGBoost", "Docker", "Biomedical ML", "Sleep EEG"],
    weight: 96
  },
  {
    id: "proj:gpt2",
    kind: "project",
    title: "GPT-2 From Scratch \u2014 Autoregressive Transformer in PyTorch",
    summary: "Autoregressive transformer architecture (multi-head causal self-attention, learned positional embeddings, layer normalization, causal masking) implemented end-to-end in pure PyTorch.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Deep Learning Research",
    date_from: "2024",
    date_to: "2024",
    tags: ["PyTorch", "Transformers", "GPT-2", "Attention", "Deep Learning"],
    weight: 90
  },
  {
    id: "proj:cave",
    kind: "project",
    title: "Cave \u2014 VAULT-01 Procedural 3D WebGL Engine",
    summary: "Real-time procedural WebGL engine built without raster assets. Custom GLSL PBR shader stack, raymarched volumetric fog, and interactive tabletop cyberdeck terminals.",
    proof_url: "https://github.com/PriyanshGadia/Cave",
    proof_type: "repo",
    issuer: "Computer Graphics",
    date_from: "2026",
    date_to: "Present",
    tags: ["WebGL", "Three.js", "GLSL", "PBR", "Procedural Geometry"],
    weight: 86
  },
  // Skills & Technical Domains
  {
    id: "skill:languages",
    kind: "skill",
    title: "Languages: Python, SQL, C, C++, Java, R, MATLAB, TypeScript, JavaScript",
    summary: "Production expertise across Python, SQL (PostgreSQL, SQLite), C, C++, Java, R, MATLAB, TypeScript, and modern JavaScript.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Core Languages",
    date_from: "2021",
    date_to: "Present",
    tags: ["Python", "SQL", "C++", "Java", "R", "MATLAB", "TypeScript"],
    weight: 100
  },
  {
    id: "skill:ml-analytics",
    kind: "skill",
    title: "ML & Analytics: PyTorch, scikit-learn, XGBoost, LSTM, ST-GCN, Prophet, SHAP",
    summary: "Deep learning architectures (ST-GCN, LSTM, NeuralProphet), model explainability (SHAP), time-series forecasting, pandas, NumPy, SciPy.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Machine Learning",
    date_from: "2022",
    date_to: "Present",
    tags: ["PyTorch", "scikit-learn", "XGBoost", "LSTM", "ST-GCN", "SHAP", "SciPy"],
    weight: 98
  },
  {
    id: "skill:frameworks-systems",
    kind: "skill",
    title: "Frameworks & Systems: FastAPI, Next.js 14, Docker, Redis, WebSockets",
    summary: "Full-stack production web architectures, async APIs (FastAPI), real-time WebSockets, Redis caching, SQLAlchemy, Prometheus, Sentry observability.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Systems & Cloud",
    date_from: "2023",
    date_to: "Present",
    tags: ["FastAPI", "Next.js 14", "Docker", "Redis", "WebSockets", "Observability"],
    weight: 92
  },
  {
    id: "skill:cad-robotics",
    kind: "skill",
    title: "Machine Design & CAD/CAM: Autodesk (Inventor, Fusion 360), KeyShot, CNC",
    summary: "Parametric mechanical design, Autodesk Inventor, Fusion 360, KeyShot rendering, CNC machining (milling & lathe), Applied Thermodynamics & Fluid Mechanics.",
    proof_url: "https://www.djsce.ac.in",
    proof_type: "link",
    issuer: "Mechanical & Robotics",
    date_from: "2023",
    date_to: "Present",
    tags: ["CAD/CAM", "Autodesk", "Fusion 360", "KeyShot", "CNC", "Robotics"],
    weight: 90
  },
  {
    id: "skill:finance-quant",
    kind: "skill",
    title: "Financial Valuation, Portfolio Analysis & Economical Management",
    summary: "Quantitative risk budgeting, portfolio valuation, econometric modeling, automated financial forecasting pipelines, and market microstructure analysis.",
    proof_url: "https://github.com/PriyanshGadia",
    proof_type: "repo",
    issuer: "Quantitative Finance",
    date_from: "2023",
    date_to: "Present",
    tags: ["Financial Valuation", "Portfolio Analysis", "Econometrics", "Risk Management"],
    weight: 88
  },
  {
    id: "skill:photography",
    kind: "skill",
    title: "Photography & Visual Media (Sam Bagli Mentorship, Adobe Suite)",
    summary: "2 years formal photography study under mentor Sam Bagli + 2 years advanced practice & active hobby. Portrait, event, product, nature, sports. Tools: Adobe Lightroom, Photoshop, Canva, Filmora.",
    proof_url: "https://kccollege.edu.in",
    proof_type: "link",
    issuer: "Sam Bagli Mentorship",
    date_from: "2020",
    date_to: "Present",
    tags: ["Photography", "Adobe Lightroom", "Photoshop", "Canva", "Filmora", "Visual Media"],
    weight: 86
  },
  {
    id: "skill:creative-arts",
    kind: "skill",
    title: "Visual Arts & Creative Expression: Sketching, Singing, Dancing",
    summary: "Fine arts & illustration with dedicated Instagram sketch portfolio. Qualified UCEED 2023 (National Design Entrance Examination). Passionate performer across freehand drawing, vocal singing, and dance.",
    proof_url: "https://instagram.com",
    proof_type: "link",
    issuer: "Creative Arts / UCEED",
    date_from: "2020",
    date_to: "Present",
    tags: ["Visual Arts", "Sketching", "Illustration", "UCEED", "Creative Arts"],
    weight: 84
  }
];
var onRequestGet14 = /* @__PURE__ */ __name(async ({ env }) => {
  try {
    const db = env?.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify({ items: DEFAULT_PORTFOLIO_ITEMS, templates: DEFAULT_TEMPLATES }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600"
        }
      });
    }
    const { results: rawItems } = await db.prepare(
      `SELECT id, kind, title, summary, proof_url, proof_type, issuer, date_from, date_to, tags, weight
         FROM portfolio_items WHERE visible = 1 AND verified_at IS NOT NULL ORDER BY weight DESC, created_at DESC`
    ).all();
    const { results: rawTemplates } = await db.prepare(`SELECT id, name, layout_spec FROM resume_templates ORDER BY created_at ASC`).all();
    const items = rawItems && rawItems.length > 0 ? rawItems.map((r) => ({
      ...r,
      tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags
    })) : DEFAULT_PORTFOLIO_ITEMS;
    const templates = rawTemplates && rawTemplates.length > 0 ? rawTemplates.map((t) => ({
      ...t,
      layout_spec: typeof t.layout_spec === "string" ? JSON.parse(t.layout_spec || "{}") : t.layout_spec
    })) : DEFAULT_TEMPLATES;
    return new Response(JSON.stringify({ items, templates }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ items: DEFAULT_PORTFOLIO_ITEMS, templates: DEFAULT_TEMPLATES }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// api/projects.ts
var DEFAULT_APPROVED_PROJECTS = [
  {
    id: "gh:PriyanshGadia/Cave",
    source: "github",
    repo_full: "PriyanshGadia/Cave",
    title: "Cave",
    tagline: "VAULT-01 real-time procedural WebGL engine. Zero raster images, 60 FPS PBR renderer.",
    tags: ["WebGL", "Three.js", "TypeScript", "Procedural", "PBR"],
    stats: { stars: 0, forks: 0, lang: "TypeScript" },
    diagram_spec: {
      shapes: [
        { type: "rect", x: 15, y: 25, w: 60, h: 50, label: "CAVERN" },
        { type: "rect", x: 105, y: 25, w: 60, h: 50, label: "VAULT" },
        { type: "line", from: [75, 50], to: [105, 50] },
        { type: "circle", x: 90, y: 50, r: 8, label: "DOOR" },
        { type: "circle", x: 135, y: 50, r: 14, label: "PEDESTAL" },
        { type: "dim", from: [15, 105], to: [165, 105], text: "TUNNEL 25m" },
        { type: "rect", x: 25, y: 130, w: 130, h: 45, label: "PBR SHADER STACK" }
      ]
    },
    sort_order: 1
  },
  {
    id: "gh:PriyanshGadia/Argus",
    source: "github",
    repo_full: "PriyanshGadia/Argus",
    title: "Argus",
    tagline: "Autonomous telemetry & visual anomaly surveillance engine.",
    tags: ["Python", "Computer Vision", "Telemetry", "Surveillance"],
    stats: { stars: 0, forks: 0, lang: "Python" },
    diagram_spec: {
      shapes: [
        { type: "circle", x: 50, y: 50, r: 24, label: "OPTIC SENSOR" },
        { type: "circle", x: 50, y: 50, r: 8 },
        { type: "line", from: [74, 50], to: [110, 50] },
        { type: "rect", x: 110, y: 28, w: 55, h: 44, label: "CNN FILTER" },
        { type: "line", from: [137, 72], to: [137, 115] },
        { type: "rect", x: 95, y: 115, w: 75, h: 45, label: "ALERT BUS" },
        { type: "dim", from: [20, 180], to: [165, 180], text: "<15ms LATENCY" }
      ]
    },
    sort_order: 2
  },
  {
    id: "gh:PriyanshGadia/physionet2026-unchartered-iitian",
    source: "github",
    repo_full: "PriyanshGadia/physionet2026-unchartered-iitian",
    title: "PhysioNet 2026",
    tagline: "Physiological multi-lead ECG time-series classification & cardiac outcome prediction.",
    tags: ["Python", "ECG", "Bioinformatics", "Time-Series", "PyTorch"],
    stats: { stars: 0, forks: 0, lang: "Python" },
    diagram_spec: {
      shapes: [
        { type: "rect", x: 15, y: 25, w: 50, h: 60, label: "ECG 12-LEAD" },
        { type: "line", from: [65, 55], to: [95, 55] },
        { type: "rect", x: 95, y: 25, w: 70, h: 60, label: "WAVELET DECOMP" },
        { type: "line", from: [130, 85], to: [130, 115] },
        { type: "circle", x: 130, y: 140, r: 22, label: "ATTENTION" },
        { type: "dim", from: [15, 185], to: [165, 185], text: "500Hz SAMPLING" }
      ]
    },
    sort_order: 3
  },
  {
    id: "gh:PriyanshGadia/CryptoGraph_Analytics",
    source: "github",
    repo_full: "PriyanshGadia/CryptoGraph_Analytics",
    title: "CryptoGraph",
    tagline: "On-chain network topology analysis and transaction graph clustering.",
    tags: ["Python", "Graph Theory", "Blockchain", "NetworkX"],
    stats: { stars: 0, forks: 0, lang: "Python" },
    diagram_spec: {
      shapes: [
        { type: "circle", x: 40, y: 45, r: 14, label: "NODE-A" },
        { type: "circle", x: 135, y: 45, r: 14, label: "NODE-B" },
        { type: "circle", x: 88, y: 115, r: 18, label: "HUB" },
        { type: "line", from: [50, 55], to: [78, 102] },
        { type: "line", from: [125, 55], to: [98, 102] },
        { type: "line", from: [54, 45], to: [121, 45] },
        { type: "dim", from: [20, 165], to: [165, 165], text: "FLOW MATRIX" }
      ]
    },
    sort_order: 4
  },
  {
    id: "gh:PriyanshGadia/Respiratory-Support-Optimization",
    source: "github",
    repo_full: "PriyanshGadia/Respiratory-Support-Optimization",
    title: "Ventilator AI",
    tagline: "Closed-loop ventilator control & adaptive respiratory support optimization.",
    tags: ["Python", "Medical AI", "Control Systems", "Optimization"],
    stats: { stars: 0, forks: 0, lang: "Python" },
    diagram_spec: {
      shapes: [
        { type: "rect", x: 15, y: 25, w: 55, h: 50, label: "FLOW SENSOR" },
        { type: "line", from: [70, 50], to: [105, 50] },
        { type: "rect", x: 105, y: 25, w: 60, h: 50, label: "PID CONTROLLER" },
        { type: "line", from: [135, 75], to: [135, 110] },
        { type: "circle", x: 135, y: 130, r: 18, label: "VALVE" },
        { type: "line", from: [117, 130], to: [42, 130] },
        { type: "line", from: [42, 130], to: [42, 75] },
        { type: "dim", from: [15, 175], to: [165, 175], text: "PEEP REGULATION" }
      ]
    },
    sort_order: 5
  },
  {
    id: "gh:PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine",
    source: "github",
    repo_full: "PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine",
    title: "Insight Engine",
    tagline: "Multimodal document extraction, layout parsing & semantic vector synthesis.",
    tags: ["Python", "NLP", "OCR", "Document AI", "Embeddings"],
    stats: { stars: 0, forks: 0, lang: "Python" },
    diagram_spec: {
      shapes: [
        { type: "rect", x: 15, y: 25, w: 45, h: 65, label: "DOC INGEST" },
        { type: "line", from: [60, 55], to: [90, 55] },
        { type: "rect", x: 90, y: 25, w: 75, h: 65, label: "LAYOUT PARSER" },
        { type: "line", from: [127, 90], to: [127, 120] },
        { type: "circle", x: 127, y: 142, r: 20, label: "EMBEDDINGS" },
        { type: "dim", from: [15, 185], to: [165, 185], text: "VECTOR RAG" }
      ]
    },
    sort_order: 6
  },
  {
    id: "gh:PriyanshGadia/Google-Forms-Bulk-Responder",
    source: "github",
    repo_full: "PriyanshGadia/Google-Forms-Bulk-Responder",
    title: "Form Dispatcher",
    tagline: "Form schema reverse engineering & high-throughput concurrency load tester.",
    tags: ["Python", "Automation", "Reverse Engineering", "Load Testing"],
    stats: { stars: 0, forks: 0, lang: "Python" },
    diagram_spec: {
      shapes: [
        { type: "rect", x: 15, y: 25, w: 60, h: 45, label: "SCHEMA PROBE" },
        { type: "line", from: [75, 47], to: [105, 47] },
        { type: "rect", x: 105, y: 25, w: 60, h: 45, label: "RANDOM SEED" },
        { type: "line", from: [135, 70], to: [135, 105] },
        { type: "rect", x: 80, y: 105, w: 85, h: 45, label: "ASYNC POOL" },
        { type: "dim", from: [15, 175], to: [165, 175], text: "CONCURRENT HTTP" }
      ]
    },
    sort_order: 7
  }
];
var onRequestGet15 = /* @__PURE__ */ __name(async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify(DEFAULT_APPROVED_PROJECTS), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }
      });
    }
    const { results } = await db.prepare(
      "SELECT id, source, repo_full, title, tagline, tags, stats, readme_excerpt, diagram_spec, sort_order FROM projects WHERE visible = 1 AND review_state = ? ORDER BY sort_order ASC"
    ).bind("approved").all();
    if (!results || results.length === 0) {
      return new Response(JSON.stringify(DEFAULT_APPROVED_PROJECTS), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }
      });
    }
    const projects = results.map((row) => ({
      ...row,
      tags: typeof row.tags === "string" ? JSON.parse(row.tags || "[]") : row.tags,
      stats: typeof row.stats === "string" ? JSON.parse(row.stats || "{}") : row.stats,
      diagram_spec: typeof row.diagram_spec === "string" && row.diagram_spec ? JSON.parse(row.diagram_spec) : row.diagram_spec
    }));
    return new Response(JSON.stringify(projects), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify(DEFAULT_APPROVED_PROJECTS), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// ../.wrangler/tmp/pages-PMNUBv/functionsRoutes-0.9382452630882424.mjs
var routes = [
  {
    routePath: "/api/vault/admin/revoke",
    mountPath: "/api/vault/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/vault/biometric/consent",
    mountPath: "/api/vault/biometric",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/vault/biometric/enroll",
    mountPath: "/api/vault/biometric",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/vault/device/bind",
    mountPath: "/api/vault/device",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/vault/identity/check-conflict",
    mountPath: "/api/vault/identity",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/vault/identity/conflict",
    mountPath: "/api/vault/identity",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/vault/identity/directory",
    mountPath: "/api/vault/identity",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/vault/identity/directory",
    mountPath: "/api/vault/identity",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/vault/liveness/challenge",
    mountPath: "/api/vault/liveness",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/vault/liveness/verify",
    mountPath: "/api/vault/liveness",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/vault/photos/picker-complete",
    mountPath: "/api/vault/photos",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  },
  {
    routePath: "/api/vault/photos/picker-poll",
    mountPath: "/api/vault/photos",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/vault/photos/picker-session",
    mountPath: "/api/vault/photos",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost10]
  },
  {
    routePath: "/api/vault/scan/complete",
    mountPath: "/api/vault/scan",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost11]
  },
  {
    routePath: "/api/vault/user/delete",
    mountPath: "/api/vault/user",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/vault/visit/create",
    mountPath: "/api/vault/visit",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost12]
  },
  {
    routePath: "/api/vault/webauthn/auth-challenge",
    mountPath: "/api/vault/webauthn",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost13]
  },
  {
    routePath: "/api/vault/webauthn/auth-complete",
    mountPath: "/api/vault/webauthn",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost14]
  },
  {
    routePath: "/api/vault/webauthn/register-challenge",
    mountPath: "/api/vault/webauthn",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost15]
  },
  {
    routePath: "/api/vault/webauthn/register-complete",
    mountPath: "/api/vault/webauthn",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost16]
  },
  {
    routePath: "/api/state/:namespace/:elementId",
    mountPath: "/api/state/:namespace",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/admin/portfolio",
    mountPath: "/api/admin",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/admin/portfolio",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/admin/portfolio",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch2]
  },
  {
    routePath: "/api/admin/portfolio",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost17]
  },
  {
    routePath: "/api/calendar/freebusy",
    mountPath: "/api/calendar",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/calendar/request",
    mountPath: "/api/calendar",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost18]
  },
  {
    routePath: "/api/geo/earthquakes",
    mountPath: "/api/geo",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/geo/flights",
    mountPath: "/api/geo",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/geo/locate",
    mountPath: "/api/geo",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/geo/news",
    mountPath: "/api/geo",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/geo/satellites",
    mountPath: "/api/geo",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/vault/session",
    mountPath: "/api/vault",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/vault/session",
    mountPath: "/api/vault",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/notes/:id",
    mountPath: "/api/notes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/notes/:id",
    mountPath: "/api/notes",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/state/:namespace",
    mountPath: "/api/state",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet12]
  },
  {
    routePath: "/api/notes",
    mountPath: "/api/notes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet13]
  },
  {
    routePath: "/api/notes",
    mountPath: "/api/notes",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost19]
  },
  {
    routePath: "/api/portfolio",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet14]
  },
  {
    routePath: "/api/projects",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet15]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError2;

// ../.wrangler/tmp/bundle-YGMTlx/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-YGMTlx/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.8748151453886587.mjs.map
