-- hire_deliveries: is_closed flag for marking deals as settled (Зея, Трасса)
ALTER TABLE hire_deliveries ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE hire_deliveries ADD COLUMN IF NOT EXISTS closed_comment TEXT;

-- fuel_receipts: purchase cost tracking per receipt
ALTER TABLE fuel_receipts ADD COLUMN IF NOT EXISTS purchase_amount DECIMAL(15,2);
ALTER TABLE fuel_receipts ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,4);

-- audit_log: source field (web / mobile / cursor-mcp / api)
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'web';

-- api_tokens: daily cost limit in USD (NULL = no limit)
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS daily_cost_limit_usd DECIMAL(8,2);

-- trucks: Шахман-3 (add if not exists)
INSERT INTO trucks (name, owner, tank_volume, status)
SELECT 'Шахман-3', 'DTL', 10, 'active'
WHERE NOT EXISTS (SELECT 1 FROM trucks WHERE name = 'Шахман-3');
