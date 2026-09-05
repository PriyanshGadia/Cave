import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Shield, Radio, Activity } from 'lucide-react';
import { soundFx } from '../../utils/audio';
import { VisitorRecord } from '../../types';
import styles from './TelemetryHeader.module.css';

interface TelemetryHeaderProps {
  currentSector: string;
  activeSession: VisitorRecord | null;
  jurisdictionInfo?: { country: string; region: string; isGated: boolean };
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({
  currentSector,
  activeSession,
  jurisdictionInfo,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(soundFx.getMuted());

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toTimeString().split(' ')[0] + ' UTC' + (d.getTimezoneOffset() <= 0 ? '+' : '-') +
        Math.abs(d.getTimezoneOffset() / 60)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
    if (!muted) soundFx.playClickBeep();
  };

  const getTierInfo = () => {
    if (!activeSession || activeSession.tier === 0) {
      return { label: 'TIER 0 // ANONYMOUS', style: styles.tier0 };
    }
    if (activeSession.tier === 1) {
      return { label: 'TIER 1 // RECOGNIZED', style: styles.tier1 };
    }
    return { label: 'TIER 2 // VERIFIED OPERATIVE', style: styles.tier2 };
  };

  const tier = getTierInfo();

  return (
    <header className={styles.header}>
      <div className={styles.leftGroup}>
        <div className={styles.systemBadge}>
          <span className={styles.pulseDot} />
          <span>WORKSHOP OS v2.0</span>
        </div>
        <div className={styles.telemetryItem}>
          <Radio size={14} className="text-cyan" />
          <span>SECTOR:</span>
          <span className={styles.highlight}>{currentSector}</span>
        </div>
        <div className={styles.telemetryItem}>
          <Activity size={14} className="text-amber" />
          <span>SYS TIME:</span>
          <span className={styles.highlight}>{timeStr}</span>
        </div>
      </div>

      <div className={styles.rightGroup}>
        {jurisdictionInfo && (
          <div className={styles.telemetryItem}>
            <span>NODE:</span>
            <span className={styles.highlight}>{jurisdictionInfo.region}</span>
            {jurisdictionInfo.isGated && <span className="text-amber">[GATED]</span>}
          </div>
        )}

        <div className={`${styles.tierBadge} ${tier.style}`}>
          <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {tier.label}
        </div>

        <button
          className={styles.audioBtn}
          onClick={toggleSound}
          title={isMuted ? 'Unmute Synthetic Audio' : 'Mute Audio'}
          aria-label="Toggle Audio"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </header>
  );
};
