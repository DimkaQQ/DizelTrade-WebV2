-- Migration 021: separate real payments from «в долг» (credit) in income_records.
-- Debt model B: долг = (отгружено куб − оплачено куб) × цены, где «оплачено»
-- учитывает только реальные оплаты (is_credit = FALSE).

BEGIN;

ALTER TABLE income_records ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT FALSE;

-- Auto-mark existing «в долг» records by their comment wording.
-- Real payments ("по 76", "по 87", "Полная оплата", "куплено") stay is_credit = FALSE.
UPDATE income_records
SET is_credit = TRUE
WHERE is_credit = FALSE
  AND (
        comment ILIKE '%в долг%'
     OR comment ILIKE 'Дт %'
     OR comment ILIKE 'Дт.%'
     OR comment ILIKE '%доставить до%'
     OR comment ILIKE '%до 10.03 край%'
     OR comment ILIKE '% край%'
  );

COMMIT;

-- Проверка: что пометилось как «в долг»
SELECT id, income_at, client_id, amount, volume, is_credit, comment
FROM income_records
ORDER BY is_credit DESC, client_id, income_at;
