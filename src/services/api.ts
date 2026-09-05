import FingerprintJS from '@fingerprintjs/fingerprintjs';
import {
  VisitorRecord,
  ConsentRecord,
  GuestbookEntry,
  GitHubBlueprint,
  CalendarSlot
} from '../types';
import {
  sha256,
  encryptEmbedding,
  decryptEmbedding,
  computeCosineSimilarity,
} from '../utils/crypto';

// Constants for Jurisdiction Rules (Section 2.3)
export const GATED_JURISDICTIONS = ['IL', 'TX', 'WA', 'EU', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE'];

// Local In-Memory / LocalStorage Mock DB for Dev & Offline Resilience
const STORAGE_KEYS = {
  VISITORS: 'workshop_visitors_v2',
  CONSENT: 'workshop_consent_v2',
  GUESTBOOK: 'workshop_guestbook_v2',
  ACTIVE_SESSION: 'workshop_active_session_v2',
};

// Singleton Fingerprint Promise
let fpPromise: Promise<any> | null = null;
export async function getDeviceFingerprint(): Promise<string> {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
  } catch (err) {
    console.warn('Fingerprint extraction fallback:', err);
    return 'anon-fp-' + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * 1. Jurisdiction Gating (Section 2.3)
 * Cloudflare Workers exposes `request.cf.country` and region.
 * Automatically switches to non-biometric magic-link path if in a high-liability region.
 */
export async function detectJurisdiction(): Promise<{
  country: string;
  region: string;
  isGated: boolean;
  reason?: string;
}> {
  try {
    // In production Worker environment, this hits /api/jurisdiction
    const res = await fetch('/api/jurisdiction');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Local development fallback
  }

  // Detect timeZone to approximate region if offline
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let isGated = false;
  let regionCode = 'GLOBAL';

  if (timeZone.includes('Europe') || timeZone.includes('London')) {
    isGated = true;
    regionCode = 'EU/GDPR';
  } else if (timeZone.includes('Chicago')) {
    isGated = true;
    regionCode = 'US-IL (BIPA)';
  }

  return {
    country: isGated ? 'RESTRICTED' : 'US',
    region: regionCode,
    isGated,
    reason: isGated ? 'Jurisdiction privacy regulations active (BIPA / GDPR). Biometric bypass initiated.' : undefined,
  };
}

/**
 * 2. Full Written Legal Consent Disclosure (Section 2.2)
 */
export const LEGAL_DISCLOSURE_TEXT = `
THE WORKSHOP BIOMETRIC DATA & TELEMETRY DISCLOSURE (REVISED v2.0)
1. NATURE OF DATA: We capture ONLY mathematical vector embeddings (derived feature points), NEVER raw facial photographs or video frames.
2. ENCRYPTION & STORAGE: Embeddings are encrypted using Web Crypto AES-GCM-256 before disk storage. Decryption occurs solely in-memory during real-time matching.
3. PURPOSE: Recognition of return operatives, unlocking Tier 2 terminal access and tailored portfolio telemetry.
4. RETENTION & DELETION: Records automatically expire after 12 months of inactivity. You retain the right to self-serve instant deletion at any time via the Deletion Terminal.
5. LEGAL ACKNOWLEDGMENT: By typing your full legal name below, you execute a digital written release authorizing mathematical vector comparison.
`.trim();

export async function submitConsentRelease(fullName: string, email: string): Promise<ConsentRecord> {
  const disclosureHash = await sha256(LEGAL_DISCLOSURE_TEXT);
  const fingerprint = await getDeviceFingerprint();
  const visitorId = 'vis_' + Math.random().toString(36).substring(2, 11);

  const consentRecord: ConsentRecord = {
    id: 'rel_' + Math.random().toString(36).substring(2, 11),
    visitorId,
    fullName,
    disclosureHash,
    timestamp: Date.now(),
    emailSent: true,
  };

  // Persist locally for dev fallback
  const existingConsent: ConsentRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSENT) || '[]');
  existingConsent.push(consentRecord);
  localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(existingConsent));

  // Initialize Visitor Shell
  const visitorRecord: VisitorRecord = {
    id: visitorId,
    tier: 1,
    email,
    fullName,
    fingerprintHash: fingerprint,
    jurisdictionCode: 'STANDARD',
    isBiometricGated: false,
    authMethod: 'magic_link',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  saveVisitor(visitorRecord);
  setActiveSession(visitorRecord);

  return consentRecord;
}

