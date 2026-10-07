/**
 * test-biometric-security.cjs
 *
 * Biometric Security Test Suite — VAULT-01 (Hardened)
 *
 * Runs 18 security-focused integration tests against the local dev server.
 * Usage:
 *   node test-biometric-security.cjs [--base-url http://localhost:8788]
 */

'use strict';

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:8788';

let passed = 0;
let failed = 0;

// Unique test session run ID for isolated IP and device testing
const TEST_RUN_ID = Math.floor(Math.random() * 90000 + 10000);
const TEST_IP = `10.99.${Math.floor(TEST_RUN_ID / 256)}.${TEST_RUN_ID % 256}`;

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

function assert(condition, message) {
  if (!condition) throw new Error(message ?? 'Assertion failed');
}

async function api(method, path, body, cookies = '', customIp = TEST_IP) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': customIp,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, status: res.status, setCookie: res.headers.get('set-cookie') };
}

const DEVICE_SIGNALS = {
  userAgent: 'TestAgent/1.0',
  platform: 'Win32',
  hardwareConcurrency: 4,
  screenColorDepth: 24,
  timezone: 'Asia/Kolkata',
  canvasHash: `abc123test_${TEST_RUN_ID}`,
};

// ---------------------------------------------------------------------------
console.log(`\n=== VAULT-01 Hardened Security Tests (Run: ${TEST_RUN_ID}) ===\n`);
// ---------------------------------------------------------------------------

