-- Migration 027: Clear test operational data before real data entry
-- Preserves: clients, suppliers, carriers, trucks, drivers, sites, users, tariffs
-- Same table set as 025_step1_structure.sql Part A

TRUNCATE TABLE
  fuel_receipts,
  fuel_dispatches,
  hire_deliveries,
  income_records,
  fleet_expenses,
  company_expenses,
  debt_records,
  cash_to_artem,
  balance_entries,
  fuel_advances,
  fuel_own_usage,
  monthly_reconciliations,
  ai_interactions,
  audit_log,
  orders,
  order_sites
RESTART IDENTITY CASCADE;

-- Clear error_log if it exists
DO $$ BEGIN
  TRUNCATE error_log RESTART IDENTITY CASCADE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
