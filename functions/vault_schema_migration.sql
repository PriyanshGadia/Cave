CREATE TABLE IF NOT EXISTS vault_users (
    id            TEXT PRIMARY KEY,
    display_name  TEXT NOT NULL,
    access_level  TEXT NOT NULL DEFAULT 'GUEST'  CHECK (access_level IN ('VISITOR','GUEST','TRUSTED','OWNER')),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    last_seen_at  INTEGER
);
CREATE TABLE IF NOT EXISTS vault_devices (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL,
    device_binding_hash     TEXT NOT NULL UNIQUE,
    webauthn_credential_id  TEXT UNIQUE,
    webauthn_public_key     TEXT,
    sign_count              INTEGER NOT NULL DEFAULT 0,
    device_label            TEXT,
    status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
    first_seen_at           INTEGER NOT NULL DEFAULT (unixepoch()),
    last_seen_at            INTEGER NOT NULL DEFAULT (unixepoch()),
    last_ip_hash            TEXT,
    FOREIGN KEY(user_id) REFERENCES vault_users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS vault_biometrics (
    user_id                       TEXT PRIMARY KEY,
    biometric_template_ciphertext TEXT NOT NULL,
    template_iv                   TEXT NOT NULL,
    template_version              INTEGER NOT NULL DEFAULT 1,
    encryption_key_version        TEXT NOT NULL DEFAULT 'v1',
    source_type                   TEXT NOT NULL DEFAULT 'live_camera' CHECK (source_type IN ('live_camera','google_photos_picker')),
    embedding_hash                TEXT,
    created_at                    INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at                    INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY(user_id) REFERENCES vault_users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS vault_challenges (
    id             TEXT PRIMARY KEY,
    user_id        TEXT,
    device_id      TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('WEBAUTHN_REGISTER','WEBAUTHN_AUTH','LIVENESS','ENROLL_SESSION')),
    challenge_data TEXT,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at     INTEGER NOT NULL,
    used_at        INTEGER,
    FOREIGN KEY(user_id) REFERENCES vault_users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS vault_sessions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT,
    device_id        TEXT NOT NULL,
    access_level     TEXT NOT NULL,
    capabilities     TEXT NOT NULL,
    issued_at        INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at       INTEGER NOT NULL,
    last_activity_at INTEGER NOT NULL DEFAULT (unixepoch()),
    revoked_at       INTEGER
);
CREATE TABLE IF NOT EXISTS vault_audit_log (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    device_id   TEXT,
    session_id  TEXT,
    event       TEXT NOT NULL,
    result      TEXT NOT NULL CHECK (result IN ('SUCCESS','FAILURE','DENIED','CONFLICT')),
    reason_code TEXT,
    ip_hash     TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    metadata    TEXT
);
CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash           TEXT PRIMARY KEY,
    request_count      INTEGER NOT NULL DEFAULT 0,
    window_expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vault_users_status    ON vault_users(status, access_level);
CREATE INDEX IF NOT EXISTS idx_vault_devices_user    ON vault_devices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vault_devices_binding ON vault_devices(device_binding_hash);
CREATE INDEX IF NOT EXISTS idx_vault_challenges_expiry ON vault_challenges(expires_at, used_at);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_user   ON vault_sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_device ON vault_sessions(device_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_vault_audit_user      ON vault_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_device    ON vault_audit_log(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_event     ON vault_audit_log(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_biometrics_hash ON vault_biometrics(embedding_hash);
