import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Globe,
  KeyRound,
  FileCheck,
  RefreshCw,
  Zap,
  Eye,
  Trash2
} from 'lucide-react';
import {
  detectJurisdiction,
  getDeviceFingerprint,
  registerBiometricEmbedding,
  verifyBiometricScan,
  getActiveSession,
  setActiveSession,
} from '../../services/api';
import { LegalDisclosureModal } from './LegalDisclosureModal';
import { MagicLinkForm } from './MagicLinkForm';
import { SelfServeDeletionTerminal } from './SelfServeDeletionTerminal';
import { VisitorRecord } from '../../types';
import { soundFx } from '../../utils/audio';
import styles from './CredentialTestingConsole.module.css';

// Helper to generate mock mathematical facial vector embedding (128 dimensions)
function generateMockFaceVector(seed: number = 0.5): number[] {
  const vec = [];
  for (let i = 0; i < 128; i++) {
    vec.push(Math.sin(i * seed) * 0.5 + Math.cos(i * 0.3) * 0.5);
  }
  return vec;
}

export const CredentialTestingConsole: React.FC = () => {
  const [fingerprint, setFingerprint] = useState<string>('extracting...');
  const [jurisdiction, setJurisdiction] = useState<{ country: string; region: string; isGated: boolean }>({
    country: 'US',
    region: 'GLOBAL',
    isGated: false,
  });
  const [activeUser, setActiveUser] = useState<VisitorRecord | null>(getActiveSession());
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [registeredEmbedding, setRegisteredEmbedding] = useState<{ cipher: string; iv: string } | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ matched: boolean; score: number } | null>(null);

  useEffect(() => {
    getDeviceFingerprint().then(setFingerprint);
    detectJurisdiction().then(setJurisdiction);
  }, []);

  const toggleJurisdictionSim = () => {
    soundFx.playClickBeep();
    setJurisdiction(prev => ({
      country: prev.isGated ? 'US' : 'EU-DE',
      region: prev.isGated ? 'GLOBAL' : 'EU/GDPR RESTRICTED',
      isGated: !prev.isGated,
    }));
  };

  const testRegisterBiometric = async () => {
    soundFx.playScannerSweep();
    const mockVector = generateMockFaceVector(0.42);
    const user = await registerBiometricEmbedding('Dr. Maya Lin', 'maya.lin@lab.org', mockVector);
    setActiveUser(user);

    // Read stored cipher
    const stored = JSON.parse(localStorage.getItem('workshop_visitors_v2') || '[]');
    const rec = stored.find((r: any) => r.id === user.id);
    if (rec) {
      setRegisteredEmbedding({ cipher: rec.encryptedEmbedding, iv: rec.encryptionIv });
    }
  };

  const testVerifyMatch = async (isCorrectPerson: boolean) => {
    soundFx.playScannerSweep();
    // Similar seed = match (> 0.95), divergent seed = no match (< 0.2)
    const scanVector = generateMockFaceVector(isCorrectPerson ? 0.42 : 0.99);
    const res = await verifyBiometricScan(scanVector);
    setVerificationResult(res);
    if (res.matched) {
      soundFx.playAccessGranted();
      setActiveUser(res.visitor || null);
    }
  };

  const handleLogout = () => {
    soundFx.playClickBeep();
    setActiveSession(null);
    setActiveUser(null);
    setVerificationResult(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <h2>
            <ShieldCheck size={24} className="text-cyan" />
            SECTION 2 CREDENTIAL &amp; IDENTITY AUDIT CONSOLE
          </h2>
          <p>
            Hardened biometric vector encryption, BIPA written release hashing, jurisdiction gating &amp; zero-leak verification.
          </p>
        </div>

        <div className={styles.jurisdictionToggleBar}>
          <Globe size={16} className={jurisdiction.isGated ? 'text-amber' : 'text-cyan'} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-telemetry)' }}>
            SIMULATE REGION: <strong>{jurisdiction.region}</strong>
          </span>
          <button
            className={styles.actionBtn}
            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
            onClick={toggleJurisdictionSim}
          >
            <RefreshCw size={12} />
            TOGGLE GATING
          </button>
        </div>
      </div>

      {/* Grid of Section 2 sub-systems */}
      <div className={styles.grid}>
        {/* Panel 1: Jurisdiction & Anti-Abuse Signal */}
        <div className={`${styles.panel} corner-bracket-box`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Globe size={18} className="text-cyan" />
              1. JURISDICTION &amp; FINGERPRINT
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>SEC 2.3</span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <p><strong>Device Anti-Abuse Signal:</strong></p>
            <div className={styles.codeBlock}>{fingerprint}</div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <p><strong>Biometric Gating Status:</strong></p>
            <div style={{ marginTop: '4px', color: jurisdiction.isGated ? 'var(--text-amber)' : 'var(--text-green)' }}>
              {jurisdiction.isGated
                ? '⚠️ GATED: Illinois BIPA / GDPR strict zone detected. Auto-routing to Tier 1 magic-link.'
                : '✓ CLEAR: Standard zone. Tier 2 biometric scanning permitted with affirmative written consent.'}
            </div>
          </div>

          {activeUser && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--mat-border-dark)', paddingTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-cyan)' }}>
                ACTIVE CLEARANCE: TIER {activeUser.tier} ({activeUser.fullName || activeUser.email})
              </span>
              <button
                onClick={handleLogout}
                style={{ display: 'block', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-amber)', textDecoration: 'underline' }}
              >
                Reset / Log Out Session
              </button>
            </div>
          )}
        </div>

        {/* Panel 2: Legal Digital Written Consent (Sec 2.2) */}
        <div className={`${styles.panel} corner-bracket-box`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <FileCheck size={18} className="text-amber" />
              2. LEGAL CONSENT RELEASE
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>SEC 2.2</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Illinois BIPA-grade affirmative written consent release. Generates a SHA-256 hash of the exact disclosure text and emails a copy to the operative via Resend.
          </p>

          <button className={styles.actionBtn} onClick={() => setIsConsentOpen(true)}>
            <Zap size={15} />
            LAUNCH FULL-SCREEN LEGAL DISCLOSURE
          </button>
        </div>

        {/* Panel 3: AES-GCM Encrypted Face Vectors (Sec 2.1) */}
        <div className={`${styles.panel} corner-bracket-box`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Lock size={18} className="text-cyan" />
              3. ENCRYPTED EMBEDDINGS (NO RAW PHOTOS)
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>SEC 2.1</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Only 128-dimensional Float32 vector embeddings are captured and encrypted at rest with AES-GCM-256 before disk storage.
          </p>

          <button className={styles.actionBtn} onClick={testRegisterBiometric}>
            <KeyRound size={15} />
            SIMULATE BIOMETRIC ENROLLMENT
          </button>

          {registeredEmbedding && (
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CIPHERTEXT IN D1 (BASE64):</span>
              <div className={styles.codeBlock}>{registeredEmbedding.cipher}</div>
            </div>
          )}
        </div>

        {/* Panel 4: In-Memory Cosine Similarity Matcher (Sec 2.4) */}
        <div className={`${styles.panel} corner-bracket-box`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Eye size={18} className="text-green" />
              4. REAL-TIME VECTOR MATCHER
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>SEC 2.4</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={styles.actionBtn}
              style={{ flex: 1 }}
              onClick={() => testVerifyMatch(true)}
            >
              TEST MATCH (SAME FACE)
            </button>
            <button
              className={styles.actionBtn}
              style={{ flex: 1, borderColor: 'var(--color-red-alert)', color: 'var(--color-red-alert)' }}
              onClick={() => testVerifyMatch(false)}
            >
              TEST MISMATCH
            </button>
          </div>

          {verificationResult && (
            <div style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: verificationResult.matched ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 51, 75, 0.1)',
              border: `1px solid ${verificationResult.matched ? 'var(--color-green-glow)' : 'var(--color-red-alert)'}`,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-telemetry)'
            }}>
              <div>COSINE SIMILARITY SCORE: <strong>{(verificationResult.score * 100).toFixed(2)}%</strong></div>
              <div>STATUS: <strong>{verificationResult.matched ? '✓ IDENTITY VERIFIED (TIER 2)' : '✗ MATCH FAILED (<82% THRESHOLD)'}</strong></div>
            </div>
          )}
        </div>

        {/* Panel 5: Gated Fallback / Magic Link Form */}
        <div className={`${styles.panel} corner-bracket-box`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <KeyRound size={18} className="text-amber" />
              5. MAGIC LINK TIER 1 AUTH
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>SEC 2.3</span>
          </div>

          <MagicLinkForm
            isGatedJurisdiction={jurisdiction.isGated}
            onSuccess={user => setActiveUser(user)}
          />
        </div>

        {/* Panel 6: Self-Serve Deletion Terminal (Sec 2.5) */}
        <div className={`${styles.panel} corner-bracket-box`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Trash2 size={18} className="text-red" />
              6. DATA RIGHTS &amp; PURGE TERMINAL
            </span>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>SEC 2.5</span>
          </div>

          <SelfServeDeletionTerminal onDeleted={() => setActiveUser(null)} />
        </div>
      </div>

      {/* Legal Written Consent Modal */}
      <LegalDisclosureModal
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        onConsentComplete={_consent => {
          setIsConsentOpen(false);
          setActiveUser(getActiveSession());
        }}
      />
    </div>
  );
};
