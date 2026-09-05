-- D1 Database Schema for The Workshop
-- Version 2.0 (Hardened Legal Consent & Biometrics)

-- 1. Visitors and Access Tiers
CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    tier INTEGER NOT NULL DEFAULT 0, -- 0: Anonymous, 1: Recognized (Magic link), 2: Verified (Biometric/Phone)
    email TEXT UNIQUE,
    full_name TEXT,
    fingerprint_hash TEXT,
    encrypted_embedding TEXT, -- AES-GCM encrypted mathematical vector base64
    encryption_iv TEXT,       -- IV for AES-GCM
    jurisdiction_code TEXT,   -- Country/Region code (e.g. US-IL, GB, DE)
    is_biometric_gated INTEGER NOT NULL DEFAULT 0, -- 1 if jurisdiction restricts biometrics
    auth_method TEXT NOT NULL DEFAULT 'anonymous', -- 'anonymous' | 'magic_link' | 'biometric' | 'phone_otp'
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login_at INTEGER NOT NULL DEFAULT (unixepoch()),
    status TEXT NOT NULL DEFAULT 'active' -- 'active' | 'deleted' | 'flagged'
);

-- 2. Legal Digital Release & Consent Audit Records (Stored separately for compliance defense)
CREATE TABLE IF NOT EXISTS consent_releases (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    disclosure_hash TEXT NOT NULL, -- SHA-256 hash of the exact legal disclosure text shown
    ip_hash TEXT NOT NULL,         -- SHA-256 salted hash of IP address
    user_agent TEXT,
    fingerprint_hash TEXT,
    email_recipient TEXT,
    email_dispatched_at INTEGER,
    consent_given_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY(visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
);

-- 3. Live Collaborative Guestbook (Sector LS2)
CREATE TABLE IF NOT EXISTS guestbook_entries (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    visitor_tier INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    ink_strokes_json TEXT,         -- Optional freehand pen vector strokes (JSON serialized)
    color_theme TEXT NOT NULL DEFAULT 'cyan', -- 'cyan' | 'amber' | 'green' | 'white'
    pos_x REAL NOT NULL DEFAULT 0, -- Relative X on the infinite canvas
    pos_y REAL NOT NULL DEFAULT 0, -- Relative Y on the infinite canvas
    ip_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    is_hidden INTEGER NOT NULL DEFAULT 0 -- Owner moderation flag
);

-- 4. Rate Limiting and Abuse Prevention
CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash TEXT PRIMARY KEY, -- Hash of (IP + Action) or (Fingerprint + Action)
    request_count INTEGER NOT NULL DEFAULT 1,
    window_expires_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON visitors(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(window_expires_at);
