-- Migration 007: Clear test/seed transactional data
-- Run this BEFORE importing real data via import_xlsx.py
-- Preserves: users, sites, tariffs, seed trucks (Шахман-1/2/3, Сайгак, Фусо, MAN, Кантер, Скания)

BEGIN;

-- Transactional tables
DELETE FROM audit_log;
DELETE FROM monthly_reconciliations;
DELETE FROM fuel_advances;
DELETE FROM cash_to_artem;
DELETE FROM balance_entries;
DELETE FROM order_sites;
DELETE FROM fuel_dispatches;
DELETE FROM fuel_receipts;
DELETE FROM orders;
DELETE FROM hire_deliveries;
DELETE FROM income_records;
DELETE FROM company_expenses;
DELETE FROM fleet_expenses;
DELETE FROM debt_records;

-- Reference tables (will be rebuilt from XLSX)
DELETE FROM carriers;
DELETE FROM suppliers;
DELETE FROM clients;

-- Remove test trucks (keep seed trucks by name)
DELETE FROM trucks
WHERE name NOT IN ('Шахман-1','Шахман-2','Шахман-3','Сайгак','Фусо','MAN','Кантер','Скания');

-- Reset sequences for clean IDs (optional)
ALTER SEQUENCE hire_deliveries_id_seq RESTART WITH 1;
ALTER SEQUENCE income_records_id_seq RESTART WITH 1;
ALTER SEQUENCE company_expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE debt_records_id_seq RESTART WITH 1;
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE carriers_id_seq RESTART WITH 1;
ALTER SEQUENCE suppliers_id_seq RESTART WITH 1;

COMMIT;
