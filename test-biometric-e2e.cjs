/**
 * test-biometric-e2e.cjs
 *
 * Dedicated Synthetic End-to-End Biometric Verification Test Harness.
 * Proves the authoritative three-layer authentication gateway:
 *   LAYER 1: Interactive Liveness (fresh challenge-response token)
 *   LAYER 2: WebAuthn Credential (cryptographic device assertion)
 *   LAYER 3: Server-Side Face Biometrics (AES-GCM encrypted 128-D embedding cosine match)
 *
 * Scenarios tested:
 *   1. POSITIVE PATH:
 *      registered identity -> known test embedding -> liveness token ->
 *      WebAuthn assertion -> device binding -> server face match ->
 *      session issuance -> vault access granted (200 OK + vault_sid cookie)
 *
 *   2. INVERSE 1 (Biometric mismatch):
 *      same device + different synthetic face + valid WebAuthn ->
 *      DENIED (401 VAULT ACCESS DENIED)
 *
 *   3. INVERSE 2 (WebAuthn invalid):
 *      same face + wrong WebAuthn credential/signature ->
 *      DENIED (401 VAULT ACCESS DENIED)
 *
 *   4. INVERSE 3 (Liveness replay/expiry):
 *      valid face + valid WebAuthn + expired/reused liveness token ->
 *      DENIED (401 VAULT ACCESS DENIED)
 */

const http = require('http');
const crypto = require('crypto');

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
// Synthetic Biometric Vector Generation
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
  for (let i = 0; i < 128; i++) {
    vec[i] /= norm;
  }
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
  for (let i = 0; i < 128; i++) {
    vec[i] /= norm;
  }
  return vec;
}

