CREATE TABLE IF NOT EXISTS onboarding_progress (
    user_id     INTEGER NOT NULL REFERENCES users(id),
    step_key    TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, step_key)
);
