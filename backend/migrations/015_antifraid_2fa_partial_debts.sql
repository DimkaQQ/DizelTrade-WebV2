-- Anti-fraud: track last login IP per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

-- 2FA: TOTP secret and enable flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Partial debt payments: link ОПЛАТА to a specific ДОЛГ
ALTER TABLE debt_records ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES debt_records(id) ON DELETE SET NULL;

-- Suspicious login events log
CREATE TABLE IF NOT EXISTS suspicious_logins (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    ip          TEXT,
    prev_ip     TEXT,
    user_agent  TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suspicious_logins_user ON suspicious_logins(user_id, detected_at DESC);
