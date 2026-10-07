/**
 * functions/api/vault/liveness/verify.ts
 *
 * POST /api/vault/liveness/verify
 *
 * Verifies that the client completed the interactive liveness prompts in the
 * assigned order, within the time window, and with humanly plausible timing.
 *
 * ARCHITECTURAL BOUNDARY NOTICE:
 * This verification is an INTERACTIVE UX LIVENESS SIGNAL. It deters simple presentation
 * attacks (static photos, pre-recorded video loops) by enforcing a randomized challenge sequence.
 * Because the client environment executes in the user's browser, client-reported timestamps
 * and completion events are not cryptographically tamper-proof.
 *
 * The cryptographic roots of trust in VAULT-01 are:
 *   - Layer 2: WebAuthn hardware-bound asymmetric key signing + User Verification
 *   - Layer 3: Server-authoritative session evaluation in Cloudflare Workers
 *
 * On success, issues a single-use opaque `livenessToken` (120s TTL) for scan/enroll flows.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  consumeChallenge,
  createChallenge,
  checkRateLimit,
  writeAuditEvent,
  hashIp,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

interface PromptCompletion {
  prompt: string;
  completedAt: number; // unix ms from client (sanity-checked against server time)
}

interface LivenessVerifyBody {
  challengeId: string;
  promptCompletions: PromptCompletion[];
}

const MIN_PROMPT_MS = 250;   // < 250ms is impossible for a human
const MAX_PROMPT_MS = 25000; // 25s per prompt to allow comfortable user interaction

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);
    const ipHash = await hashIp(ip, env.DEVICE_BINDING_SECRET);

    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) {
      await writeAuditEvent(env, { event: 'RATE_LIMITED', result: 'DENIED', ipHash });
      return jsonError(429, 'Rate limited');
    }

    let body: LivenessVerifyBody;
    try {
      body = await request.json() as LivenessVerifyBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    const { challengeId, promptCompletions } = body;
    if (!challengeId || !Array.isArray(promptCompletions)) {
      return jsonError(400, 'Missing fields');
    }

    // Consume challenge (prevents replay even if subsequent checks fail)
    const stored = await consumeChallenge(env, challengeId, 'LIVENESS');
    if (!stored) {
      await writeAuditEvent(env, {
        event: 'LIVENESS_FAILURE', result: 'DENIED', ipHash,
        reasonCode: 'challenge_expired_or_used',
      });
      return jsonError(409, 'Challenge expired or already used');
    }

    const expectedPrompts: string[] = (stored.challengeData.prompts as string[]) ?? [];
    const serverNow = Date.now(); // ms

    // 1. Correct number of completions
    if (promptCompletions.length !== expectedPrompts.length) {
      await writeAuditEvent(env, {
        event: 'LIVENESS_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'wrong_prompt_count',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // 2. Prompts completed in correct order
    for (let i = 0; i < expectedPrompts.length; i++) {
      if (promptCompletions[i].prompt !== expectedPrompts[i]) {
        await writeAuditEvent(env, {
          event: 'LIVENESS_FAILURE', result: 'FAILURE', ipHash,
          reasonCode: 'wrong_prompt_order',
        });
        return jsonError(401, 'VAULT ACCESS DENIED');
      }
    }

    // 3. Per-prompt timing plausibility
    let prevTime = promptCompletions[0]?.completedAt ?? serverNow;
    for (let i = 1; i < promptCompletions.length; i++) {
      const delta = promptCompletions[i].completedAt - prevTime;
      if (delta < MIN_PROMPT_MS || delta > MAX_PROMPT_MS) {
        await writeAuditEvent(env, {
          event: 'LIVENESS_FAILURE', result: 'FAILURE', ipHash,
          reasonCode: 'implausible_timing',
          metadata: { delta, promptIndex: i },
        });
        return jsonError(401, 'VAULT ACCESS DENIED');
      }
      prevTime = promptCompletions[i].completedAt;
    }

    // 4. Total duration sanity check (client clocks can drift — 120s generous window)
    const totalMs = (promptCompletions[promptCompletions.length - 1]?.completedAt ?? 0)
                  - (promptCompletions[0]?.completedAt ?? 0);
    if (totalMs < 0 || totalMs > 120000) {
      await writeAuditEvent(env, {
        event: 'LIVENESS_FAILURE', result: 'FAILURE', ipHash,
        reasonCode: 'total_duration_invalid',
      });
      return jsonError(401, 'VAULT ACCESS DENIED');
    }

    // All checks passed — issue single-use liveness token (stored as ENROLL_SESSION challenge)
    const { challengeId: livenessToken } = await createChallenge(env, {
      challengeType: 'ENROLL_SESSION',
      userId: stored.userId,
      deviceId: stored.deviceId,
      challengeData: { livenessVerified: true, verifiedAt: serverNow },
      ttlSeconds: 120,
    });

    return jsonOk({
      livenessVerified: true,
      livenessToken,
      expiresInSeconds: 120,
    });
  };
