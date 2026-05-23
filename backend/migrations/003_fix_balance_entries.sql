-- Migration 003: Fix balance_entries table to match analytics.py expectations
-- Old table had (period_year, period_month, category, label, amount, entry_type)
-- New table uses (balance_date DATE UNIQUE, assets, liabilities, notes, created_by)

DROP TABLE IF EXISTS balance_entries;

CREATE TABLE balance_entries (
    id           SERIAL PRIMARY KEY,
    balance_date DATE NOT NULL UNIQUE,
    assets       DECIMAL(15,2) DEFAULT 0,
    liabilities  DECIMAL(15,2) DEFAULT 0,
    notes        TEXT,
    created_by   INT REFERENCES users(id),
    created_at   TIMESTAMP DEFAULT NOW()
);
