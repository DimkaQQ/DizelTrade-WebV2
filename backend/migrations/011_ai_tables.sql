-- AI interaction logging
CREATE TABLE IF NOT EXISTS ai_interactions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    session_id  TEXT,
    role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content     TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    model       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id, created_at DESC);

-- AI system prompts (for future customization)
CREATE TABLE IF NOT EXISTS ai_system_prompts (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    content    TEXT NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed AI daily limit setting if not exists
INSERT INTO settings (key, value) VALUES ('ai_daily_limit_rub', '500')
    ON CONFLICT (key) DO NOTHING;
