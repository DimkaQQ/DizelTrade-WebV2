CREATE TABLE IF NOT EXISTS login_attempts (
    id             SERIAL PRIMARY KEY,
    ip             TEXT,
    username_tried TEXT,
    success        BOOLEAN DEFAULT FALSE,
    attempted_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    refresh_token_hash TEXT NOT NULL,
    ip              TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, is_active);
