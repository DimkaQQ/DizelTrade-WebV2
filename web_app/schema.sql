-- ============================================================
-- DTL Management System v2.0 — PostgreSQL Schema
-- Фаза 1: Полная схема БД
-- ============================================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ПОЛЬЗОВАТЕЛИ И АВТОРИЗАЦИЯ
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,  -- bcrypt, rounds=12
    role            VARCHAR(20) NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('partner', 'artem', 'operator')),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    last_login_at   TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- НАСТРОЙКИ СИСТЕМЫ
-- ============================================================

CREATE TABLE settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       VARCHAR(500) NOT NULL,
    updated_by  INT REFERENCES users(id),
    updated_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
    ('base_capacity_cubic',         '2500'),
    ('alert_low_stock_cubic',       '100'),
    ('alert_unconfirmed_hours',     '48'),
    ('alert_cash_unsettled_days',   '7'),
    ('ai_daily_limit',              '100'),
    ('daily_report_time',           '20:00'),
    ('anomaly_volume_threshold_pct','3'),
    ('report_timezone',             'Asia/Yakutsk');

-- ============================================================
-- АВТОПАРК
-- ============================================================

CREATE TABLE trucks (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    owner       VARCHAR(10) NOT NULL CHECK (owner IN ('DTL', 'Артём')),
    tank_volume DECIMAL(8,2),           -- объём бочки в кубах
    status      VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active', 'for_sale', 'archived')),
    plate       VARCHAR(20),
    notes       TEXT,
    created_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP
);

-- Начальные машины DTL
INSERT INTO trucks (name, owner, tank_volume, status) VALUES
    ('Шахман-1',    'DTL', 23.5, 'active'),
    ('Шахман-2',    'DTL', 23.5, 'active'),
    ('Шахман-3',    'DTL', 26.0, 'active'),
    ('Сайгак/КамАЗ','DTL', 11.0, 'active'),
    ('Фусо',        'DTL', NULL, 'for_sale'),
    ('Скания',      'DTL', NULL, 'for_sale'),
    ('Кантер',      'DTL', NULL, 'active'),
    ('MAN',         'DTL', NULL, 'for_sale');

CREATE TABLE drivers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    truck_id    INT REFERENCES trucks(id),
    owner       VARCHAR(10) CHECK (owner IN ('DTL', 'Артём')),
    is_active   BOOLEAN DEFAULT TRUE,
    notes       TEXT
);

-- Начальные водители
INSERT INTO drivers (name, owner) VALUES
    ('Андрюха', 'DTL'),
    ('Санёк',   'DTL'),
    ('Ромик',   'DTL');

-- ============================================================
-- СПРАВОЧНИКИ
-- ============================================================

CREATE TABLE suppliers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO suppliers (name) VALUES
    ('Хабаровск'),
    ('Ангарск'),
    ('Коля'),
    ('Восточка'),
    ('Артём закупил');

CREATE TABLE clients (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL,
    notes   TEXT
);

INSERT INTO clients (name) VALUES
    ('Лао'),
    ('Лёша 2₽'),
    ('Луи Виттон'),
    ('Зея');

CREATE TABLE carriers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO carriers (name) VALUES
    ('Лёха'),
    ('Козлофф'),
    ('Коля');

CREATE TABLE sites (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO sites (name) VALUES
    ('Дипкун ближний'),
    ('Дипкун дальний'),
    ('Акурдан'),
    ('Сагинах'),
    ('Нагорная'),
    ('Камагин'),
    ('Беркакит');

CREATE TABLE tariffs (
    id          SERIAL PRIMARY KEY,
    site_id     INT NOT NULL REFERENCES sites(id),
    truck_owner VARCHAR(10) CHECK (truck_owner IN ('DTL', 'Артём', 'наёмная')),
    amount      DECIMAL(10,2) NOT NULL,
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ЗАКАЗЫ КЛИЕНТОВ
-- ============================================================

CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    client_id       INT NOT NULL REFERENCES clients(id),
    paid_at         DATE NOT NULL,
    amount_paid     DECIMAL(15,2),
    volume_ordered  DECIMAL(10,2),      -- кубометры
    price_per_liter DECIMAL(6,2),
    delivery_type   VARCHAR(50),        -- 'до Тынды', 'до участка'
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'reconciled', 'closed')),
    entered_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_sites (
    order_id    INT NOT NULL REFERENCES orders(id),
    site_id     INT NOT NULL REFERENCES sites(id),
    PRIMARY KEY (order_id, site_id)
);

-- ============================================================
-- БАЗА — ПРИЁМКА ТОПЛИВА
-- ============================================================

