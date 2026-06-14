-- Очистка операционных данных (запустить ПОСЛЕ применения фиксов из 022)
-- Справочники НЕ затрагиваются.

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
