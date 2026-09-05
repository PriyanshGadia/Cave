import React from 'react';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { SectorId } from '../../types';
import { soundFx } from '../../utils/audio';
import styles from './SectorJumpNav.module.css';

export interface SectorItem {
  id: SectorId;
  label: string;
  name: string;
  angle: number;
}

export const SECTORS: SectorItem[] = [
  { id: 'SECTOR_0', label: 'SEC 00', name: 'ENTRY HINGE // AI CORE', angle: 0 },
  { id: 'RS1', label: 'RS 01', name: 'GITHUB BLUEPRINTS', angle: 40 },
  { id: 'RS2', label: 'RS 02', name: 'TAILORED RESUME MACHINE', angle: 80 },
  { id: 'RS3', label: 'RS 03', name: 'HOLO-CALENDAR MATRIX', angle: 120 },
  { id: 'RS4_LS4', label: 'RS4/LS4', name: 'SEALED WORKBENCH [RESTRICTED]', angle: 180 },
  { id: 'LS3', label: 'LS 03', name: 'HOLO-GLOBE ARCHIVE', angle: 240 },
  { id: 'LS2', label: 'LS 02', name: 'COLLABORATIVE GUESTBOOK', angle: 280 },
  { id: 'LS1', label: 'LS 01', name: 'PUBLIC INTEL HUB', angle: 320 },
];

interface SectorJumpNavProps {
  currentSectorId: SectorId;
  onSectorChange: (sectorId: SectorId) => void;
}

export const SectorJumpNav: React.FC<SectorJumpNavProps> = ({
  currentSectorId,
  onSectorChange,
}) => {
  const currentIndex = SECTORS.findIndex(s => s.id === currentSectorId);

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + SECTORS.length) % SECTORS.length;
    soundFx.playHoverBlip();
    onSectorChange(SECTORS[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % SECTORS.length;
    soundFx.playHoverBlip();
    onSectorChange(SECTORS[nextIdx].id);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    soundFx.playClickBeep();
    onSectorChange(e.target.value as SectorId);
  };

  return (
    <nav className={styles.jumpContainer} aria-label="Holo-Table Sector Navigation">
      <button
        className={styles.navBtn}
        onClick={handlePrev}
        aria-label="Previous Sector (Counter-Clockwise)"
      >
        <ChevronLeft size={16} />
      </button>

      <div className={styles.sectorIndicator}>
        <Compass size={15} className="text-amber" />
        <select
          className={styles.sectorSelector}
          value={currentSectorId}
          onChange={handleSelect}
          aria-label="Select Holo-Table Sector"
        >
          {SECTORS.map(s => (
            <option key={s.id} value={s.id}>
              {s.label}: {s.name} ({s.angle}°)
            </option>
          ))}
        </select>
      </div>

      <button
        className={styles.navBtn}
        onClick={handleNext}
        aria-label="Next Sector (Clockwise)"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};
