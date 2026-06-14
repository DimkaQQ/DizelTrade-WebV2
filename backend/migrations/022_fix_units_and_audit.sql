-- Fix 1: audit_log CHECK constraint — добавляем MARK_PAID, MARK_UNPAID
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
    CHECK (action IN ('INSERT','UPDATE','CORRECTION','MARK_PAID','MARK_UNPAID'));

-- Fix 2: v_base_balance — приёмки в литрах, рейсы/расход/авансы в кубах.
-- Делаем всё в кубах: делим volume_adjusted приёмок на 1000.
DROP VIEW IF EXISTS v_base_balance;
CREATE VIEW v_base_balance AS
SELECT
    COALESCE(
        (SELECT SUM(volume_adjusted) / 1000.0 FROM fuel_receipts WHERE ttn_confirmed = TRUE), 0
    )
    - COALESCE(
        (SELECT SUM(volume) FROM fuel_dispatches WHERE status IN ('dispatched','in_transit','delivered')), 0
    )
    - COALESCE(
        (SELECT SUM(volume) FROM fuel_own_usage), 0
    )
    - COALESCE(
        (SELECT SUM(volume) FROM fuel_advances WHERE status = 'open'), 0
    )
    AS balance_cubic;
