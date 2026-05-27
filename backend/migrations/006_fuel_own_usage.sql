-- Create fuel_own_usage table if it doesn't exist (for servers where schema.sql wasn't re-run)
CREATE TABLE IF NOT EXISTS fuel_own_usage (
    id          SERIAL PRIMARY KEY,
    used_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    truck_id    INT REFERENCES trucks(id),
    volume      DECIMAL(8,2) NOT NULL,
    entered_by  INT REFERENCES users(id),
    notes       TEXT
);
