-- Шаг 1: Очистка операционных данных и добавление структурных колонок

-- Part A: Truncate all operational tables
TRUNCATE TABLE fuel_receipts, fuel_dispatches, hire_deliveries, income_records, fleet_expenses, company_expenses, debt_records, cash_to_artem, balance_entries, fuel_advances, fuel_own_usage, monthly_reconciliations, ai_interactions, audit_log, orders, order_sites RESTART IDENTITY CASCADE;
-- Also try error_log if it exists:
DO $$ BEGIN TRUNCATE error_log RESTART IDENTITY CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Part B: Schema changes (all columns nullable — API enforces mandatory)

-- C1.2: order_id for hire_deliveries
ALTER TABLE hire_deliveries ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);
ALTER TABLE hire_deliveries ADD COLUMN IF NOT EXISTS cash_record_id INTEGER REFERENCES cash_to_artem(id);
ALTER TABLE hire_deliveries ADD COLUMN IF NOT EXISTS order_id_for_payment INTEGER REFERENCES orders(id);

-- C2.1: order_id for cash_to_artem
ALTER TABLE cash_to_artem ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);

-- C3.1: optional linkage columns
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS cash_record_id INTEGER REFERENCES cash_to_artem(id);
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);
ALTER TABLE fleet_expenses ADD COLUMN IF NOT EXISTS cash_record_id INTEGER REFERENCES cash_to_artem(id);
ALTER TABLE fleet_expenses ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);
ALTER TABLE fuel_receipts ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC(15,2);
ALTER TABLE fuel_receipts ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC(10,4);
ALTER TABLE fuel_receipts ADD COLUMN IF NOT EXISTS cash_record_id INTEGER REFERENCES cash_to_artem(id);
ALTER TABLE fuel_receipts ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);

-- C6: order_id for income_records
ALTER TABLE income_records ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id);
