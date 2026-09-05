import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { soundFx } from '../../utils/audio';
import { VisitorRecord } from '../../types';
import { getDeviceFingerprint, setActiveSession } from '../../services/api';
import styles from './MagicLinkForm.module.css';

interface MagicLinkFormProps {
  isGatedJurisdiction?: boolean;
  onSuccess: (visitor: VisitorRecord) => void;
}

export const MagicLinkForm: React.FC<MagicLinkFormProps> = ({
  isGatedJurisdiction,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    soundFx.playClickBeep();

    try {
      const fingerprint = await getDeviceFingerprint();
      const visitor: VisitorRecord = {
        id: 'vis_ml_' + Math.random().toString(36).substring(2, 9),
        tier: 1,
        email: email.trim(),
        fullName: email.split('@')[0],
        fingerprintHash: fingerprint,
        jurisdictionCode: isGatedJurisdiction ? 'GATED_SAFE' : 'STANDARD',
        isBiometricGated: !!isGatedJurisdiction,
        authMethod: 'magic_link',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      // Simulate Resend dispatch
      await new Promise(r => setTimeout(r, 600));
      setActiveSession(visitor);
      setIsSent(true);
      soundFx.playAccessGranted();

      setTimeout(() => {
        onSuccess(visitor);
      }, 1200);
    } catch (err) {
      console.error('Magic link dispatch failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.card} corner-bracket-box`}>
      <div className={styles.header}>
        <Mail size={20} className="text-amber" />
        <h3 className={styles.title}>TIER 1 RECOGNITION // MAGIC LINK</h3>
      </div>

      {isGatedJurisdiction && (
        <div className={styles.gatedNotice}>
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
          <strong>PROTECTED JURISDICTION ROUTING ACTIVE:</strong> Per local data privacy statutes (e.g. BIPA/GDPR), biometric verification is bypassed. Enter your operational email to establish recognized Tier 1 clearance without facial scanning.
        </div>
      )}

      {!isGatedJurisdiction && (
        <p className={styles.desc}>
          Authenticate via cryptographic magic-link token dispatched to your email via Resend. No passwords, zero biometric exposure.
        </p>
      )}

      {isSent ? (
        <div className={styles.successBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>MAGIC LINK TOKEN GENERATED</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Session authenticated for {email}. Uplink established. Transitioning to Workshop Core...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className={styles.inputGroup}>
            <label htmlFor="magic-email" className={styles.label}>
              OPERATIVE EMAIL ADDRESS
            </label>
            <input
              id="magic-email"
              type="email"
              className={styles.input}
              placeholder="visitor@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !email.trim()}>
            <Send size={15} />
            {isSubmitting ? 'DISPATCHING TOKEN...' : 'TRANSMIT MAGIC LINK'}
          </button>
        </form>
      )}
    </div>
  );
};
