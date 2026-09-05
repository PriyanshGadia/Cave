import React, { ReactNode } from 'react';
import { TelemetryHeader } from './TelemetryHeader';
import { SectorJumpNav } from './SectorJumpNav';
import { SectorId, VisitorRecord } from '../../types';
import styles from './WorkshopShell.module.css';

interface WorkshopShellProps {
  children: ReactNode;
  currentSectorId: SectorId;
  onSectorChange: (sectorId: SectorId) => void;
  activeSession: VisitorRecord | null;
  jurisdictionInfo?: { country: string; region: string; isGated: boolean };
  showNavigation?: boolean;
}

export const WorkshopShell: React.FC<WorkshopShellProps> = ({
  children,
  currentSectorId,
  onSectorChange,
  activeSession,
  jurisdictionInfo,
  showNavigation = true,
}) => {
  return (
    <div className={styles.shell}>
      {/* Scanline and CRT visual grain layers */}
      <div className="scanlines" aria-hidden="true" />
      <div className="vignette-overlay" aria-hidden="true" />
      <div className={styles.hudCircuitLines} aria-hidden="true" />

      {/* Global Telemetry Header */}
      <TelemetryHeader
        currentSector={currentSectorId}
        activeSession={activeSession}
        jurisdictionInfo={jurisdictionInfo}
      />

      {/* Corner Telemetry Readouts */}
      <div className={styles.cornerDecorTopLeft}>
        <span>CAVERN_DEPTH: -412M</span>
        <span>OPTICAL_GRID: 8K_HDR</span>
        <span>ATMOSPHERE: 98.4% N2/O2</span>
      </div>

      <div className={styles.cornerDecorTopRight}>
        <span>ENCRYPTION: AES-GCM-256</span>
        <span>LATENCY: &lt;4ms EDGE</span>
        <span>PROTOCOL: ZERO_BUDGET_v2</span>
      </div>

      {/* Main 3D Stage / Viewport */}
      <main className={styles.mainStage} id="main-content">
        {children}
      </main>

      {/* Accessible Sector Jump HUD */}
      {showNavigation && (
        <SectorJumpNav
          currentSectorId={currentSectorId}
          onSectorChange={onSectorChange}
        />
      )}
    </div>
  );
};
