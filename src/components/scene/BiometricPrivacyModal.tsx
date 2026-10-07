import React, { useState } from 'react';
import { Shield, Lock, CheckSquare, Square, AlertCircle, Check } from 'lucide-react';

interface BiometricPrivacyModalProps {
  isOpen: boolean;
  onConsent: (data: { declaredName: string; declarationDigest: string }) => void;
  onDecline: () => void;
}

export const BiometricPrivacyModal: React.FC<BiometricPrivacyModalProps> = ({
  isOpen,
  onConsent,
  onDecline,
}) => {
  const [declaredName, setDeclaredName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAcceptAndSign = async () => {
    if (!declaredName.trim()) {
      setErrorMsg('OPERATIVE DECLARATION REQUIRED: Enter your full identity name.');
      return;
    }
    if (!nameConfirmed) {
      setErrorMsg('CONFIRMATION REQUIRED: Check the identity declaration confirmation.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('ACCEPTANCE REQUIRED: Check the electronic acceptance box.');
      return;
    }

    setErrorMsg(null);
    const declarationText = `VAULT-01 IDENTITY DECLARATION // NAME: ${declaredName.trim()} // NOTICE: DPDP-2026-v2 // TERMS: 1.0 // NON-KYC ATTESTATION`;
    const encoder = new TextEncoder();
    const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(declarationText));
    const digestArray = Array.from(new Uint8Array(digestBuffer));
    const declarationDigest = digestArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    onConsent({
      declaredName: declaredName.trim(),
      declarationDigest,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(2, 6, 12, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'ui-monospace, Menlo, Consolas, "JetBrains Mono", monospace',
        color: '#c5e2eb',
      }}
    >
      {/* Scanline Texture Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />

      {/* Diegetic Security Document Housing */}
      <div
        style={{
          position: 'relative',
          width: 'min(780px, 94vw)',
          maxHeight: '90vh',
          backgroundColor: 'rgba(4, 14, 24, 0.98)',
          border: '1.5px solid #1e5a68',
          boxShadow: '0 0 45px rgba(0, 240, 255, 0.18), inset 0 0 30px rgba(0, 20, 30, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '2px',
        }}
      >
        {/* Terminal Header Bar */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(6, 22, 36, 0.95)',
            borderBottom: '1.5px solid #1e5a68',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={16} color="#00f0ff" />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.12em', color: '#5fe8ff' }}>
                VAULT-01 / IDENTITY PROTOCOL
              </div>
              <div style={{ fontSize: '8.5px', letterSpacing: '0.08em', color: '#6ea8b8' }}>
                SECURITY CLASSIFICATION: RESTRICTED // AUTHORIZED ACCESS ONLY
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '8px',
                color: '#ffd166',
                border: '1px solid rgba(255, 209, 102, 0.4)',
                padding: '2px 6px',
                letterSpacing: '0.06em',
                background: 'rgba(255, 209, 102, 0.08)',
              }}
            >
              DPDP-2026-v2 · STATUTORY NOTICE
            </span>
          </div>
        </div>

        {/* Technical Subheader Ledger */}
        <div
          style={{
            padding: '6px 16px',
            backgroundColor: 'rgba(3, 10, 18, 0.8)',
            borderBottom: '1px solid #143542',
            fontSize: '8.5px',
            color: '#4d8394',
            display: 'flex',
            justifyContent: 'space-between',
            letterSpacing: '0.05em',
          }}
        >
          <span>TERMINAL: SEC-NODE-01A</span>
          <span>DOCUMENT REF: IP-NOTICE-REV4</span>
          <span>AUTHORITY: SERVER-ENFORCED GATEWAY</span>
        </div>

        {/* Scrollable Technical Document Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontSize: '10px',
            lineHeight: 1.55,
            color: '#a7d5e4',
          }}
        >
          {/* Document Title Callout */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(0, 240, 255, 0.05)',
              borderLeft: '3px solid #00f0ff',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.06em' }}>
              PERSONAL DATA &amp; BIOMETRIC PROCESSING NOTICE
            </div>
            <div style={{ fontSize: '9px', color: '#7ec5df', marginTop: '2px' }}>
              Issued pursuant to DPDP Rules 2025 &amp; Biometric Information Protection Standards. Review all items prior to attestation.
            </div>
          </div>

          {/* Section 01 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              01 WHAT IS COLLECTED
            </div>
            <div style={{ color: '#8ec5d6' }}>
              • <strong style={{ color: '#cbf5ff' }}>Declared Identity Name:</strong> Operative or legal designation supplied during enrollment.<br />
              • <strong style={{ color: '#cbf5ff' }}>Device Telemetry:</strong> Contextual continuity signals including hardware concurrency, canvas hash, display attributes, and platform identifier.<br />
              • <strong style={{ color: '#cbf5ff' }}>Cryptographic Authenticator:</strong> P-256 ECDSA public key credential registered via WebAuthn.<br />
              • <strong style={{ color: '#cbf5ff' }}>Mathematical Biometric Template:</strong> 128-dimensional normalized facial feature vector extracted from live camera frames.<br />
              • <strong style={{ color: '#cbf5ff' }}>Security Logs:</strong> Timestamped challenge IDs, IP hash digests, and rate-limiting audit records.
            </div>
          </div>

          {/* Section 02 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              02 WHY IT IS PROCESSED
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Personal data is processed strictly for: (a) authenticating authorized operators; (b) verifying continuous control of the registered hardware authenticator; (c) confirming interactive freshness via active liveness challenges; (d) enforcing tier-based blast door access levels; and (e) maintaining write-ahead immutable security audit logs. Personal data is never used for commercial advertising, public tracking, or third-party behavioral profiling.
            </div>
          </div>

          {/* Section 03 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              03 BIOMETRIC TEMPLATE ARCHITECTURE
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Raw optical camera frames are processed in volatile client memory and <strong>destroyed immediately</strong> after mathematical vector extraction. No raw facial photographs are stored in the biometric database. The resulting 128-D vector is encrypted client-side using AES-GCM-256 with keys derived from single-use server liveness tokens before transmission. Server-side templates are stored encrypted at rest with AES-GCM Key-Encryption-Keys (KEK).
            </div>
          </div>

          {/* Section 04 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              04 DEVICE AUTHENTICATOR (WEBAUTHN)
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Hardware authenticator registration relies on the W3C WebAuthn standard (P-256 ECDSA). This binds enrollment to your physical device security module or hardware security key. <em>Note: Authenticator possession proves physical hardware control, not civil legal identity.</em>
            </div>
          </div>

          {/* Section 05 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              05 GOOGLE PHOTOS REFERENCES (OPTIONAL)
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Google Photos is an optional reference source used exclusively for initial enrollment template enrichment. VAULT-01 does not utilize Google Photos as an identity database, does not create Google People or face clusters, and accesses only media items explicitly chosen through the official Google Photos Picker session (scope: <code style={{ color: '#38bdf8' }}>photospicker.mediaitems.readonly</code>). Upon reference template derivation, the Picker session is deleted and temporary image bytes are permanently zeroed.
            </div>
          </div>

          {/* Section 06 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              06 RETENTION POLICY
            </div>
            <div style={{ color: '#8ec5d6' }}>
              • Raw camera frames: Ephemeral (0 seconds retention; destroyed in RAM).<br />
              • Encrypted biometric vectors: Retained only for the active lifespan of the enrolled identity record.<br />
              • Audit logs: Retained in tamper-evident server logs per facility security retention rules.
            </div>
          </div>

          {/* Section 07 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              07 WITHDRAWAL &amp; DELETION
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Operators retain the technical right to withdraw biometric consent at any time. Revoking an enrolled device or requesting identity deletion permanently purges encrypted biometric templates from Cloudflare D1 storage and invalidates all associated authentication credentials.
            </div>
          </div>

          {/* Section 08 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              08 DATA PRINCIPAL RIGHTS
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Under applicable data protection frameworks (including DPDP Rules 2025), you possess the right to: (1) access a summary of personal data processed; (2) request correction or updating of your declared designation; (3) request erasure of biometric credentials; and (4) access accessible grievance redressal mechanisms through terminal administration.
            </div>
          </div>

          {/* Section 09 */}
          <div>
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '3px' }}>
              09 SECURITY CONTROLS
            </div>
            <div style={{ color: '#8ec5d6' }}>
              Enforced defenses include single-use cryptographic challenges (60s TTL), sliding-window IP and device rate limiting via Cloudflare KV, strict server-side vector decryption and cosine distance threshold matching, and fail-closed authorization gateway logic.
            </div>
          </div>

          {/* Section 10: Merged Identity Declaration */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(0, 30, 48, 0.6)',
              border: '1px solid #00f0ff',
              borderRadius: '2px',
              marginTop: '4px',
            }}
          >
            <div style={{ color: '#00f0ff', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={13} />
              <span>10 IDENTITY DECLARATION // OPERATIVE DESIGNATION</span>
            </div>
            <div style={{ fontSize: '9px', color: '#8ec5d6', marginBottom: '10px' }}>
              I confirm that the name entered below is my correct identity name for this VAULT-01 identity record. I understand that this declaration is associated with my registered authenticator, device record, biometric enrollment and access level. I understand that providing a false identity may result in denial, suspension or removal of vault access. <strong>I understand that this declaration does not constitute government identity verification unless a separate identity-verification procedure has been completed.</strong>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '8.5px', color: '#5fe8ff', letterSpacing: '0.06em', marginBottom: '4px' }}>
                FULL OPERATIVE / OPERATOR NAME:
              </label>
              <input
                type="text"
                value={declaredName}
                onChange={(e) => setDeclaredName(e.target.value)}
                placeholder="ENTER FULL OPERATIVE NAME"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(2, 10, 18, 0.95)',
                  border: '1.5px solid #1e5a68',
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  letterSpacing: '0.08em',
                  padding: '8px 10px',
                  outline: 'none',
                }}
              />
            </div>

            <div
              onClick={() => setNameConfirmed(!nameConfirmed)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '9px',
                color: nameConfirmed ? '#4dff8a' : '#7ec5df',
              }}
            >
              {nameConfirmed ? <CheckSquare size={14} color="#4dff8a" /> : <Square size={14} color="#4d8394" />}
              <span>I confirm that this is the correct name I wish to associate with this VAULT-01 identity.</span>
            </div>
          </div>

          {/* Section 11: Electronic Acceptance */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(3, 16, 28, 0.7)',
              border: '1px solid #1e5a68',
              borderRadius: '2px',
            }}
          >
            <div style={{ color: '#5fe8ff', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '6px' }}>
              11 ELECTRONIC ATTESTATION &amp; ACCEPTANCE
            </div>
            <div
              onClick={() => setTermsAccepted(!termsAccepted)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '9.5px',
                color: termsAccepted ? '#00f0ff' : '#8ec5d6',
              }}
            >
              {termsAccepted ? <CheckSquare size={15} color="#00f0ff" /> : <Square size={15} color="#4d8394" />}
              <span>
                I have read and accept the terms of this Identity Protocol and Biometric Processing Notice, and declare my identity as recorded above.
              </span>
            </div>
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div
              style={{
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 90, 90, 0.15)',
                border: '1px solid #ff5a5a',
                color: '#ff8a8a',
                fontSize: '9px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={13} color="#ff5a5a" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Ledger */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(4, 14, 24, 0.98)',
            borderTop: '1.5px solid #1e5a68',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '8px', color: '#4d8394' }}>
            STATUS: ELECTRONIC ACCEPTANCE AUDITABLE · RECORDED SERVER-SIDE
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onDecline}
              style={{
                background: 'transparent',
                border: '1px solid #234552',
                color: '#7ec5df',
                padding: '7px 16px',
                fontSize: '9.5px',
                fontWeight: 'bold',
                letterSpacing: '0.08em',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              [ DECLINE ]
            </button>
            <button
              onClick={handleAcceptAndSign}
              style={{
                background: 'rgba(0, 240, 255, 0.18)',
                border: '1.5px solid #00f0ff',
                color: '#ffffff',
                padding: '7px 18px',
                fontSize: '9.5px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                fontFamily: 'inherit',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={13} color="#00f0ff" />
              <span>[ ACCEPT &amp; SIGN ATTESTATION ]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