CREATE TABLE fuel_receipts (
    id              SERIAL PRIMARY KEY,
    received_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    supplier_id     INT REFERENCES suppliers(id),
    source_custom   VARCHAR(100),           -- для "Другое"
    volume_nominal  DECIMAL(10,2) NOT NULL, -- кубометры по документам
    temperature     DECIMAL(5,1),           -- °C
    density         DECIMAL(6,4),           -- г/см³
    volume_adjusted DECIMAL(10,2),          -- пересчёт при 20°C
    -- формула: volume_nominal * density / 0.840
    ttn_number      VARCHAR(100),
    ttn_photo_url   VARCHAR(500),
    ttn_confirmed   BOOLEAN DEFAULT FALSE,
    confirmed_by    INT REFERENCES users(id),
    confirmed_at    TIMESTAMP,
    entered_by      INT REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- БАЗА — РЕЙСЫ НА УЧАСТКИ
-- ============================================================

CREATE TABLE fuel_dispatches (
    id              SERIAL PRIMARY KEY,
    dispatched_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    truck_id        INT REFERENCES trucks(id),
    truck_temp      VARCHAR(100),           -- для наёмных
    driver_id       INT REFERENCES drivers(id),
    driver_temp     VARCHAR(100),           -- для разовых
    truck_owner     VARCHAR(10) NOT NULL
                    CHECK (truck_owner IN ('DTL', 'Артём', 'наёмная')),
    site_id         INT NOT NULL REFERENCES sites(id),
    order_id        INT REFERENCES orders(id),
    volume          DECIMAL(10,2) NOT NULL,
    tariff          DECIMAL(10,2),
    ttn_number      VARCHAR(100),
    ttn_photo_url   VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'dispatched'
                    CHECK (status IN ('dispatched', 'in_transit', 'delivered', 'cancelled')),
    delivered_at    TIMESTAMP,
    entered_by      INT REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- БАЗА — АВАНСЫ (ТОПЛИВО В ДОЛГ)
-- ============================================================

CREATE TABLE fuel_advances (
    id          SERIAL PRIMARY KEY,
    given_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    recipient   VARCHAR(100) NOT NULL,
    volume      DECIMAL(10,2),
    amount      DECIMAL(12,2),
    notes       TEXT,
    status      VARCHAR(20) DEFAULT 'open'
                CHECK (status IN ('open', 'returned')),
    returned_at TIMESTAMP,
    entered_by  INT REFERENCES users(id)
);

-- ============================================================
-- БАЗА — ЗАПРАВКА СВОИХ МАШИН
-- ============================================================

CREATE TABLE fuel_own_usage (
    id          SERIAL PRIMARY KEY,
    used_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    truck_id    INT NOT NULL REFERENCES trucks(id),
    volume      DECIMAL(8,2) NOT NULL,
    entered_by  INT REFERENCES users(id),
    notes       TEXT
);

-- ============================================================
-- БАЗА — НАЛИЧНЫЕ АРТЁМУ
-- ============================================================

CREATE TABLE cash_to_artem (
    id              SERIAL PRIMARY KEY,
    given_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    amount_given    DECIMAL(12,2) NOT NULL,
    purpose         VARCHAR(200),
    amount_spent    DECIMAL(12,2) DEFAULT 0,
    fuel_received   DECIMAL(10,2) DEFAULT 0,
    is_settled      BOOLEAN DEFAULT FALSE,
    settled_at      TIMESTAMP,
    entered_by      INT REFERENCES users(id),
    notes           TEXT
);

-- ============================================================
-- СУЩЕСТВУЮЩИЕ МОДУЛИ (перенос с Google Sheets)
-- ============================================================

-- АВТОПАРК — расходы по машинам
CREATE TABLE fleet_expenses (
    id          SERIAL PRIMARY KEY,
    truck_id    INT NOT NULL REFERENCES trucks(id),
    expense_at  DATE NOT NULL,
    category    VARCHAR(100),
    amount      DECIMAL(12,2),
    trips       INT,
    revenue     DECIMAL(12,2),
    comment     TEXT,
    entered_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- НАЙМ — транзитные поставки Хабаровск→Тында
CREATE TABLE hire_deliveries (
    id              SERIAL PRIMARY KEY,
    delivery_at     DATE NOT NULL,
    hire_type       VARCHAR(20) DEFAULT 'transit'
                    CHECK (hire_type IN ('transit', 'artem_trip')),
    client_id       INT REFERENCES clients(id),
    supplier_id     INT REFERENCES suppliers(id),
    carrier_id      INT REFERENCES carriers(id),
    carrier_custom  VARCHAR(100),
    volume_liters   DECIMAL(12,2),
    price_client    DECIMAL(8,2),
    price_supplier  DECIMAL(8,2),
    price_carrier   DECIMAL(8,2),
    amount_client   DECIMAL(15,2),
    amount_supplier DECIMAL(15,2),
    amount_carrier  DECIMAL(15,2),
    margin          DECIMAL(15,2),
    margin_pct      DECIMAL(5,2),
    comment         TEXT,
    entered_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ДОХОДЫ
CREATE TABLE income_records (
    id          SERIAL PRIMARY KEY,
    income_at   DATE NOT NULL,
    client_id   INT REFERENCES clients(id),
    amount      DECIMAL(15,2),
    volume      DECIMAL(10,2),
    comment     TEXT,
    entered_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- РАСХОДЫ общие
CREATE TABLE company_expenses (
    id          SERIAL PRIMARY KEY,
    expense_at  DATE NOT NULL,
    category    VARCHAR(100),
    amount      DECIMAL(12,2),
    comment     TEXT,
    entered_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ДОЛГИ
CREATE TABLE debt_records (
    id          SERIAL PRIMARY KEY,
    recorded_at DATE NOT NULL,
    debtor      VARCHAR(100) NOT NULL,
    amount      DECIMAL(12,2),
    type        VARCHAR(10) DEFAULT 'ДОЛГ'
                CHECK (type IN ('ДОЛГ', 'ОПЛАТА')),
    comment     TEXT,
    entered_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- БАЛАНС (ручные строки)
CREATE TABLE balance_entries (
    id          SERIAL PRIMARY KEY,
    period_year INT NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    category    VARCHAR(100) NOT NULL,
    label       VARCHAR(200) NOT NULL,
    amount      DECIMAL(15,2) NOT NULL,
    entry_type  VARCHAR(10) CHECK (entry_type IN ('asset', 'liability')),
    updated_by  INT REFERENCES users(id),
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (period_year, period_month, category, label)
);

-- ============================================================
-- АУДИТ-ЛОГ (удаление запрещено)
-- ============================================================

CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    table_name  VARCHAR(100) NOT NULL,
    record_id   INT,
    action      VARCHAR(20) NOT NULL
                CHECK (action IN ('INSERT', 'UPDATE', 'CORRECTION')),
    old_data    JSONB,
    new_data    JSONB,
    reason      TEXT,   -- обязательно при CORRECTION
    user_id     INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Запрет DELETE через правило
CREATE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- ИНДЕКСЫ
-- ============================================================

CREATE INDEX idx_fuel_receipts_received_at    ON fuel_receipts(received_at);
CREATE INDEX idx_fuel_receipts_confirmed      ON fuel_receipts(ttn_confirmed);
CREATE INDEX idx_fuel_dispatches_status       ON fuel_dispatches(status);
CREATE INDEX idx_fuel_dispatches_dispatched   ON fuel_dispatches(dispatched_at);
CREATE INDEX idx_fuel_dispatches_order        ON fuel_dispatches(order_id);
CREATE INDEX idx_fleet_expenses_truck         ON fleet_expenses(truck_id, expense_at);
CREATE INDEX idx_hire_deliveries_at           ON hire_deliveries(delivery_at);
CREATE INDEX idx_income_records_at            ON income_records(income_at);
CREATE INDEX idx_company_expenses_at          ON company_expenses(expense_at);
CREATE INDEX idx_debt_records_debtor          ON debt_records(debtor, recorded_at);
CREATE INDEX idx_orders_status                ON orders(status);
CREATE INDEX idx_audit_log_table              ON audit_log(table_name, record_id);
CREATE INDEX idx_refresh_tokens_user          ON refresh_tokens(user_id);

-- ============================================================
-- VIEW: Текущий остаток на базе
-- ============================================================

CREATE VIEW v_base_balance AS
SELECT
    COALESCE(
        (SELECT SUM(volume_adjusted)
         FROM fuel_receipts
         WHERE ttn_confirmed = TRUE), 0
    )
    - COALESCE(
        (SELECT SUM(volume)
         FROM fuel_dispatches
         WHERE status IN ('dispatched', 'in_transit', 'delivered')), 0
    )
    - COALESCE(
        (SELECT SUM(volume) FROM fuel_own_usage), 0
    )
    - COALESCE(
        (SELECT SUM(volume) FROM fuel_advances WHERE status = 'open'), 0
    )
    AS balance_cubic;

-- VIEW: Прогресс заказов
CREATE VIEW v_order_progress AS
SELECT
    o.id,
    o.client_id,
    c.name AS client_name,
    o.volume_ordered,
    o.status,
    COALESCE(SUM(CASE WHEN fd.status = 'delivered' THEN fd.volume ELSE 0 END), 0) AS delivered,
    COALESCE(SUM(CASE WHEN fd.status IN ('dispatched','in_transit') THEN fd.volume ELSE 0 END), 0) AS in_transit
FROM orders o
LEFT JOIN clients c ON c.id = o.client_id
LEFT JOIN fuel_dispatches fd ON fd.order_id = o.id
GROUP BY o.id, o.client_id, c.name, o.volume_ordered, o.status;

-- VIEW: Долг DTL перед Артёмом за рейсы
CREATE VIEW v_artem_debt AS
SELECT
    COALESCE(SUM(tariff), 0) AS debt_rub
FROM fuel_dispatches
WHERE truck_owner = 'Артём'
  AND status != 'cancelled';

-- VIEW: Баланс наличных Артёма
CREATE VIEW v_artem_cash AS
SELECT
    COALESCE(SUM(amount_given), 0) AS total_given,
    COALESCE(SUM(amount_spent), 0) AS total_spent,
    COALESCE(SUM(amount_given), 0) - COALESCE(SUM(amount_spent), 0) AS balance
FROM cash_to_artem
WHERE is_settled = FALSE;
