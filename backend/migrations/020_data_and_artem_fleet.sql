-- Migration 020: Data fixes (D) + Artem's fleet (E)

BEGIN;

-- ── D1. Исправить опечатки дат в income_records (id 35, 36 — сентябрь 2026) ──
-- Корректная дата неизвестна — ставим 2026-05-01 как placeholder (исправить вручную если нужна точная дата)
UPDATE income_records SET income_at = '2026-05-01' WHERE id IN (35, 36) AND EXTRACT(MONTH FROM income_at) = 9 AND EXTRACT(YEAR FROM income_at) = 2026;

-- ── D2. Максим: внести оплату 22 800 000 ₽ / 300 куб / «по 76» / 12.05.2026 ──
INSERT INTO income_records (income_at, client_id, amount, volume, comment, entered_by)
SELECT
    '2026-05-12',
    (SELECT id FROM clients WHERE name = 'Максим' LIMIT 1),
    22800000,
    300,
    'по 76',
    (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM clients WHERE name = 'Максим');

-- ── E. Автопарк Артёма — 7 машин ────────────────────────────────────────────
INSERT INTO trucks (name, owner, tank_volume, status, plate) VALUES
    ('КАМАЗ',  'Артём', 10.110, 'active', 'В197МР 28'),
    ('КАМАЗ',  'Артём', 24.212, 'active', 'Р863УК 72'),
    ('HOWO',   'Артём', 19.200, 'active', 'Н818НМ 27'),
    ('FUSO',   'Артём', 20.520, 'active', 'К728ВА 125'),
    ('IVECO',  'Артём', 23.701, 'active', 'В142ХЕ 125'),
    ('IVECO',  'Артём', 23.730, 'active', 'А689КЕ 14'),
    ('УРАЛ',   'Артём', 12.135, 'active', 'А841УХ 38')
ON CONFLICT DO NOTHING;

COMMIT;

-- Проверка
SELECT owner, name, plate, tank_volume FROM trucks ORDER BY owner, name;
SELECT id, income_at, amount, comment FROM income_records WHERE id IN (35, 36)
UNION ALL
SELECT id, income_at, amount, comment FROM income_records WHERE comment = 'по 76' ORDER BY id;
