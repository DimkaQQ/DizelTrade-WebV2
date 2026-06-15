-- Fix audit_log action CHECK constraint: add CLOSE, REPORT, SETTLE
-- Needed by: hire.py close_hire_delivery ("CLOSE"),
--            base.py settle_cash ("SETTLE"), report_cash ("REPORT")

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'INSERT', 'UPDATE', 'CORRECTION',
    'MARK_PAID', 'MARK_UNPAID',
    'CLOSE', 'REPORT', 'SETTLE'
  ));
