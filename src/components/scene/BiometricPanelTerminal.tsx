import React, { useState } from 'react';
import { Fingerprint, Scan, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BiometricScreenCanvas } from './BiometricScreenCanvas';
import { IrisScannerAperture } from './IrisScannerAperture';
import { soundFx } from '../../utils/audio';
import { verifyBiometricScan } from '../../services/api';
import { VisitorRecord } from '../../types';
import styles from './BiometricPanelTerminal.module.css';

interface BiometricPanelTerminalProps {
  isGatedJurisdiction?: boolean;
  onRegisterClick: () => void;
  onVerificationSuccess: (visitor: VisitorRecord) => void;
  onResetClick: () => void;
  onProceedThroughDoor: () => void;
}

export const BiometricPanelTerminal: React.FC<BiometricPanelTerminalProps> = ({
  isGatedJurisdiction = false,
  onRegisterClick,
  onVerificationSuccess,
  onResetClick,
  onProceedThroughDoor,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusText, setStatusText] = useState('ONLINE // STANDBY');
  const [subText, setSubText] = useState('OPTICAL APERTURE 100%');
  const [activeBtn, setActiveBtn] = useState<'REGISTER' | 'VERIFY' | 'RESET' | null>(null);

  const handleRegister = () => {
    soundFx.playClickBeep();
    setActiveBtn('REGISTER');
    setStatusText('INITIATING CONSENT MATRIX...');
    setSubText('AFFIRMATIVE DISCLOSURE ACTIVE');
    onRegisterClick();
  };

  const handleVerify = async () => {
    soundFx.playScannerSweep();
    setIsScanning(true);
    setActiveBtn('VERIFY');
    setStatusText('SCANNING FACIAL MESH (128-D)...');
    setSubText('CALCULATING COSINE SIMILARITY');

    // Simulate real biometric vector sweep
    setTimeout(async () => {
      // Mock biometric vector extraction
      const mockVector: number[] = [];
      for (let i = 0; i < 128; i++) mockVector.push(Math.sin(i * 0.42) * 0.5 + Math.cos(i * 0.3) * 0.5);

      const result = await verifyBiometricScan(mockVector);

      if (result.matched && result.visitor) {
        soundFx.playAccessGranted();
        setIsSuccess(true);
        setStatusText('VERIFIED // TIER 2 CLEARANCE');
        setSubText(`OPERATIVE: ${result.visitor.fullName || 'RECOGNIZED'}`);
        setIsScanning(false);
        onVerificationSuccess(result.visitor);
      } else {
        // Fallback: If no previous record is enrolled, prompt enrollment
        soundFx.playClickBeep();
        setIsScanning(false);
        setStatusText('NO EMBEDDING MATCH FOUND');
        setSubText('PLEASE CLICK REGISTER TO ENROLL');
      }
    }, 1800);
  };

  const handleReset = () => {
    soundFx.playClickBeep();
    setActiveBtn('RESET');
    setIsSuccess(false);
    setIsScanning(false);
    setStatusText('RESETTING TELEMETRY BUFFER');
    setSubText('PURGED IN-MEMORY VECTORS');
    onResetClick();
    setTimeout(() => {
      setStatusText('ONLINE // STANDBY');
      setSubText('OPTICAL APERTURE 100%');
      setActiveBtn(null);
    }, 1000);
  };

  return (
    <div className={styles.terminalHousing}>
      {/* 4 Corner Heavy Industrial Hex Bolts */}
      <div className={styles.hexBoltTL} />
      <div className={styles.hexBoltTR} />
      <div className={styles.hexBoltBL} />
      <div className={styles.hexBoltBR} />

      {/* Top Cyan LED Strip */}
      <div className={styles.topLedBar} />

      {/* Header Stencil & Ledger LEDs */}
      <div className={styles.headerDecal}>
        <div className={styles.ledRow}>
          <div className={styles.greenLed} />
          <div className={styles.greenLed} style={{ animationDelay: '0.4s' }} />
          <div className={styles.greenLed} style={{ animationDelay: '0.8s' }} />
        </div>
        <span className={styles.stencilTitle}>RESTRICTED ACCESS // BIOMETRIC ALPHA</span>
        <div className={styles.warningBadge}>
          <AlertTriangle size={11} />
          <span>LVL 4</span>
        </div>
      </div>

      {/* Recessed 3D Point-Cloud Facial Screen Display */}
      <div className={styles.screenRecess}>
        <BiometricScreenCanvas
          isScanning={isScanning}
          statusText={statusText}
          subText={subText}
          isSuccess={isSuccess}
          isGated={isGatedJurisdiction}
        />
      </div>

      {/* Mechanical Iris Optical Scanner Lens */}
      <div className={styles.irisSection}>
        <span className={styles.irisLabel}>RETINAL &amp; FACIAL OPTICAL SENSOR [AUTO-FOCUS]</span>
        <IrisScannerAperture isScanning={isScanning} isSuccess={isSuccess} />
      </div>

      {/* Hardware Control Buttons: REGISTER, VERIFY, RESET */}
      <div className={styles.buttonRow}>
        <button
          className={`${styles.hwButton} ${activeBtn === 'REGISTER' ? styles.activeBtn : ''}`}
          onClick={handleRegister}
          disabled={isScanning}
          aria-label="Register Biometric Identity"
        >
          <Fingerprint size={18} />
          <span>REGISTER</span>
        </button>

        <button
          className={`${styles.hwButton} ${activeBtn === 'VERIFY' ? styles.activeBtn : ''}`}
          onClick={handleVerify}
          disabled={isScanning}
          aria-label="Verify Biometric Identity"
        >
          <Scan size={18} />
          <span>VERIFY</span>
        </button>

        <button
          className={`${styles.hwButton} ${activeBtn === 'RESET' ? styles.activeBtn : ''}`}
          onClick={handleReset}
          disabled={isScanning}
          aria-label="Reset Terminal State"
        >
          <RefreshCw size={18} />
          <span>RESET</span>
        </button>
      </div>

      {/* Access Granted Unlock Action Banner */}
      {isSuccess && (
        <button
          onClick={() => {
            soundFx.playDoorRumble();
            onProceedThroughDoor();
          }}
          style={{
            background: 'linear-gradient(90deg, rgba(0, 255, 102, 0.2) 0%, rgba(0, 243, 255, 0.3) 100%)',
            border: '1px solid #00ff66',
            borderRadius: '4px',
            color: '#00ff66',
            padding: '10px',
            fontFamily: 'var(--font-hud)',
            fontSize: '0.85rem',
            fontWeight: '700',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(0, 255, 102, 0.4)',
            cursor: 'pointer',
            animation: 'pulseGlow 2s infinite ease-in-out',
          }}
        >
          <CheckCircle2 size={18} />
          <span>ENTER WORKSHOP // OPEN BLAST DOOR</span>
        </button>
      )}

      {/* Bottom Heatsink Cooling Vents */}
      <div className={styles.heatsinkVents}>
        <div className={styles.ventSlot} />
        <div className={styles.ventSlot} />
        <div className={styles.ventSlot} />
        <div className={styles.ventSlot} />
        <div className={styles.ventSlot} />
      </div>
    </div>
  );
};
