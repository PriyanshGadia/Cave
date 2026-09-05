import React, { useState } from 'react';
import { Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { deleteVisitorData } from '../../services/api';
import { soundFx } from '../../utils/audio';
import styles from './SelfServeDeletionTerminal.module.css';

interface SelfServeDeletionTerminalProps {
  onDeleted?: () => void;
}

export const SelfServeDeletionTerminal: React.FC<SelfServeDeletionTerminalProps> = ({ onDeleted }) => {
  const [identifier, setIdentifier] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsDeleting(true);
    soundFx.playClickBeep();

    try {
      const result = await deleteVisitorData(identifier.trim());
      setResultMessage(result.message);
      soundFx.playAccessGranted();
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error('Deletion error:', err);
      setResultMessage('Purge failed. Verification code mismatch or record not found.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${styles.terminal} corner-bracket-box`}>
      <div className={styles.header}>
        <ShieldAlert size={20} className="text-red" />
        <h3 className={styles.title}>SELF-SERVE DATA PURGE TERMINAL (SEC 2.5)</h3>
      </div>

      <div className={styles.warningBox}>
        <strong>GDPR / CCPA / BIPA COMPLIANCE:</strong> Requesting erasure immediately purges all encrypted face embedding vectors, device fingerprints, and local tokens from disk. Historical legal consent releases are preserved solely for audit trails.
      </div>

      {resultMessage ? (
        <div className={styles.statusMessage} style={{ background: 'rgba(0, 255, 102, 0.1)', color: 'var(--text-green)', border: '1px solid var(--color-green-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
            <CheckCircle2 size={16} />
            <strong>PURGE COMPLETE</strong>
          </div>
          <p>{resultMessage}</p>
        </div>
      ) : (
        <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="delete-id" style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-telemetry)' }}>
              OPERATIVE EMAIL OR VISITOR ID
            </label>
            <input
              id="delete-id"
              type="text"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}
              placeholder="visitor@domain.com or vis_bio_..."
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.deleteBtn}
            disabled={isDeleting || !identifier.trim()}
          >
            <Trash2 size={16} />
            {isDeleting ? 'PURGING FROM DISK & MEMORY...' : 'PURGE ALL MY BIOMETRIC & TELEMETRY DATA'}
          </button>
        </form>
      )}
    </div>
  );
};