(async () => {
  // ─── Section 1: Session Endpoint ───────────────────────────────────────
  console.log('Section 1: Session Endpoint');

  await test('GET /session without cookie returns unauthenticated', async () => {
    const { json } = await api('GET', '/api/vault/session');
    assert(json.authenticated === false, 'Should be unauthenticated');
    assert(json.accessLevel === 'VISITOR', 'Should be VISITOR');
  });

  await test('DELETE /session without cookie returns 204 (idempotent)', async () => {
    const { status } = await api('DELETE', '/api/vault/session');
    assert(status === 204, `Expected 204, got ${status}`);
  });

  // ─── Section 2: Visitor Sessions ───────────────────────────────────────
  console.log('\nSection 2: Visitor Sessions');

  let visitorCookie = '';

  await test('POST /visit/create issues VISITOR session', async () => {
    const { status, json, setCookie } = await api('POST', '/api/vault/visit/create', {
      deviceSignals: DEVICE_SIGNALS,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.accessLevel === 'VISITOR', 'Expected VISITOR');
    assert(json.capabilities?.tour === true, 'VISITOR should have tour');
    assert(json.capabilities?.ownerControls === false, 'VISITOR must not have ownerControls');
    assert(setCookie?.includes('vault_sid='), 'Must set vault_sid cookie');
    assert(setCookie?.includes('HttpOnly'), 'Must be HttpOnly');
    assert(setCookie?.includes('SameSite=Strict'), 'Must be SameSite=Strict');
    visitorCookie = setCookie.split(';')[0];
  });

  await test('Visitor session is returned by GET /session', async () => {
    const { json } = await api('GET', '/api/vault/session', null, visitorCookie);
    assert(json.authenticated === true, 'Visitor session should be authenticated');
    assert(json.accessLevel === 'VISITOR', 'Should be VISITOR');
  });

  await test('Visitor cannot access GUEST+ protected route', async () => {
    const { status } = await api('POST', '/api/vault/photos/picker-session', {}, visitorCookie);
    assert(status === 401 || status === 403, `Expected 401/403, got ${status}`);
  });

  // ─── Section 3: WebAuthn Registration ──────────────────────────────────
  console.log('\nSection 3: WebAuthn Registration');

  let registerChallengeId = '';
  let registerChallenge = '';

  await test('register-challenge returns PublicKeyCredentialCreationOptions with UV=required', async () => {
    const { status, json } = await api('POST', '/api/vault/webauthn/register-challenge', {
      displayName: 'Test Operative',
      deviceSignals: DEVICE_SIGNALS,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.challengeId?.startsWith('chg_'), 'Must return challengeId');
    assert(typeof json.challenge === 'string' && json.challenge.length >= 40, 'Must return challenge');
    assert(Array.isArray(json.pubKeyCredParams), 'Must return pubKeyCredParams');
    assert(json.authenticatorSelection?.userVerification === 'required', 'UV must be required');
    registerChallengeId = json.challengeId;
    registerChallenge = json.challenge;
  });

  await test('register-complete with invalid attestation or wrong challenge is rejected', async () => {
    const { status } = await api('POST', '/api/vault/webauthn/register-complete', {
      challengeId: registerChallengeId,
      attestationResponse: {
        id: 'fake_credential_id',
        rawId: 'fake_credential_id',
        type: 'public-key',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify({
            type: 'webauthn.create',
            challenge: 'WRONG_CHALLENGE',
            origin: 'http://localhost:8788',
          })).toString('base64'),
          attestationObject: Buffer.from('{}').toString('base64'),
        },
      },
      deviceSignals: DEVICE_SIGNALS,
      displayName: 'Test Operative',
    });
    assert(status === 400 || status === 401 || status === 409, `Expected 400/401/409, got ${status}`);
  });

  // ─── Section 4: Interactive UX Liveness ────────────────────────────────
  console.log('\nSection 4: Interactive UX Liveness');

  let livenessChallengeId = '';
  let livenessPrompts = [];

  await test('POST /liveness/challenge returns 3 randomized prompts', async () => {
    const { status, json } = await api('POST', '/api/vault/liveness/challenge', {
      sessionType: 'SCAN',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.challengeId?.startsWith('chg_'), 'Must return challengeId');
    assert(Array.isArray(json.prompts) && json.prompts.length === 3, 'Must return 3 prompts');
    assert(json.expiresInSeconds === 90, 'Must expire in 90s');
    livenessChallengeId = json.challengeId;
    livenessPrompts = json.prompts;
  });

  await test('Liveness verify rejects wrong prompt sequence', async () => {
    const now = Date.now();
    const wrongOrder = [
      { prompt: 'WRONG_PROMPT', completedAt: now + 1000 },
      { prompt: livenessPrompts[0], completedAt: now + 2000 },
      { prompt: livenessPrompts[1], completedAt: now + 3500 },
    ];
    const { status } = await api('POST', '/api/vault/liveness/verify', {
      challengeId: livenessChallengeId,
      promptCompletions: wrongOrder,
    });
    assert(status === 401, `Expected 401 for wrong prompts, got ${status}`);
  });

  await test('Liveness challenge cannot be replayed after use', async () => {
    const now = Date.now();
    const { status } = await api('POST', '/api/vault/liveness/verify', {
      challengeId: livenessChallengeId,
      promptCompletions: livenessPrompts.map((p, i) => ({
        prompt: p,
        completedAt: now + (i + 1) * 1500,
      })),
    });
    assert(status === 409, `Expected 409 for replayed challenge, got ${status}`);
  });

  await test('Liveness verify rejects implausibly fast completion (<300ms)', async () => {
    const { json: cJson } = await api('POST', '/api/vault/liveness/challenge', { sessionType: 'ENROLL' });
    const cId = cJson.challengeId;
    const prompts = cJson.prompts;

    const now = Date.now();
    const { status } = await api('POST', '/api/vault/liveness/verify', {
      challengeId: cId,
      promptCompletions: prompts.map((p, i) => ({
        prompt: p,
        completedAt: now + i * 50,
      })),
    });
    assert(status === 401, `Expected 401 for implausible timing, got ${status}`);
  });

  // ─── Section 5: Device Binding ──────────────────────────────────────────
  console.log('\nSection 5: Device Binding');

  await test('POST /device/bind returns "free" for unregistered device', async () => {
    const { status, json } = await api('POST', '/api/vault/device/bind', {
      deviceSignals: {
        ...DEVICE_SIGNALS,
        canvasHash: `unique_device_${TEST_RUN_ID}_${Math.random()}`,
      },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.status === 'free', `Expected free, got ${json.status}`);
  });

  // ─── Section 6: Identity Conflict Detection ─────────────────────────────
  console.log('\nSection 6: Identity Conflict Detection');

  await test('POST /identity/check-conflict returns action: "ENROLL" for unbound device', async () => {
    const { status, json } = await api('POST', '/api/vault/identity/check-conflict', {
      deviceSignals: {
        ...DEVICE_SIGNALS,
        canvasHash: `fresh_probe_${TEST_RUN_ID}`,
      },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.action === 'ENROLL', `Expected ENROLL, got ${json.action}`);
  });

  // ─── Section 7: Cookie Security ─────────────────────────────────────────
  console.log('\nSection 7: Cookie Security');

  await test('Session cookie enforces HttpOnly and SameSite=Strict', async () => {
    const { setCookie } = await api('POST', '/api/vault/visit/create', {
      deviceSignals: DEVICE_SIGNALS,
    });
    assert(setCookie?.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert(setCookie?.includes('SameSite=Strict'), 'Cookie must be SameSite=Strict');
    assert(setCookie?.includes('Secure'), 'Cookie must be Secure');
    assert(!setCookie?.includes('Expires='), 'Session cookie should use Max-Age');
  });

  await test('session/delete clears cookie', async () => {
    const { res } = await api('DELETE', '/api/vault/session', null, visitorCookie);
    const cookie = res.headers.get('set-cookie');
    assert(cookie?.includes('Max-Age=0'), 'Delete should clear cookie via Max-Age=0');
  });

  // ─── Section 8: Rate Limiting ───────────────────────────────────────────
  console.log('\nSection 8: KV Rate Limiting');

  await test('scan/complete rate limit triggers 429 under flood', async () => {
    const floodIp = `10.88.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    let lastStatus = 200;
    for (let i = 0; i < 8; i++) {
      const { status } = await api(
        'POST',
        '/api/vault/scan/complete',
        {
          livenessToken: 'fake',
          webauthnVerifiedDeviceId: 'fake',
          webauthnVerifiedUserId: 'fake',
          encryptedEmbedding: 'fake',
          embeddingIv: 'fake',
        },
        '',
        floodIp
      );
      lastStatus = status;
    }
    assert(lastStatus === 429, `Expected 429 rate limit, got ${lastStatus}`);
  });

  // ─── Section 9: Additional Hardened Endpoint Tests ───────────────────────
  console.log('\nSection 9: Additional Hardened Endpoint Tests');

  await test('auth-challenge enforces userVerification: required policy', async () => {
    const { status, json } = await api('POST', '/api/vault/webauthn/auth-challenge', {
      deviceSignals: {
        ...DEVICE_SIGNALS,
        canvasHash: `fresh_auth_${TEST_RUN_ID}`,
      },
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.userVerification === 'required', `Expected userVerification: required, got ${json.userVerification}`);
  });

  await test('photos/picker-complete rejects unauthenticated request without session', async () => {
    const { status } = await api('POST', '/api/vault/photos/picker-complete', {
      sessionId: 'fake-session',
      mediaItemId: 'fake-item',
    });
    assert(status === 401, `Expected 401 unauthenticated, got ${status}`);
  });

  // ─── Results ────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
})().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
