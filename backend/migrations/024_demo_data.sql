-- Migration 024: Demo test data for presentation
-- Run AFTER 023 (cleanup). Remove with 023 again.

BEGIN;

-- ── Поставщики (на случай если нет) ──────────────────────────────────────────
INSERT INTO suppliers (name) VALUES ('Камыш') ON CONFLICT DO NOTHING;
INSERT INTO suppliers (name) VALUES ('Гарик') ON CONFLICT DO NOTHING;
INSERT INTO suppliers (name) VALUES ('Стёпа') ON CONFLICT DO NOTHING;

-- ── Клиенты (на случай если нет) ─────────────────────────────────────────────
INSERT INTO clients (name) VALUES ('Зея')       ON CONFLICT DO NOTHING;
INSERT INTO clients (name) VALUES ('Луи Витон') ON CONFLICT DO NOTHING;
INSERT INTO clients (name) VALUES ('Лау')       ON CONFLICT DO NOTHING;
INSERT INTO clients (name) VALUES ('Максим')    ON CONFLICT DO NOTHING;

-- ── Перевозчики ───────────────────────────────────────────────────────────────
INSERT INTO carriers (name) VALUES ('Козлофф') ON CONFLICT DO NOTHING;
INSERT INTO carriers (name) VALUES ('Чипига')  ON CONFLICT DO NOTHING;
INSERT INTO carriers (name) VALUES ('Коля')    ON CONFLICT DO NOTHING;

-- ── ПРИЁМКИ ТОПЛИВА (volume_adjusted в ЛИТРАХ) ───────────────────────────────
-- Итого: 250 000 л = 250 куб подтверждённых

INSERT INTO fuel_receipts (received_at, supplier_id, source_custom, volume_nominal, volume_adjusted, ttn_number, ttn_confirmed, entered_by)
VALUES
  ('2026-06-06',
   (SELECT id FROM suppliers WHERE name = 'Камыш' LIMIT 1),
   NULL, 82500, 82500, 'ТТН-001', TRUE,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-07',
   (SELECT id FROM suppliers WHERE name = 'Гарик' LIMIT 1),
   NULL, 75000, 74800, 'ТТН-002', TRUE,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-09',
   (SELECT id FROM suppliers WHERE name = 'Камыш' LIMIT 1),
   NULL, 60000, 59600, 'ТТН-003', TRUE,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-11',
   (SELECT id FROM suppliers WHERE name = 'Стёпа' LIMIT 1),
   NULL, 33500, 33100, 'ТТН-004', TRUE,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  -- Ещё одна ждёт подтверждения ТТН (не считается в остаток)
  ('2026-06-13',
   (SELECT id FROM suppliers WHERE name = 'Гарик' LIMIT 1),
   NULL, 20000, 20000, NULL, FALSE,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1));

-- ── РЕЙСЫ (volume в КУБ) ──────────────────────────────────────────────────────
-- Итого отгружено: ~80 куб → остаток базы ≈ 170 куб

