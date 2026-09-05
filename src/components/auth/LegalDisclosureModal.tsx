import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Lock, CheckCircle2, Hash } from 'lucide-react';
import { LEGAL_DISCLOSURE_TEXT, submitConsentRelease } from '../../services/api';
import { sha256 } from '../../utils/crypto';
import { soundFx } from '../../utils/audio';
import { ConsentRecord } from '../../types';
import styles from './LegalDisclosureModal.module.css';

interface LegalDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentComplete: (consent: ConsentRecord) => void;
}

export const LegalDisclosureModal: React.FC<LegalDisclosureModalProps> = ({
  isOpen,
  onClose,
  onConsentComplete,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [disclosureHash, setDisclosureHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    sha256(LEGAL_DISCLOSURE_TEXT).then(hash => setDisclosureHash(hash.substring(0, 16) + '...'));
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    soundFx.playClickBeep();

    try {
      const consentRecord = await submitConsentRelease(fullName.trim(), email.trim());
      soundFx.playAccessGranted();
      onConsentComplete(consentRecord);
    } catch (err) {
      console.error('Consent execution failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className={`${styles.modal} corner-bracket-box`}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <ShieldCheck size={20} className="text-cyan" />
            <h2 id="consent-title" className={styles.title}>
              DIGITAL CONSENT &amp; RELEASE
            </h2>
          </div>
          <span className={styles.badge}>BIPA / GDPR HARDENED</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.hashBadge}>
            <Hash size={13} className="text-cyan" />
            <span>DISCLOSURE SHA-256 HASH: {disclosureHash}</span>
          </div>

          <div className={styles.disclosureBox} tabIndex={0} aria-label="Legal Biometric Disclosure Text">
            {LEGAL_DISCLOSURE_TEXT}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="legal-name" className={styles.label}>
              <FileText size={14} className="text-amber" />
              AFFIRMATIVE ACT: TYPE YOUR FULL LEGAL NAME
            </label>
            <input
              id="legal-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Johnathan Q. Public"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="legal-email" className={styles.label}>
              <Lock size={14} className="text-cyan" />
              DISPATCH COPY OF DIGITAL RELEASE TO EMAIL (RESEND)
            </label>
            <input
              id="legal-email"
              type="email"
              className={styles.input}
              placeholder="operative@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              CANCEL
            </button>
            <button
              type="submit"
              className={styles.signBtn}
              disabled={isSubmitting || !fullName.trim() || !email.trim()}
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'SIGNING & DISPATCHING...' : 'EXECUTE WRITTEN RELEASE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
