-- Migration 001: tariff history (valid_from + comment)
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS valid_from DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add missing sites if not present
INSERT INTO sites (name) VALUES ('Акурдан') ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Нагорная') ON CONFLICT DO NOTHING;
