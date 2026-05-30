-- Migration 019: Cleanup — remove cancelled dispatches and duplicate debt records
-- Safe: only deletes cancelled dispatches and exact duplicates in debt_records

BEGIN;

-- ── 1. Удалить все отменённые рейсы ──────────────────────────────────────────
-- Статус cancelled не влияет на остаток базы, это чистый мусор
DELETE FROM fuel_dispatches WHERE status = 'cancelled';

-- ── 2. Убрать дубли в debt_records ───────────────────────────────────────────
-- Дубль = одинаковый debtor + amount + recorded_at + type
-- Оставляем запись с наименьшим id, удаляем остальные
DELETE FROM debt_records
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY debtor, amount, recorded_at::date, type
                   ORDER BY id
               ) AS rn
        FROM debt_records
    ) t
    WHERE rn > 1
);

-- ── 3. Убрать записи долгов с нулевой суммой (очевидный мусор) ───────────────
DELETE FROM debt_records WHERE amount IS NULL OR amount = 0;

COMMIT;

-- Результат: сколько осталось
SELECT 'fuel_dispatches' AS tbl, COUNT(*) FROM fuel_dispatches
UNION ALL
SELECT 'debt_records',           COUNT(*) FROM debt_records;
