export type VisitorTier = 0 | 1 | 2;

export interface VisitorRecord {
  id: string;
  tier: VisitorTier;
  email?: string;
  fullName?: string;
  fingerprintHash: string;
  jurisdictionCode: string;
  isBiometricGated: boolean;
  authMethod: 'anonymous' | 'magic_link' | 'biometric' | 'phone_otp';
  createdAt: number;
  lastLoginAt: number;
}

export interface ConsentRecord {
  id: string;
  visitorId: string;
  fullName: string;
  disclosureHash: string;
  timestamp: number;
  emailSent: boolean;
}

export type SectorId =
  | 'SECTOR_0'
  | 'RS1'
  | 'RS2'
  | 'RS3'
  | 'RS4_LS4'
  | 'LS3'
  | 'LS2'
  | 'LS1';

export interface SectorMetadata {
  id: SectorId;
  code: string;
  angle: number; // in degrees: 0 to 360 (40 deg increments)
  title: string;
  tagline: string;
  status: 'active' | 'sealed' | 'preview';
  badgeColor: string;
}

export interface GuestbookEntry {
  id: string;
  authorName: string;
  visitorTier: VisitorTier;
  message: string;
  inkStrokesJson?: string;
  colorTheme: 'cyan' | 'amber' | 'green' | 'white';
  posX: number;
  posY: number;
  createdAt: number;
}

export interface GitHubBlueprint {
  id: string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  techStack: string[];
  lastCommitMessage: string;
  lastCommitDate: string;
  repoUrl: string;
  status: 'operational' | 'classified' | 'experimental';
}

export interface CalendarSlot {
  id: string;
  title: string;
  start: string;
  end: string;
  isBusy: boolean;
  category: 'deep-work' | 'collaboration' | 'intel-review' | 'offline';
  location: string;
}

export type DoorPanelMode = 'INITIAL' | 'REGISTER' | 'VERIFY' | 'CONSENT' | 'MAGIC_LINK' | 'SUCCESS';
