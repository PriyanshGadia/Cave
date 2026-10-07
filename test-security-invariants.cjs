/**
 * test-security-invariants.cjs
 *
 * Permanent Security Invariants Regression Suite for VAULT-01.
 * Verifies the 8 core security invariants of the server-authoritative architecture:
 *
 * INVARIANT 1: No authenticated session -> vault never opens.
 * INVARIANT 2: Valid face + invalid WebAuthn -> vault never opens.
 * INVARIANT 3: Valid WebAuthn + wrong face -> vault never opens.
 * INVARIANT 4: Valid face + valid WebAuthn + wrong device binding -> vault never opens.
 * INVARIANT 5: Valid authentication + suspended account -> vault never opens.
 * INVARIANT 6: Expired/replayed challenge -> vault never opens.
 * INVARIANT 7: Worker/service failure -> fail-closed (vault never opens).
 * INVARIANT 8: Client modifies accessLevel/capabilities -> server strictly ignores it.
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:8788';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function randomIp() {
  const o3 = Math.floor(Math.random() * 200 + 10);
  const o4 = Math.floor(Math.random() * 200 + 10);
  return `198.51.${o3}.${o4}`;
}

async function api(method, path, body = null, cookie = null, clientIp = randomIp()) {
  const url = new URL(path, BASE_URL);
  const data = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { 'Cookie': cookie } : {}),
        'Origin': BASE_URL,
        'CF-Connecting-IP': clientIp,
        'X-Forwarded-For': clientIp,
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          json,
          raw,
          setCookie: res.headers['set-cookie'] ? res.headers['set-cookie'].join('; ') : null,
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers: Crypto & Authenticator
// ---------------------------------------------------------------------------
function generateNormalizedEmbedding(seed = 1) {
  const vec = new Float32Array(128);
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    const x = Math.sin(seed * 9999 + i * 1337) * 10000;
    vec[i] = x - Math.floor(x);
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < 128; i++) vec[i] /= norm;
  return vec;
}

function perturbEmbedding(orig, noiseMagnitude = 0.04) {
  const vec = new Float32Array(128);
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    vec[i] = orig[i] + (Math.sin(i * 42) * noiseMagnitude);
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < 128; i++) vec[i] /= norm;
  return vec;
}

async function encryptCandidateEmbedding(embedding, livenessToken) {
  const enc = new TextEncoder();
  const rawKey = await crypto.subtle.digest('SHA-256', enc.encode(livenessToken));
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new Uint8Array(embedding.buffer, embedding.byteOffset, embedding.byteLength)
  );
  return {
    encryptedEmbedding: Buffer.from(encrypted).toString('base64'),
    embeddingIv: Buffer.from(iv).toString('base64'),
  };
}

async function createSyntheticAuthenticator() {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  const cosePublicKey = Buffer.concat([
    Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
    x,
    Buffer.from([0x22, 0x58, 0x20]),
    y,
  ]);
  const credentialId = Buffer.from(`cred-inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  return { keyPair, cosePublicKey, credentialId, signCount: 0 };
}

function buildAttestationObject(authenticator, originHostname) {
  const rpIdHash = Buffer.from(crypto.createHash('sha256').update(originHostname).digest());
  const flags = Buffer.from([0x45]);
  const signCount = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const aaguid = Buffer.alloc(16);
  const credIdLen = Buffer.from([0x00, authenticator.credentialId.length]);
  const authData = Buffer.concat([rpIdHash, flags, signCount, aaguid, credIdLen, authenticator.credentialId, authenticator.cosePublicKey]);
  return Buffer.concat([Buffer.from([0xa1, 0x68]), Buffer.from('authData'), Buffer.from([0x58, authData.length]), authData]);
}

async function signAssertion(authenticator, challenge, origin) {
  authenticator.signCount++;
  const originHostname = new URL(origin).hostname;
  const rpIdHash = Buffer.from(crypto.createHash('sha256').update(originHostname).digest());
  const flags = Buffer.from([0x05]);
  const scBuf = Buffer.alloc(4);
  scBuf.writeUInt32BE(authenticator.signCount, 0);
  const authData = Buffer.concat([rpIdHash, flags, scBuf]);
  const clientData = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge, origin }));
  const clientDataHash = Buffer.from(crypto.createHash('sha256').update(clientData).digest());
  const verificationData = Buffer.concat([authData, clientDataHash]);
  const rawSig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, authenticator.keyPair.privateKey, verificationData);
  return {
    id: authenticator.credentialId.toString('base64url'),
    rawId: authenticator.credentialId.toString('base64url'),
    type: 'public-key',
    response: {
      authenticatorData: authData.toString('base64url'),
      clientDataJSON: clientData.toString('base64url'),
      signature: Buffer.from(rawSig).toString('base64url'),
    },
  };
}

async function performLiveness(sessionType = 'SCAN', clientIp = randomIp()) {
  const chgRes = await api('POST', '/api/vault/liveness/challenge', { sessionType }, null, clientIp);
  const { challengeId, prompts } = chgRes.json;
  const now = Date.now();
  const promptCompletions = prompts.map((p, idx) => ({ prompt: p, completedAt: now + 500 + idx * 400 }));
  const verRes = await api('POST', '/api/vault/liveness/verify', { challengeId, promptCompletions }, null, clientIp);
  return verRes.json.livenessToken;
}

// Direct SQLite mutation helper for tests that require underlying state manipulation (e.g. account suspension)
async function updateLocalD1(sql, params = []) {
  const dir = path.join('.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!fs.existsSync(dir)) return;
  const dbFiles = fs.readdirSync(dir).filter(f => f.endsWith('.sqlite'));
  for (const f of dbFiles) {
    const dbPath = path.join(dir, f);
    try {
      const db = new DatabaseSync(dbPath);
      try {
        db.prepare(sql).run(...params);
      } catch (e) {
        // Table may not exist in secondary db file
      } finally {
        db.close();
      }
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------------
// SUITE EXECUTION
// ---------------------------------------------------------------------------
async function runSuite() {
  console.log('=== VAULT-01 Permanent Security Invariants Regression Suite ===');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Device signals unique to this test run
  const testRunId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const DEVICE_SIGNALS = {
    userAgent: 'Mozilla/5.0 InvariantTestRunner/1.0',
    platform: 'Win32',
    hardwareConcurrency: 16,
    screenColorDepth: 24,
    timezone: 'UTC',
    canvasHash: `canvas-inv-${testRunId}`,
  };

  const authenticator = await createSyntheticAuthenticator();
  const targetFace = generateNormalizedEmbedding(777);
  const targetFacePerturbed = perturbEmbedding(targetFace, 0.03);
  const impostorFace = generateNormalizedEmbedding(888);

  let enrolledUserId = '';
  let enrolledDeviceId = '';

  // Setup: Register & Enroll Identity
  const regIp = randomIp();
  const regChg = await api('POST', '/api/vault/webauthn/register-challenge', {
    displayName: 'Invariant Operative',
    deviceSignals: DEVICE_SIGNALS,
  }, null, regIp);
  assert(regChg.status === 200, `Register challenge failed: ${regChg.raw}`);

  const originHostname = new URL(BASE_URL).hostname;
  const attObj = buildAttestationObject(authenticator, originHostname);
  const clientData = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge: regChg.json.challenge, origin: BASE_URL }));

  const regComp = await api('POST', '/api/vault/webauthn/register-complete', {
    challengeId: regChg.json.challengeId,
    attestationResponse: {
      id: authenticator.credentialId.toString('base64url'),
      rawId: authenticator.credentialId.toString('base64url'),
      type: 'public-key',
      response: {
        attestationObject: attObj.toString('base64url'),
        clientDataJSON: clientData.toString('base64url'),
      },
    },
    deviceSignals: DEVICE_SIGNALS,
    displayName: 'Invariant Operative',
  }, null, regIp);

  assert(regComp.status === 200, `Registration failed: ${regComp.raw}`);
  enrolledUserId = regComp.json.userId;
  enrolledDeviceId = regComp.json.deviceId;

  // Face enrollment
  const enrollLiveness = await performLiveness('ENROLL', regIp);
  const { encryptedEmbedding, embeddingIv } = await encryptCandidateEmbedding(targetFace, enrollLiveness);
  const enrollRes = await api('POST', '/api/vault/biometric/enroll', {
    livenessToken: enrollLiveness,
    deviceId: enrolledDeviceId,
    userId: enrolledUserId,
    encryptedEmbedding,
    embeddingIv,
  }, null, regIp);
  assert(enrollRes.status === 200, `Face enrollment failed: ${enrollRes.raw}`);

  console.log(`Setup complete: Enrolled user=${enrolledUserId}, device=${enrolledDeviceId}\n`);

  // ─── INVARIANT 1: No authenticated session -> vault never opens ────────────
  await test('INVARIANT 1: No authenticated session -> vault never opens', async () => {
    // Check 1: GET /session without cookie
    const s1 = await api('GET', '/api/vault/session', null, null);
    assert(s1.json.authenticated === false, 'Must not be authenticated without cookie');
    assert(s1.json.accessLevel === 'VISITOR', 'Default level must be VISITOR');
    assert(s1.json.capabilities.ownerControls === false, 'Owner controls must be false');

    // Check 2: GET /session with forged cookie
    const s2 = await api('GET', '/api/vault/session', null, 'vault_sid=ses_forged_random_string_12345');
    assert(s2.json.authenticated === false, 'Forged cookie must be rejected');

    // Check 3: Protected route access without session
    const p1 = await api('POST', '/api/vault/photos/picker-session', {}, null);
    assert(p1.status === 401 || p1.status === 403, 'Protected endpoint must deny access');
  });

  // ─── INVARIANT 2: Valid face + invalid WebAuthn -> vault never opens ───────
  await test('INVARIANT 2: Valid face + invalid WebAuthn -> vault never opens', async () => {
    const testIp = randomIp();
    const livenessToken = await performLiveness('SCAN', testIp);
    const rogueAuth = await createSyntheticAuthenticator();

    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);

    // Sign with rogue authenticator
    const rogueAssertion = await signAssertion(rogueAuth, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: rogueAssertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);

    assert(authComp.status === 401, 'Rogue WebAuthn assertion must return 401');
    assert(authComp.json?.error === 'VAULT ACCESS DENIED', 'Must return generic denial');

    // Direct scan attempt with unverified device ID
    const { encryptedEmbedding: cEnc, embeddingIv: cIv } = await encryptCandidateEmbedding(targetFacePerturbed, livenessToken);
    const scanRes = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: 'dev_unverified_bogus',
      webauthnVerifiedUserId: enrolledUserId,
      encryptedEmbedding: cEnc,
      embeddingIv: cIv,
    }, null, testIp);

    assert(scanRes.status === 401, 'Scan complete must deny unverified device');
    assert(!scanRes.setCookie, 'Must NOT issue session cookie');
  });

  // ─── INVARIANT 3: Valid WebAuthn + wrong face -> vault never opens ─────────
  await test('INVARIANT 3: Valid WebAuthn + wrong face -> vault never opens', async () => {
    const testIp = randomIp();
    const livenessToken = await performLiveness('SCAN', testIp);

    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);
    const assertion = await signAssertion(authenticator, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);
    assert(authComp.status === 200, 'WebAuthn verified');

    // Submit IMPOSTOR face (similarity ~0.68 < 0.82)
    const { encryptedEmbedding: cEnc, embeddingIv: cIv } = await encryptCandidateEmbedding(impostorFace, livenessToken);
    const scanRes = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: authComp.json.deviceId,
      webauthnVerifiedUserId: authComp.json.userId,
      encryptedEmbedding: cEnc,
      embeddingIv: cIv,
    }, null, testIp);

    assert(scanRes.status === 401, 'Biometric mismatch must return 401');
    assert(scanRes.json?.error === 'VAULT ACCESS DENIED', 'Must return generic access denied');
    assert(!scanRes.setCookie, 'Must NOT issue session cookie on face mismatch');
  });

  // ─── INVARIANT 4: Valid face + valid WebAuthn + wrong device binding -> vault never opens ─
  await test('INVARIANT 4: Valid face + valid WebAuthn + wrong device binding -> vault never opens', async () => {
    const testIp = randomIp();
    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS, // Bound to original signals
    }, null, testIp);

    const assertion = await signAssertion(authenticator, authChg.json.challenge, BASE_URL);

    // Tamper device signals (e.g. altered user agent or canvas hash)
    const tamperedSignals = {
      ...DEVICE_SIGNALS,
      canvasHash: 'tampered-compromised-canvas-hash-999',
    };

    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: tamperedSignals, // Tampered device binding!
    }, null, testIp);

    assert(authComp.status === 401, 'Tampered device binding must return 401');
    assert(authComp.json?.error === 'VAULT ACCESS DENIED', 'Must return generic access denied');
  });

  // ─── INVARIANT 5: Valid authentication + suspended account -> vault never opens ─
  await test('INVARIANT 5: Valid authentication + suspended account -> vault never opens', async () => {
    const testIp = randomIp();

    // Suspend user in authoritative database
    await updateLocalD1(`UPDATE vault_users SET status = 'suspended' WHERE id = ?`, [enrolledUserId]);

    try {
      const livenessToken = await performLiveness('SCAN', testIp);

      const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
        deviceId: enrolledDeviceId,
        deviceSignals: DEVICE_SIGNALS,
      }, null, testIp);

      const assertion = await signAssertion(authenticator, authChg.json.challenge, BASE_URL);
      const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
        challengeId: authChg.json.challengeId,
        assertionResponse: assertion,
        deviceSignals: DEVICE_SIGNALS,
      }, null, testIp);

      // auth-complete checks u.status = 'active'
      assert(authComp.status === 401, `Suspended user in auth-complete must return 401, got ${authComp.status}`);

      // Even if attacker attempts direct scan/complete:
      const { encryptedEmbedding: cEnc, embeddingIv: cIv } = await encryptCandidateEmbedding(targetFacePerturbed, livenessToken);
      const scanRes = await api('POST', '/api/vault/scan/complete', {
        livenessToken,
        webauthnVerifiedDeviceId: enrolledDeviceId,
        webauthnVerifiedUserId: enrolledUserId,
        encryptedEmbedding: cEnc,
        embeddingIv: cIv,
      }, null, testIp);

      assert(scanRes.status === 401, `Suspended user in scan/complete must return 401, got ${scanRes.status}`);
      assert(!scanRes.setCookie, 'Must NOT issue session cookie for suspended user');
    } finally {
      // Re-activate user for subsequent tests
      await updateLocalD1(`UPDATE vault_users SET status = 'active' WHERE id = ?`, [enrolledUserId]);
    }
  });

  // ─── INVARIANT 6: Expired/replayed challenge -> vault never opens ─────────
  await test('INVARIANT 6: Expired/replayed challenge -> vault never opens', async () => {
    const testIp = randomIp();
    const livenessToken = await performLiveness('SCAN', testIp);

    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);
    const assertion = await signAssertion(authenticator, authChg.json.challenge, BASE_URL);

    // Consume challenge once
    const authComp1 = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);
    assert(authComp1.status === 200, 'First challenge use must succeed');

    // REPLAY challenge: must fail (status 409 or 401)
    const authComp2 = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId, // Replayed!
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);
    assert(authComp2.status === 409 || authComp2.status === 401, 'Replayed challenge must be rejected');
  });

  // ─── INVARIANT 7: Worker/service failure -> fail-closed ───────────────────
  await test('INVARIANT 7: Worker/service failure -> fail-closed (vault never opens)', async () => {
    const testIp = randomIp();

    // Corrupted payload causing Worker exception
    const malformedScan = await api('POST', '/api/vault/scan/complete', {
      livenessToken: 'corrupted-token',
      webauthnVerifiedDeviceId: enrolledDeviceId,
      webauthnVerifiedUserId: enrolledUserId,
      encryptedEmbedding: 'bad-base64-payload!!!',
      embeddingIv: 'bad-iv!!!',
    }, null, testIp);

    // Must fail closed (400, 401, or 500) and NEVER issue a session cookie
    assert(malformedScan.status >= 400, `Worker must return error status, got ${malformedScan.status}`);
    assert(!malformedScan.setCookie, 'Must NEVER issue session cookie on service/decryption failure');

    // Verify session remains unauthenticated
    const check = await api('GET', '/api/vault/session', null, null, testIp);
    assert(check.json.authenticated === false, 'Session must remain unauthenticated');
  });

  // ─── INVARIANT 8: Client modifies accessLevel/capabilities -> server ignores it ─
  await test('INVARIANT 8: Client modifies accessLevel/capabilities -> server strictly ignores it', async () => {
    const testIp = randomIp();

    // Ensure enrolled user in database is at GUEST level
    await updateLocalD1(`UPDATE vault_users SET access_level = 'GUEST' WHERE id = ?`, [enrolledUserId]);

    const livenessToken = await performLiveness('SCAN', testIp);
    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);

    const assertion = await signAssertion(authenticator, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, testIp);
    assert(authComp.status === 200, 'WebAuthn verified');

    const { encryptedEmbedding: cEnc, embeddingIv: cIv } = await encryptCandidateEmbedding(targetFacePerturbed, livenessToken);

    // Client attempts privilege escalation attack: injects accessLevel: 'OWNER' and full capabilities
    const scanRes = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: authComp.json.deviceId,
      webauthnVerifiedUserId: authComp.json.userId,
      encryptedEmbedding: cEnc,
      embeddingIv: cIv,
      accessLevel: 'OWNER', // Attacker injection
      capabilities: { ownerControls: true, moderation: true, privateResume: true }, // Attacker injection
    }, null, testIp);

    assert(scanRes.status === 200, 'Authentication should succeed');
    // Server must return authoritative GUEST access level, completely ignoring client injection
    assert(scanRes.json.accessLevel === 'GUEST', `Server must assign GUEST, got ${scanRes.json.accessLevel}`);
    assert(scanRes.json.capabilities.ownerControls === false, 'Server must deny ownerControls capability');

    // Verify server session endpoint also reflects authoritative GUEST claims
    const sessionCookie = scanRes.setCookie.split(';')[0];
    const sessCheck = await api('GET', '/api/vault/session', null, sessionCookie, testIp);
    assert(sessCheck.json.accessLevel === 'GUEST', 'Authoritative session must be GUEST');
    assert(sessCheck.json.capabilities.ownerControls === false, 'Authoritative session must not have ownerControls');
  });

  console.log(`\n=== Security Invariants Suite Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Security Invariants Suite execution failed:', err);
  process.exit(1);
});
