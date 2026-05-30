-- Add paid tracking to fuel_dispatches
ALTER TABLE fuel_dispatches
  ADD COLUMN IF NOT EXISTS paid    BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Index for fast unpaid queries
CREATE INDEX IF NOT EXISTS idx_fuel_dispatches_paid ON fuel_dispatches (paid) WHERE paid = FALSE;
