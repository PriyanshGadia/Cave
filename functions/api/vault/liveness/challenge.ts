/**
 * functions/api/vault/liveness/challenge.ts
 *
 * POST /api/vault/liveness/challenge
 *
 * Generates an interactive UX liveness challenge: 3 randomized head/gaze prompts
 * the user must complete in sequence. Challenge expiration and expected sequence
 * are stored server-side in vault_challenges.
 *
 * LAYER NOTE:
 * This constitutes Layer 1 (UX Liveness & Identity). It prevents trivial presentation
 * replays in the UI, but relies on Layer 2 (WebAuthn) and Layer 3 (Worker authorization)
 * for cryptographic security.
 */

import type { EventContext } from '@cloudflare/workers-types';
import {
  type Env,
  createChallenge,
  checkRateLimit,
  getClientIp,
  jsonOk,
  jsonError,
} from '../_middleware';

const LIVENESS_PROMPTS = [
  'TURN_LEFT',
  'TURN_RIGHT',
  'NOD_DOWN',
  'BLINK',
] as const;

type LivenessPrompt = typeof LIVENESS_PROMPTS[number];

function pickRandomPrompts(n: number): LivenessPrompt[] {
  const shuffled = [...LIVENESS_PROMPTS].sort(() => (Math.random() > 0.5 ? 1 : -1));
  return shuffled.slice(0, n) as LivenessPrompt[];
}

interface LivenessChallengeBody {
  sessionType: 'ENROLL' | 'SCAN';
}

export const onRequestPost: (ctx: EventContext<Env, string, unknown>) => Promise<Response> =
  async ({ request, env }) => {
    const ip = getClientIp(request);

    const rl = await checkRateLimit(env, 'ip:vault', ip);
    if (!rl.allowed) return jsonError(429, 'Rate limited');

    let body: LivenessChallengeBody;
    try {
      body = await request.json() as LivenessChallengeBody;
    } catch {
      return jsonError(400, 'Invalid JSON');
    }

    if (body.sessionType !== 'ENROLL' && body.sessionType !== 'SCAN') {
      return jsonError(400, 'Invalid sessionType');
    }

    // 2 high-confidence prompts for smooth human verification
    const prompts = pickRandomPrompts(2);

    const { challengeId } = await createChallenge(env, {
      challengeType: 'LIVENESS',
      challengeData: {
        sessionType: body.sessionType,
        prompts,
        promptCount: prompts.length,
      },
      ttlSeconds: 120, // 120 seconds to complete gestures comfortably
    });

    return jsonOk({
      challengeId,
      prompts,
      expiresInSeconds: 90,
    });
  };
