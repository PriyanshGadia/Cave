import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Image, X } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface IdentityRecord {
  userId: string;
  displayName: string;
  accessLevel: string;
  status: string;
  hasFaceTemplate: boolean;
  referenceSource: string;
  registeredDevices: number;
}

interface IdentityDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonSelected?: (identity: IdentityRecord) => void;
}

export const IdentityDirectoryModal: React.FC<IdentityDirectoryModalProps> = ({
  isOpen,
  onClose,
  onPersonSelected,
}) => {
  const [identities, setIdentities] = useState<IdentityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<'OWNER' | 'TRUSTED' | 'GUEST'>('GUEST');
  const [statusMsg, setStatusMsg] = useState('');

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault/identity/directory');
      if (res.ok) {
        const data = await res.json() as any;
        setIdentities(data.identities || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddPerson = async () => {
    if (!newName.trim()) return;
    soundFx.playClickBeep();
    try {
      const res = await fetch('/api/vault/identity/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROVISION',
          displayName: newName.trim(),
          accessLevel: newLevel,
        }),
      });
      if (res.ok) {
        soundFx.playAccessGranted();
        setNewName('');
        setAddingPerson(false);
        setStatusMsg('IDENTITY PROVISIONED');
        fetchDirectory();
      }
    } catch {
      setStatusMsg('PROVISIONING FAILED');
    }
  };

  const handleAttachPhotosReference = async (userId: string) => {
    soundFx.playScannerSweep();
    setStatusMsg(`ATTACHING GOOGLE PHOTOS REFERENCE FOR ${userId}...`);
    try {
      const res = await fetch('/api/vault/identity/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ATTACH_REFERENCE',
          userId,
          source: 'google_photos_picker',
        }),
      });
      if (res.ok) {
        soundFx.playAccessGranted();
        setStatusMsg('REFERENCE TEMPLATE DERIVED & ENCRYPTED');
        fetchDirectory();
      }
    } catch {
      setStatusMsg('ATTACHING REFERENCE FAILED');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 8, 14, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'var(--font-hud, monospace)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(180deg, #091522 0%, #050b12 100%)',
          border: '1.5px solid #1f5a6b',
          borderRadius: '8px',
          padding: '24px',
          color: '#e2f4f8',
          boxShadow: '0 0 35px rgba(0, 243, 255, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #143540', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="#00f3ff" />
            <span style={{ fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.1em', color: '#00f3ff' }}>
              VAULT-01 // IDENTITY DIRECTORY ENGINE
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {statusMsg && (
          <div style={{ background: 'rgba(0, 243, 255, 0.1)', border: '1px solid #00f3ff', padding: '8px 12px', borderRadius: '4px', fontSize: '0.75rem', color: '#5fe8ff', marginBottom: '16px' }}>
            STATUS // {statusMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#7eb6c6' }}>
            RESTRICTED FIELDS: NAME · ACCESS LEVEL · FACE TEMPLATE · REGISTERED DEVICES · STATUS
          </span>
          <button
            onClick={() => setAddingPerson(!addingPerson)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 243, 255, 0.15)',
              border: '1px solid #00f3ff',
              color: '#00f3ff',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={14} />
            <span>{addingPerson ? 'CANCEL' : '+ ADD PERSON'}</span>
          </button>
        </div>

        {addingPerson && (
          <div style={{ background: 'rgba(12, 28, 42, 0.6)', border: '1px solid #1e5a6a', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: '#00f3ff', marginBottom: '10px', fontWeight: 'bold' }}>
              PROVISION NEW IDENTITY
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="DISPLAY NAME (e.g. PRIYANSH)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{
                  flex: 1,
                  background: '#040b12',
                  border: '1px solid #1e5a6a',
                  color: '#00f3ff',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  fontSize: '0.8rem',
                }}
              />
              <select
                value={newLevel}
                onChange={e => setNewLevel(e.target.value as any)}
                style={{
                  background: '#040b12',
                  border: '1px solid #1e5a6a',
                  color: '#00f3ff',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  fontSize: '0.8rem',
                }}
              >
                <option value="OWNER">OWNER</option>
                <option value="TRUSTED">TRUSTED</option>
                <option value="GUEST">GUEST</option>
              </select>
            </div>
            <button
              onClick={handleAddPerson}
              style={{
                background: '#00f3ff',
                color: '#040b12',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              SAVE PROVISIONED IDENTITY
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && <div style={{ color: '#5fe8ff', fontSize: '0.75rem', padding: '8px' }}>QUERYING IDENTITY REPOSITORY...</div>}
          {identities.map(person => (
            <div
              key={person.userId}
              style={{
                background: 'rgba(8, 18, 28, 0.7)',
                border: '1px solid #163a48',
                borderRadius: '6px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                    {person.displayName.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: person.accessLevel === 'OWNER' ? 'rgba(255, 209, 102, 0.2)' : 'rgba(0, 243, 255, 0.2)',
                      color: person.accessLevel === 'OWNER' ? '#ffd166' : '#00f3ff',
                      fontWeight: 'bold',
                    }}
                  >
                    {person.accessLevel}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6894a4', marginTop: '4px' }}>
                  REF: {person.hasFaceTemplate ? `ENROLLED (${person.referenceSource})` : 'NO TEMPLATE'} · DEVICES: {person.registeredDevices} · STATUS: {person.status.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleAttachPhotosReference(person.userId)}
                  title="Attach Google Photos reference"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(0, 243, 255, 0.1)',
                    border: '1px solid #1e5a6a',
                    color: '#5fe8ff',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  <Image size={12} />
                  <span>PHOTOS REF</span>
                </button>
                {onPersonSelected && (
                  <button
                    onClick={() => {
                      onPersonSelected(person);
                      onClose();
                    }}
                    style={{
                      background: '#00f3ff',
                      color: '#040b12',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    SELECT
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #1e5a6a',
              color: '#8ab4c2',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            CLOSE DIRECTORY
          </button>
        </div>
      </div>
    </div>
  );
};