INSERT INTO fuel_dispatches (dispatched_at, truck_id, driver_id, site_id, volume, tariff, status, delivered_at, entered_by)
VALUES
  -- Доставлено
  ('2026-06-07',
   (SELECT id FROM trucks WHERE name = 'Кантер' LIMIT 1),
   (SELECT id FROM drivers WHERE is_active = TRUE ORDER BY id LIMIT 1),
   (SELECT id FROM sites WHERE name = 'Дипкун ближний' LIMIT 1),
   18.5, 12, 'delivered', '2026-06-07',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-08',
   (SELECT id FROM trucks WHERE name = 'Шахман-1' LIMIT 1),
   (SELECT id FROM drivers WHERE is_active = TRUE ORDER BY id OFFSET 1 LIMIT 1),
   (SELECT id FROM sites WHERE name = 'Акурдан' LIMIT 1),
   23.0, 15, 'delivered', '2026-06-08',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-10',
   (SELECT id FROM trucks WHERE name = 'Шахман-2' LIMIT 1),
   (SELECT id FROM drivers WHERE is_active = TRUE ORDER BY id OFFSET 2 LIMIT 1),
   (SELECT id FROM sites WHERE name = 'Сагинах' LIMIT 1),
   20.0, 18, 'delivered', '2026-06-10',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  -- В пути
  ('2026-06-12',
   (SELECT id FROM trucks WHERE name = 'Кантер' LIMIT 1),
   (SELECT id FROM drivers WHERE is_active = TRUE ORDER BY id LIMIT 1),
   (SELECT id FROM sites WHERE name = 'Дипкун дальний' LIMIT 1),
   22.0, 14, 'in_transit', NULL,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  -- Только отправлен
  ('2026-06-13',
   (SELECT id FROM trucks WHERE name = 'Шахман-3' LIMIT 1),
   (SELECT id FROM drivers WHERE is_active = TRUE ORDER BY id OFFSET 1 LIMIT 1),
   (SELECT id FROM sites WHERE name = 'Нагорная' LIMIT 1),
   19.5, 16, 'dispatched', NULL,
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1));

-- ── НАЙМ (volume_liters) ──────────────────────────────────────────────────────
INSERT INTO hire_deliveries (delivery_at, client_id, supplier_id, carrier_id, volume_liters, price_client, amount_client, margin, margin_pct, comment)
VALUES
  ('2026-06-07',
   (SELECT id FROM clients WHERE name = 'Зея' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Камыш' LIMIT 1),
   (SELECT id FROM carriers WHERE name = 'Козлофф' LIMIT 1),
   35000, 72, 2520000, 280000, 12.5, 'Рейс Тында-Зея'),

  ('2026-06-09',
   (SELECT id FROM clients WHERE name = 'Луи Витон' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Гарик' LIMIT 1),
   (SELECT id FROM carriers WHERE name = 'Чипига' LIMIT 1),
   28000, 74, 2072000, 196000, 10.4, 'Стандартный рейс'),

  ('2026-06-11',
   (SELECT id FROM clients WHERE name = 'Лау' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Стёпа' LIMIT 1),
   (SELECT id FROM carriers WHERE name = 'Коля' LIMIT 1),
   42000, 71, 2982000, 336000, 12.7, NULL),

  ('2026-06-13',
   (SELECT id FROM clients WHERE name = 'Максим' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Камыш' LIMIT 1),
   (SELECT id FROM carriers WHERE name = 'Козлофф' LIMIT 1),
   50000, 73, 3650000, 450000, 14.0, 'Крупный заказ');

-- ── ДОХОДЫ ────────────────────────────────────────────────────────────────────
INSERT INTO income_records (income_at, client_id, amount, volume, comment, entered_by)
VALUES
  ('2026-06-08',
   (SELECT id FROM clients WHERE name = 'Зея' LIMIT 1),
   2520000, 35, 'Оплата рейс 07.06',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-10',
   (SELECT id FROM clients WHERE name = 'Луи Витон' LIMIT 1),
   1500000, NULL, 'Частичная оплата',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),

  ('2026-06-12',
   (SELECT id FROM clients WHERE name = 'Лау' LIMIT 1),
   2982000, 42, 'Полная оплата рейс 11.06',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1));

-- ── РАСХОДЫ КОМПАНИИ ──────────────────────────────────────────────────────────
INSERT INTO company_expenses (expense_at, category, amount, comment, entered_by)
VALUES
  ('2026-06-07', 'Зарплата', 180000, 'Зарплата водители июнь',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),
  ('2026-06-09', 'Топливо',   45000, 'ДТ для спецтехники',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1)),
  ('2026-06-11', 'Прочие',    12500, 'Канцтовары и офис',
   (SELECT id FROM users WHERE role = 'partner' ORDER BY id LIMIT 1));

-- ── РАСХОДЫ АВТОПАРКА ─────────────────────────────────────────────────────────
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, comment)
VALUES
  ((SELECT id FROM trucks WHERE name = 'Кантер' LIMIT 1),
   '2026-06-08', 'ТО', 38000, 'Плановое ТО 90 000 км'),
  ((SELECT id FROM trucks WHERE name = 'Шахман-1' LIMIT 1),
   '2026-06-10', 'Резина', 62000, 'Замена задней оси');

-- ── АВАНСЫ ТОПЛИВА ────────────────────────────────────────────────────────────
INSERT INTO fuel_advances (given_at, recipient, volume, amount, status)
VALUES
  ('2026-06-11', 'Артём', 5.0, 35000, 'open');

COMMIT;

-- Итог
SELECT 'fuel_receipts'   AS t, COUNT(*) FROM fuel_receipts
UNION ALL SELECT 'fuel_dispatches', COUNT(*) FROM fuel_dispatches
UNION ALL SELECT 'hire_deliveries',  COUNT(*) FROM hire_deliveries
UNION ALL SELECT 'income_records',   COUNT(*) FROM income_records
UNION ALL SELECT 'company_expenses', COUNT(*) FROM company_expenses
UNION ALL SELECT 'fleet_expenses',   COUNT(*) FROM fleet_expenses;

SELECT ROUND(balance_cubic::numeric, 2) AS balance_kub FROM v_base_balance;