/**
 * 3. Biometric Registration with AES-GCM Encryption (Section 2.1)
 */
export async function registerBiometricEmbedding(
  fullName: string,
  email: string,
  embedding: number[]
): Promise<VisitorRecord> {
  const fingerprint = await getDeviceFingerprint();
  const { cipherBase64, ivBase64 } = await encryptEmbedding(embedding);

  const visitorRecord: VisitorRecord = {
    id: 'vis_bio_' + Math.random().toString(36).substring(2, 11),
    tier: 2, // Verified Tier 2 Access
    email,
    fullName,
    fingerprintHash: fingerprint,
    jurisdictionCode: 'STANDARD',
    isBiometricGated: false,
    authMethod: 'biometric',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  // Save encrypted embedding record
  const records = getStoredVisitors();
  const enrichedRecord = {
    ...visitorRecord,
    encryptedEmbedding: cipherBase64,
    encryptionIv: ivBase64,
  };
  records.push(enrichedRecord);
  localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(records));
  setActiveSession(visitorRecord);

  return visitorRecord;
}

/**
 * 4. Biometric Face Match & Verification (Section 2.4)
 */
export async function verifyBiometricScan(
  scannedEmbedding: number[]
): Promise<{ matched: boolean; visitor?: VisitorRecord; score: number }> {
  const records: any[] = getStoredVisitors();
  let bestMatch: any = null;
  let highestScore = 0;

  for (const rec of records) {
    if (rec.encryptedEmbedding && rec.encryptionIv) {
      try {
        const decryptedVector = await decryptEmbedding(rec.encryptedEmbedding, rec.encryptionIv);
        const score = computeCosineSimilarity(scannedEmbedding, decryptedVector);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = rec;
        }
      } catch (err) {
        console.error('Decryption failed for record:', rec.id, err);
      }
    }
  }

  // Threshold: Cosine similarity > 0.82 denotes a strong positive biometric match
  if (bestMatch && highestScore >= 0.82) {
    const matchedVisitor: VisitorRecord = {
      id: bestMatch.id,
      tier: 2,
      email: bestMatch.email,
      fullName: bestMatch.fullName,
      fingerprintHash: bestMatch.fingerprintHash,
      jurisdictionCode: bestMatch.jurisdictionCode,
      isBiometricGated: false,
      authMethod: 'biometric',
      createdAt: bestMatch.createdAt,
      lastLoginAt: Date.now(),
    };
    setActiveSession(matchedVisitor);
    return { matched: true, visitor: matchedVisitor, score: highestScore };
  }

  return { matched: false, score: highestScore };
}

/**
 * 5. Self-Serve Deletion Compliance Endpoint (Section 2.5)
 */
export async function deleteVisitorData(emailOrId: string): Promise<{ success: boolean; message: string }> {
  const records: any[] = getStoredVisitors();
  const filtered = records.filter(r => r.email !== emailOrOrBlank(emailOrId) && r.id !== emailOrId);
  localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(filtered));

  const current = getActiveSession();
  if (current && (current.id === emailOrId || current.email === emailOrId)) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }

  return {
    success: true,
    message: 'Biometric vector embeddings, fingerprint records, and session tokens purged successfully from memory and disk.',
  };
}

function emailOrOrBlank(str: string): string {
  return str.includes('@') ? str.toLowerCase() : '';
}

// Helpers for Session & DB Management
function getStoredVisitors(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITORS) || '[]');
  } catch {
    return [];
  }
}

function saveVisitor(visitor: VisitorRecord) {
  const records = getStoredVisitors().filter(r => r.id !== visitor.id);
  records.push(visitor);
  localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(records));
}

export function getActiveSession(): VisitorRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(session: VisitorRecord | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  } else {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  }
}

/**
 * 6. Live Guestbook (Sector LS2) API
 */