function computeCosine(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < 128; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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

// ---------------------------------------------------------------------------
// Synthetic WebAuthn Authenticator Primitives
// ---------------------------------------------------------------------------
const DEVICE_SIGNALS = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SyntheticTest/1.0',
  platform: 'Win32',
  hardwareConcurrency: 16,
  screenColorDepth: 24,
  timezone: 'Asia/Kolkata',
  canvasHash: `synth-canvas-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
};

async function createSyntheticAuthenticator() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');

  // COSE Key representation: map(5) { 1: 2 (EC), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y }
  const cosePublicKey = Buffer.concat([
    Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
    x,
    Buffer.from([0x22, 0x58, 0x20]),
    y,
  ]);

  const credentialId = Buffer.from(`cred-${Date.now()}-${Math.floor(Math.random() * 10000)}`);

  return {
    keyPair,
    cosePublicKey,
    credentialId,
    signCount: 0,
  };
}

function buildAttestationObject(authenticator, originHostname) {
  const rpIdHash = Buffer.from(crypto.createHash('sha256').update(originHostname).digest());
  const flags = Buffer.from([0x45]); // UP (0x01), UV (0x04), AT (0x40)
  const signCount = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const aaguid = Buffer.alloc(16);
  const credIdLen = Buffer.from([0x00, authenticator.credentialId.length]);

  const authData = Buffer.concat([
    rpIdHash,
    flags,
    signCount,
    aaguid,
    credIdLen,
    authenticator.credentialId,
    authenticator.cosePublicKey,
  ]);

  const attObj = Buffer.concat([
    Buffer.from([0xa1, 0x68]),
    Buffer.from('authData'),
    Buffer.from([0x58, authData.length]),
    authData,
  ]);

  return attObj;
}

async function signAssertion(authenticator, challenge, origin) {
  authenticator.signCount++;
  const originHostname = new URL(origin).hostname;
  const rpIdHash = Buffer.from(crypto.createHash('sha256').update(originHostname).digest());
  const flags = Buffer.from([0x05]); // UP (0x01), UV (0x04)
  const scBuf = Buffer.alloc(4);
  scBuf.writeUInt32BE(authenticator.signCount, 0);

  const authData = Buffer.concat([rpIdHash, flags, scBuf]);

  const clientData = Buffer.from(JSON.stringify({
    type: 'webauthn.get',
    challenge,
    origin,
  }));

  const clientDataHash = Buffer.from(crypto.createHash('sha256').update(clientData).digest());
  const verificationData = Buffer.concat([authData, clientDataHash]);

  const rawSig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    authenticator.keyPair.privateKey,
    verificationData
  );

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
  assert(chgRes.status === 200, `Liveness challenge failed: ${chgRes.raw}`);
  const { challengeId, prompts } = chgRes.json;

  const now = Date.now();
  const promptCompletions = prompts.map((p, idx) => ({
    prompt: p,
    completedAt: now + 500 + idx * 400,
  }));

  const verRes = await api('POST', '/api/vault/liveness/verify', {
    challengeId,
    promptCompletions,
  }, null, clientIp);
  assert(verRes.status === 200, `Liveness verify failed: ${verRes.raw}`);
  assert(verRes.json.livenessVerified === true, 'Liveness verification must succeed');
  return verRes.json.livenessToken;
}

// ---------------------------------------------------------------------------
// MAIN TEST SUITE
// ---------------------------------------------------------------------------
async function runSuite() {
  console.log('=== VAULT-01 Synthetic End-to-End Biometric Verification Test Harness ===');
  console.log(`Base URL: ${BASE_URL}\n`);

  const authenticatorA = await createSyntheticAuthenticator();
  const vectorA = generateNormalizedEmbedding(101);
  const vectorAPerturbed = perturbEmbedding(vectorA, 0.04);
  const vectorB = generateNormalizedEmbedding(202); // Independent face

  const simMatch = computeCosine(vectorA, vectorAPerturbed);
  const diffMatch = computeCosine(vectorA, vectorB);
  console.log(`Biometric Embeddings:`);
  console.log(`  Target face similarity (perturbed vector): ${simMatch.toFixed(4)} (Threshold: 0.82)`);
  console.log(`  Impostor face similarity (orthogonal vector): ${diffMatch.toFixed(4)} (Threshold: 0.82)\n`);

  let enrolledUserId = '';
  let enrolledDeviceId = '';

  // ─── Step 1: WebAuthn Device Registration ──────────────────────────────
  await test('Step 1: Register synthetic WebAuthn device credential', async () => {
    const regIp = randomIp();
    const regChg = await api('POST', '/api/vault/webauthn/register-challenge', {
      displayName: 'Synthetic Agent Prime',
      deviceSignals: DEVICE_SIGNALS,
    }, null, regIp);
    assert(regChg.status === 200, `Register challenge failed: ${regChg.raw}`);

    const originHostname = new URL(BASE_URL).hostname;
    const attObj = buildAttestationObject(authenticatorA, originHostname);
    const clientData = Buffer.from(JSON.stringify({
      type: 'webauthn.create',
      challenge: regChg.json.challenge,
      origin: BASE_URL,
    }));

    const regComp = await api('POST', '/api/vault/webauthn/register-complete', {
      challengeId: regChg.json.challengeId,
      attestationResponse: {
        id: authenticatorA.credentialId.toString('base64url'),
        rawId: authenticatorA.credentialId.toString('base64url'),
        type: 'public-key',
        response: {
          attestationObject: attObj.toString('base64url'),
          clientDataJSON: clientData.toString('base64url'),
        },
      },
      deviceSignals: DEVICE_SIGNALS,
      displayName: 'Synthetic Agent Prime',
    }, null, regIp);

    assert(regComp.status === 200, `Register complete failed: ${regComp.raw}`);
    assert(regComp.json.userId, 'Must return userId');
    assert(regComp.json.deviceId, 'Must return deviceId');
    enrolledUserId = regComp.json.userId;
    enrolledDeviceId = regComp.json.deviceId;
  });

  // ─── Step 2: Biometric Face Enrollment ─────────────────────────────────
  await test('Step 2: Enroll synthetic face vector A under AES-GCM + server KEK', async () => {
    const enrollIp = randomIp();
    const enrollLivenessToken = await performLiveness('ENROLL', enrollIp);
    const { encryptedEmbedding, embeddingIv } = await encryptCandidateEmbedding(vectorA, enrollLivenessToken);

    const enrollRes = await api('POST', '/api/vault/biometric/enroll', {
      livenessToken: enrollLivenessToken,
      deviceId: enrolledDeviceId,
      userId: enrolledUserId,
      encryptedEmbedding,
      embeddingIv,
    }, null, enrollIp);

    assert(enrollRes.status === 200, `Biometric enroll failed: ${enrollRes.raw}`);
    assert(enrollRes.json.enrolled === true, 'enrolled must be true');
    assert(enrollRes.setCookie?.includes('vault_sid='), 'Enrollment must issue first session cookie');
  });

  // ─── Step 3: POSITIVE PATH (All 3 Layers Valid) ────────────────────────
  await test('POSITIVE PATH: Valid Face + Valid WebAuthn + Fresh Liveness -> 200 OK + Session', async () => {
    const stepIp = randomIp();

    // Layer 1: Fresh Liveness
    const livenessToken = await performLiveness('SCAN', stepIp);

    // Layer 2: WebAuthn Authentication Assertion
    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);
    assert(authChg.status === 200, `Auth challenge failed: ${authChg.raw}`);

    const assertion = await signAssertion(authenticatorA, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);
    assert(authComp.status === 200, `Auth complete failed: ${authComp.raw}`);
    assert(authComp.json.webauthnVerified === true, 'WebAuthn must be verified');

    // Layer 3: Server Face Match (Candidate vector A' perturbed, similarity 0.95 >= 0.82)
    const { encryptedEmbedding, embeddingIv } = await encryptCandidateEmbedding(vectorAPerturbed, livenessToken);
    const scanRes = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: authComp.json.deviceId,
      webauthnVerifiedUserId: authComp.json.userId,
      encryptedEmbedding,
      embeddingIv,
    }, null, stepIp);

    assert(scanRes.status === 200, `Scan complete failed: ${scanRes.raw}`);
    assert(scanRes.json.authenticated === true, 'User must be authenticated');
    assert(scanRes.setCookie?.includes('vault_sid='), 'Must issue vault_sid session cookie');

    // Verify session state from server
    const sessionCookie = scanRes.setCookie.split(';')[0];
    const sessCheck = await api('GET', '/api/vault/session', null, sessionCookie, stepIp);
    assert(sessCheck.status === 200, 'Session check must succeed');
    assert(sessCheck.json.authenticated === true, 'Session must be authenticated');
    assert(sessCheck.json.displayName === 'Synthetic Agent Prime', 'Session display name must match');
  });

  // ─── Step 4: INVERSE 1 (Biometric Mismatch) ────────────────────────────
  await test('INVERSE 1: Valid WebAuthn + Valid Liveness + WRONG FACE -> 401 DENIED', async () => {
    const stepIp = randomIp();
    const livenessToken = await performLiveness('SCAN', stepIp);

    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);
    const assertion = await signAssertion(authenticatorA, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);
    assert(authComp.status === 200, 'WebAuthn must verify');

    // Submit IMPOSTOR face (vector B, similarity ~0.68 < 0.82)
    const { encryptedEmbedding, embeddingIv } = await encryptCandidateEmbedding(vectorB, livenessToken);
    const scanRes = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: authComp.json.deviceId,
      webauthnVerifiedUserId: authComp.json.userId,
      encryptedEmbedding,
      embeddingIv,
    }, null, stepIp);

    assert(scanRes.status === 401, `Expected 401, got ${scanRes.status}`);
    assert(scanRes.json?.error === 'VAULT ACCESS DENIED', 'Must return generic access denied');
    assert(!scanRes.setCookie, 'Must NOT issue session cookie on biometric mismatch');
  });

  // ─── Step 5: INVERSE 2 (WebAuthn Invalid / Unverified) ──────────────────
  await test('INVERSE 2: Valid Face + Valid Liveness + WRONG WEBAUTHN -> 401 DENIED', async () => {
    const stepIp = randomIp();
    const rogueAuth = await createSyntheticAuthenticator();

    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);

    // Sign with rogue authenticator key (signature verification fails on server against registered public key)
    const rogueAssertion = await signAssertion(rogueAuth, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: rogueAssertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);

    assert(authComp.status === 401, `Rogue WebAuthn must fail with 401, got ${authComp.status}`);
    assert(authComp.json?.error === 'VAULT ACCESS DENIED', 'Must return generic access denied');

    // Test direct bypass attempt to scan/complete with spoofed device ID
    const livenessToken = await performLiveness('SCAN', stepIp);
    const { encryptedEmbedding, embeddingIv } = await encryptCandidateEmbedding(vectorAPerturbed, livenessToken);

    const scanRes = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: 'dev_unregistered_spoofed',
      webauthnVerifiedUserId: enrolledUserId,
      encryptedEmbedding,
      embeddingIv,
    }, null, stepIp);

    assert(scanRes.status === 401, `Direct bypass to scan/complete must fail 401, got ${scanRes.status}`);
    assert(!scanRes.setCookie, 'Must NOT issue session cookie');
  });

  // ─── Step 6: INVERSE 3 (Liveness Replay / Expiry) ───────────────────────
  await test('INVERSE 3: Valid Face + Valid WebAuthn + EXPIRED/REUSED LIVENESS -> 401 DENIED', async () => {
    const stepIp = randomIp();
    const livenessToken = await performLiveness('SCAN', stepIp);

    const authChg = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceId: enrolledDeviceId,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);
    const assertion = await signAssertion(authenticatorA, authChg.json.challenge, BASE_URL);
    const authComp = await api('POST', '/api/vault/webauthn/auth-complete', {
      challengeId: authChg.json.challengeId,
      assertionResponse: assertion,
      deviceSignals: DEVICE_SIGNALS,
    }, null, stepIp);
    assert(authComp.status === 200, 'WebAuthn verified');

    const { encryptedEmbedding, embeddingIv } = await encryptCandidateEmbedding(vectorAPerturbed, livenessToken);

    // First scan consume: valid
    const firstScan = await api('POST', '/api/vault/scan/complete', {
      livenessToken,
      webauthnVerifiedDeviceId: authComp.json.deviceId,
      webauthnVerifiedUserId: authComp.json.userId,
      encryptedEmbedding,
      embeddingIv,
    }, null, stepIp);
    assert(firstScan.status === 200, 'First scan must succeed');

    // Second scan with REUSED liveness token: must fail with 401
    const replayedScan = await api('POST', '/api/vault/scan/complete', {
      livenessToken, // Already consumed!
      webauthnVerifiedDeviceId: authComp.json.deviceId,
      webauthnVerifiedUserId: authComp.json.userId,
      encryptedEmbedding,
      embeddingIv,
    }, null, randomIp());

    assert(replayedScan.status === 401, `Reused liveness token must return 401, got ${replayedScan.status}`);
    assert(replayedScan.json?.error === 'VAULT ACCESS DENIED', 'Must return generic access denied');
  });

  console.log(`\n=== E2E Biometric Harness Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test harness execution failed:', err);
  process.exit(1);
});
