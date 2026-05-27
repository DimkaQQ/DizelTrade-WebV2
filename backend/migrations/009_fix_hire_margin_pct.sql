-- Fix margin_pct for imported hire_deliveries where it was not set
UPDATE hire_deliveries
SET margin_pct = ROUND((margin / amount_client * 100)::numeric, 2)
WHERE margin_pct IS NULL
  AND amount_client IS NOT NULL
  AND amount_client > 0
  AND margin IS NOT NULL;