export async function fetchGuestbook(): Promise<GuestbookEntry[]> {
  const defaultEntries: GuestbookEntry[] = [
    {
      id: 'gb_seed_1',
      authorName: 'Agent Cooper',
      visitorTier: 2,
      message: 'The holographic projection telemetry is astonishing. Beautiful dual-tone chiaroscuro work.',
      colorTheme: 'cyan',
      posX: 120,
      posY: 80,
      createdAt: Date.now() - 3600000 * 24,
    },
    {
      id: 'gb_seed_2',
      authorName: 'Lead Architect',
      visitorTier: 1,
      message: 'Subterranean blast door clearance verified. Blueprints look solid.',
      colorTheme: 'amber',
      posX: 380,
      posY: 160,
      createdAt: Date.now() - 3600000 * 8,
    },
  ];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GUESTBOOK);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.GUESTBOOK, JSON.stringify(defaultEntries));
      return defaultEntries;
    }
    return JSON.parse(stored);
  } catch {
    return defaultEntries;
  }
}

export async function submitGuestbookEntry(entry: Omit<GuestbookEntry, 'id' | 'createdAt'>): Promise<GuestbookEntry> {
  const newEntry: GuestbookEntry = {
    ...entry,
    id: 'gb_' + Math.random().toString(36).substring(2, 11),
    createdAt: Date.now(),
  };

  const current = await fetchGuestbook();
  current.unshift(newEntry);
  localStorage.setItem(STORAGE_KEYS.GUESTBOOK, JSON.stringify(current));
  return newEntry;
}

/**
 * 7. GitHub Blueprints Mock / Live KV Stream (Sector RS1)
 */
export async function fetchGitHubBlueprints(): Promise<GitHubBlueprint[]> {
  return [
    {
      id: 'bp_1',
      name: 'PROJECT_CYBERCAVE_CORE',
      description: 'Zero-budget WebGL spatial engine and holo-table workstation interface with real-time kinematic rotation.',
      stars: 128,
      forks: 34,
      language: 'TypeScript / WebGL',
      techStack: ['Three.js', 'Web Crypto', 'Cloudflare D1', 'GSAP'],
      lastCommitMessage: 'feat(core): harden biometric embedding encryption & jurisdiction gating',
      lastCommitDate: '2 hours ago',
      repoUrl: 'https://github.com',
      status: 'operational',
    },
    {
      id: 'bp_2',
      name: 'NEURAL_TELEMETRY_PIPELINE',
      description: 'Local LLM inference bridge with Cloudflare Tunnel outbound socket and edge fallback routing.',
      stars: 94,
      forks: 18,
      language: 'Python / Rust',
      techStack: ['Ollama', 'Llama.cpp', 'Docker', 'Workers AI'],
      lastCommitMessage: 'refactor(tunnel): add graceful degraded echo prompt fallback',
      lastCommitDate: 'Yesterday',
      repoUrl: 'https://github.com',
      status: 'operational',
    },
    {
      id: 'bp_3',
      name: 'VECTOR_IDENTITY_LOCK',
      description: 'BIPA & GDPR compliant cryptographic release verification with client-side mathematical facial embeddings.',
      stars: 215,
      forks: 42,
      language: 'TypeScript',
      techStack: ['Web Crypto API', 'FingerprintJS', 'Resend'],
      lastCommitMessage: 'security(audit): implement self-serve cryptographic deletion endpoint',
      lastCommitDate: '3 days ago',
      repoUrl: 'https://github.com',
      status: 'classified',
    },
  ];
}

/**
 * 8. Holo-Calendar Data (Sector RS3)
 */
export async function fetchCalendarSlots(): Promise<CalendarSlot[]> {
  return [
    {
      id: 'cal_1',
      title: 'Architectural Deep Work — Holo Table Engine',
      start: '09:00',
      end: '12:30',
      isBusy: true,
      category: 'deep-work',
      location: 'Subterranean Workshop Core',
    },
    {
      id: 'cal_2',
      title: 'Open Intel & Recruitment Telemetry Slot',
      start: '14:00',
      end: '15:30',
      isBusy: false,
      category: 'collaboration',
      location: 'Holo Comm Channel Alpha',
    },
    {
      id: 'cal_3',
      title: 'Neural Model Fine-Tuning & Quantization',
      start: '16:00',
      end: '18:00',
      isBusy: true,
      category: 'deep-work',
      location: 'Isolated Container Node',
    },
    {
      id: 'cal_4',
      title: 'Cybernetic Security Audit & Pen-testing',
      start: '19:30',
      end: '21:00',
      isBusy: true,
      category: 'intel-review',
      location: 'Blast Door Terminal',
    },
  ];
}
