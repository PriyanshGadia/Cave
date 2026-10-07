/**
 * functions/api/vault/capabilities.ts
 *
 * Centralized capability map — server-side only.
 *
 * The frontend receives this object from the session endpoint and uses
 * it for rendering only. Every protected API route re-validates the
 * session server-side and checks capabilities independently.
 *
 * RULE: Never make access decisions client-side based on these values.
 * The server is the sole authority.
 */

import type { Capabilities } from './_middleware';

export type AccessLevel = 'VISITOR' | 'GUEST' | 'TRUSTED' | 'OWNER';

export const CAPABILITIES: Record<AccessLevel, Capabilities> = {
  VISITOR: {
    roam: false,
    tour: true,
    ls1: false,
    ls2Write: false,
    privateResume: false,
    moderation: false,
    ownerControls: false,
  },
  GUEST: {
    roam: true,
    tour: false,
    ls1: true,
    ls2Write: true,
    privateResume: false,
    moderation: false,
    ownerControls: false,
  },
  TRUSTED: {
    roam: true,
    tour: false,
    ls1: true,
    ls2Write: true,
    privateResume: true,
    moderation: false,
    ownerControls: false,
  },
  OWNER: {
    roam: true,
    tour: false,
    ls1: true,
    ls2Write: true,
    privateResume: true,
    moderation: true,
    ownerControls: true,
  },
};

export function getCapabilities(accessLevel: string): Capabilities {
  return CAPABILITIES[accessLevel as AccessLevel] ?? CAPABILITIES.GUEST;
}
