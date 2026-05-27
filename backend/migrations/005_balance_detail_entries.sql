-- Migration 005: Add balance_detail_entries table for itemized balance entries
-- This is separate from balance_entries (which stores monthly totals)

CREATE TABLE IF NOT EXISTS balance_detail_entries (
    id          SERIAL PRIMARY KEY,
    period      DATE NOT NULL,
    category    VARCHAR(100) NOT NULL,
    object_name VARCHAR(200) NOT NULL,
    amount      DECIMAL(15,2) NOT NULL,
    entry_type  VARCHAR(10) NOT NULL CHECK (entry_type IN ('asset', 'liability')),
    notes       TEXT,
    entered_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (period, category, object_name)
);
