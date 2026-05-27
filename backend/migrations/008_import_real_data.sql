-- 008: Import real data from master spreadsheet
-- Generated automatically - DO NOT EDIT BY HAND
BEGIN;

-- Clear transactional + reference data
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
DELETE FROM carriers;
DELETE FROM suppliers;
DELETE FROM clients;
DELETE FROM trucks WHERE name NOT IN ('Шахман-1','Шахман-2','Шахман-3','Сайгак','Фусо','MAN','Кантер','Скания');

-- Clients
INSERT INTO clients (name) VALUES ('Зея');
INSERT INTO clients (name) VALUES ('Лау');
INSERT INTO clients (name) VALUES ('Леша');
INSERT INTO clients (name) VALUES ('Леша 2₽');
INSERT INTO clients (name) VALUES ('Луи Витон');
INSERT INTO clients (name) VALUES ('Лёша 2 рубля');
INSERT INTO clients (name) VALUES ('Трасса');

-- Carriers
INSERT INTO carriers (name) VALUES ('Козлофф');
INSERT INTO carriers (name) VALUES ('Козлоффы');
INSERT INTO carriers (name) VALUES ('Коля');
INSERT INTO carriers (name) VALUES ('Лёха');
INSERT INTO carriers (name) VALUES ('Чипига');

-- Suppliers
INSERT INTO suppliers (name) VALUES ('Гарик');
INSERT INTO suppliers (name) VALUES ('Камыш');
INSERT INTO suppliers (name) VALUES ('Садик Февральск');
INSERT INTO suppliers (name) VALUES ('Стёпа');
INSERT INTO suppliers (name) VALUES ('биржа');

-- Найм (hire deliveries)
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-24',
  (SELECT id FROM clients WHERE name='Трасса' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Стёпа' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 66.0, 62.0, 1.0,
  2508000.0, 2356000.0, 38000.0, 114000.0,
  'В долг Гашмоне'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-25',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Гарик' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  33140.0, 75.0, 66.0, 3.0,
  2485500.0, 2187240.0, 99420.0, 198840.0,
  'Наша Ёмкость с Магдагачи'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-25',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 75.0, 59.0, 7.0,
  2653125.0, 2087125.0, 247625.0, 318375.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-25',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  40490.0, 75.0, 59.0, 7.0,
  3036750.0, 2388910.0, 283430.0, 364410.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-29',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  38149.0, 75.0, 59.0, 6.0,
  2861175.0, 2250791.0, 228894.0, 381490.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-29',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 75.0, 59.0, 7.0,
  2850000.0, 2242000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-01-29',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 75.0, 59.0, 7.0,
  2653125.0, 2087125.0, 247625.0, 318375.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-01',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  37210.0, 75.0, 59.0, 7.0,
  2790750.0, 2195390.0, 260470.0, 334890.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-01',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Гарик' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 75.0, 66.0, 6.0,
  2653125.0, 2334750.0, 212250.0, 106125.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-01',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 75.0, 59.0, 7.0,
  2850000.0, 2242000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-03',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  40490.0, 75.0, 59.0, 7.0,
  3036750.0, 2388910.0, 283430.0, 364410.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-05',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  38149.0, 75.0, 59.0, 6.0,
  2861175.0, 2250791.0, 228894.0, 381490.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-06',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 75.0, 59.0, 7.0,
  2653125.0, 2087125.0, 247625.0, 318375.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-07',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 75.0, 59.0, 7.0,
  2850000.0, 2242000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-08',
  (SELECT id FROM clients WHERE name='Лёша 2 рубля' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  16817.0, 75.0, 59.0, 7.0,
  1261275.0, 992203.0, 117719.0, 151353.0,
  'С Лёшей закрылись'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-08',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  20338.0, 74.0, 59.0, 7.0,
  1505012.0, 1199942.0, 142366.0, 162704.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-10',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  40490.0, 74.0, 59.0, 7.0,
  2996260.0, 2388910.0, 283430.0, 323920.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-10',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 59.0, 7.0,
  2812000.0, 2242000.0, 266000.0, 304000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-11',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  43640.0, 74.0, 59.0, 7.0,
  3229360.0, 2574760.0, 305480.0, 349120.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-13',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 59.0, 7.0,
  2812000.0, 2242000.0, 266000.0, 304000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-15',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  19532.0, 74.0, 59.0, 6.0,
  1445368.0, 1152388.0, 117192.0, 175788.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-17',
  (SELECT id FROM clients WHERE name='Трасса' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  37210.0, 65.0, 59.0, 1.0,
  2418650.0, 2195390.0, 37210.0, 186050.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-18',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  38149.0, 74.0, 59.0, 6.0,
  2823026.0, 2250791.0, 228894.0, 343341.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-19',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38500.0, 74.0, 59.0, 7.0,
  2849000.0, 2271500.0, 269500.0, 308000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-20',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 59.0, 7.0,
  2812000.0, 2242000.0, 266000.0, 304000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-21',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  43640.0, 74.0, 59.0, 7.0,
  3229360.0, 2574760.0, 305480.0, 349120.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-21',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Садик Февральск' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38500.0, 74.0, 62.0, 6.0,
  2849000.0, 2387000.0, 231000.0, 231000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-22',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  39090.0, 74.0, 59.0, 7.0,
  2892660.0, 2306310.0, 273630.0, 312720.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-25',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 59.0, 7.0,
  2812000.0, 2242000.0, 266000.0, 304000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-02-25',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38500.0, 74.0, 59.0, 7.0,
  2849000.0, 2271500.0, 269500.0, 308000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-02',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлоффы' LIMIT 1),
  18618.0, 74.0, 59.0, 7.0,
  1377732.0, 1098462.0, 130326.0, 148944.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-03',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  56000.0, 74.0, 59.0, 7.0,
  4144000.0, 3304000.0, 392000.0, 448000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-03',
  (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Стёпа' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  20000.0, 74.0, 62.0, 7.0,
  1480000.0, 1240000.0, 140000.0, 100000.0,
  'Топливо с города'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-04',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='биржа' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Коля' LIMIT 1),
  607264.0, 74.0, 59.0, 0.0,
  44937536.0, 35828576.0, 0.0, 9108960.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-09',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='биржа' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Коля' LIMIT 1),
  118000.0, 74.0, 61.0, 0.0,
  8732000.0, 7198000.0, 0.0, 1534000.0,
  'Должен'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-16',
  (SELECT id FROM clients WHERE name='Трасса' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 65.0, 58.0, 1.5,
  2470000.0, 2204000.0, 57000.0, 209000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-16',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 7.0,
  2812000.0, 2204000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-17',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 6.0,
  2823026.0, 2212642.0, 228894.0, 381490.0,
  'Наша бочка'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-18',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38500.0, 74.0, 58.0, 7.0,
  2849000.0, 2233000.0, 269500.0, 346500.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-20',
  (SELECT id FROM clients WHERE name='Зея' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 70.0, 58.0, 6.0,
  2476250.0, 2051750.0, 212250.0, 212250.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-20',
  (SELECT id FROM clients WHERE name='Зея' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  36260.0, 70.0, 58.0, 6.0,
  2538200.0, 2103080.0, 217560.0, 217560.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-21',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 7.0,
  2812000.0, 2204000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-21',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 6.0,
  2823026.0, 2212642.0, 228894.0, 381490.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-24',
  (SELECT id FROM clients WHERE name='Зея' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  82260.0, 70.0, 58.0, 6.0,
  5758200.0, 4771080.0, 493560.0, 493560.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-25',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 7.0,
  2812000.0, 2204000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-29',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 6.0,
  2823026.0, 2212642.0, 228894.0, 381490.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-03-30',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 7.0,
  2812000.0, 2204000.0, 266000.0, 342000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-03',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 6.0,
  2823026.0, 2212642.0, 228894.0, 381490.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-08',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 7.0,
  2812000.0, 2204000.0, 266000.0, 342000.0,
  'Этой машиной закрыли 500 кубов'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-09',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 8.0,
  2823026.0, 2212642.0, 305192.0, 305192.0,
  'Начало 730 кубов'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-14',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 74.0, 58.0, 10.0,
  2617750.0, 2051750.0, 353750.0, 212250.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-15',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлофф' LIMIT 1),
  40490.0, 74.0, 58.0, 8.0,
  2996260.0, 2348420.0, 323920.0, 323920.0,
  'Пришла машина 15.04'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-17',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлофф' LIMIT 1),
  39309.0, 74.0, 58.0, 8.0,
  2908866.0, 2279922.0, 314472.0, 314472.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-18',
  (SELECT id FROM clients WHERE name='Трасса' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 65.0, 58.0, 1.5,
  2470000.0, 2204000.0, 57000.0, 209000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-19',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 8.0,
  2812000.0, 2204000.0, 304000.0, 304000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-23',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38000.0, 74.0, 58.0, 8.0,
  2812000.0, 2204000.0, 304000.0, 304000.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-26',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлофф' LIMIT 1),
  43640.0, 74.0, 58.0, 8.0,
  3229360.0, 2531120.0, 349120.0, 349120.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-26',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлофф' LIMIT 1),
  39309.0, 74.0, 58.0, 8.0,
  2908866.0, 2279922.0, 314472.0, 314472.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-04-28',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 7.0,
  2823026.0, 2212642.0, 267043.0, 343341.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-05-01',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 58.0, 8.0,
  2823026.0, 2212642.0, 305192.0, 305192.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-05-04',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Лёха' LIMIT 1),
  38149.0, 74.0, 59.0, 7.0,
  2823026.0, 2250791.0, 267043.0, 305192.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-05-06',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлофф' LIMIT 1),
  39309.0, 74.0, 59.0, 8.0,
  2908866.0, 2319231.0, 314472.0, 275163.0,
  NULL
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-05-07',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Козлофф' LIMIT 1),
  43640.0, 74.0, 59.0, 8.0,
  3229360.0, 2574760.0, 349120.0, 305480.0,
  'Вольво N 167'
);
INSERT INTO hire_deliveries
  (delivery_at, client_id, supplier_id, carrier_id, volume_liters,
   price_client, price_supplier, price_carrier,
   amount_client, amount_supplier, amount_carrier, margin, comment)
VALUES (
  '2026-05-24',
  (SELECT id FROM clients WHERE name='Лау' LIMIT 1),
  (SELECT id FROM suppliers WHERE name='Камыш' LIMIT 1),
  (SELECT id FROM carriers WHERE name='Чипига' LIMIT 1),
  35375.0, 74.0, 59.0, 7.0,
  2617750.0, 2087125.0, 247625.0, 283000.0,
  NULL
);

-- Доходы (income records)
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-01-21', (SELECT id FROM clients WHERE name='Леша 2₽' LIMIT 1), 37500000.0, 500.0, 'Дт. По 75.₽ доставить до 10.03.26.');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-01-21', (SELECT id FROM clients WHERE name='Луи Витон' LIMIT 1), 14800000.0, 200.0, 'Дт по 74.₽ доставить до 15.02.26.');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-01-01', (SELECT id FROM clients WHERE name='Леша 2₽' LIMIT 1), 48750000.0, 650.0, 'По 75р в долг по ставке 0,10% в день');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-02-02', (SELECT id FROM clients WHERE name='Лау' LIMIT 1), 30000000.0, 1000.0, '74р до 10.03 край');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-02-07', (SELECT id FROM clients WHERE name='Лау' LIMIT 1), 44000000.0, NULL, '35.604.000₽ куплено 520 тонн');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-03-07', (SELECT id FROM clients WHERE name='Лау' LIMIT 1), 37000000.0, 500.0, '100 тонн купленно 7181000');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-03-20', (SELECT id FROM clients WHERE name='Леша 2₽' LIMIT 1), 15400000.0, 200.0, 'по 77р амурзет');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-04-05', (SELECT id FROM clients WHERE name='Лау' LIMIT 1), 54000000.0, 730.0, 'по 74р');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-05-09', (SELECT id FROM clients WHERE name='Леша' LIMIT 1), 7000000.0, 80.5, 'по 85');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-09-16', (SELECT id FROM clients WHERE name='Леша' LIMIT 1), 4000000.0, 46.0, 'по 87');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-09-17', (SELECT id FROM clients WHERE name='Лау' LIMIT 1), 4000000.0, 52.6, 'по 76');
INSERT INTO income_records (income_at, client_id, amount, volume, comment)
VALUES ('2026-05-20', (SELECT id FROM clients WHERE name='Леша' LIMIT 1), 8700000.0, 100.0, 'по 87');

-- Долги (debt records)
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-01-27', 'Лау', 1059030.0, 'ДОЛГ', '2 рейса Тында-Участок по 18.₽ 1 рейс Дипкун-Участок.. по 9.₽ Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-01-27', 'Лау', 1059030.0, 'ДОЛГ', '2 рейса Тында-Участок по 18.₽ 1 рейс Дипкун-Участок.. по 9.₽ Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-01-27', 'Лау', 870120.0, 'ДОЛГ', '2 рейса Тында-Участок по 18.₽ 1 рейс Дипкун-Участок.. Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-02', 'Лау', 423612.0, 'ДОЛГ', 'Тында-участок 23534. Куб.. по 18.₽ Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-02', 'Лау', 423612.0, 'ДОЛГ', 'Тында-Участок 23534.тонн по 18.₽ Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-02', 'Лау', 373140.0, 'ДОЛГ', 'Тында-Участок 20730.тонн по 18.₽ Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-05', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында- Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-05', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында- Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-05', 'Коля кит', 310950.0, 'ДОЛГ', 'Тында- Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-15', 'Лау', 611884.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау) 23534*26=611 884');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-15', 'Лау', 611884.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-15', 'Лау', 538980.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-18', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-18', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-18', 'Коля кит', 310950.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-20', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-20', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-24', 'Лау', 611884.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-02-24', 'Лау', 611884.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-01', 'Лау', 611884.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-01', 'Лау', 611884.0, 'ДОЛГ', 'Тында- Дипкун дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-04', 'Лау', 475800.0, 'ДОЛГ', 'Тында- Дипкун участок дальний Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-07', 'Лау', 423612.0, 'ДОЛГ', 'Тында-Дипкун ближний участок Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-07', 'Лау', 423612.0, 'ДОЛГ', 'Тында-Дипкун ближний участок Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-07', 'Лау', 373140.0, 'ДОЛГ', 'Тында-Дипкун ближний участок Долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-11', 'Лау', 611884.0, 'ДОЛГ', 'Тында-дипкун участок дальний долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-11', 'Лау', 611884.0, 'ДОЛГ', 'Тында-дипкун участок дальний долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-11', 'Лау', 538980.0, 'ДОЛГ', 'Тында-дипкун участок дальний долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-11', 'Лау', 293904.0, 'ДОЛГ', 'Тында-дипкун участок дальний долг (Лау)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-16', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-16', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-16', 'Леша 2₽', 310950.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-16', 'Леша 2₽', 270060.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-18', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-18', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-18', 'Леша 2₽', 310950.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 706020.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 706020.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 621900.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 90020.0, 'ДОЛГ', 'Тында.-Нерюнгри Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 270060.0, 'ДОЛГ', 'Тында.-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-29', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-29', 'Леша 2₽', 353010.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-29', 'Леша 2₽', 274560.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-29', 'Леша 2₽', 310950.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-05', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-05', 'Коля кит', 310950.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-08', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-08', 'Коля кит', 310950.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-10', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-10', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-10', 'Коля кит', 310950.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 90020.0, 'ДОЛГ', 'Тында.-Нерюнгри Долг (Леша 2₽) Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-03-25', 'Леша 2₽', 270060.0, 'ДОЛГ', 'Тында-Беркакит Долг (Леша 2₽)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-15', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');
INSERT INTO debt_records (recorded_at, debtor, amount, type, comment)
VALUES ('2026-04-15', 'Коля кит', 353010.0, 'ДОЛГ', 'Тында-Камагин Долг (Коля кит)');

-- Общие расходы (company expenses)
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-11', 'Прочие', 54000.0, 'Чат бот');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-11', 'Прочие', 31500.0, 'Витамины');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-11', 'Зарплата партнёрам', 1500000.0, 'зп за декабрь');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-21', 'Благотворительность', 20000.0, 'Саня. Ф');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-21', 'Командировочные', 166000.0, 'Камандировка Биробиджан Хэйхэ Тында Биробиджан');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-31', 'Командировочные', 56000.0, 'Бирик- Китай- Блага');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-31', 'Аренда', 21000.0, 'Оренда базы Панфер');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-01-31', 'Аренда', 20000.0, 'Оренда базы Виталик');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-05', 'Зарплата партнёрам', 2100000.0, 'зп за январь');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-11', 'Бухгалтерия', 10000.0, '');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-12', 'Благотворительность', 90000.0, 'Витя');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-13', 'Прочие', 95000.0, 'Покупка шлангов на помпы Тында');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-13', 'Командировочные', 208000.0, 'Поездка Владивосток');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-17', 'Налоги/штрафы', 80000.0, 'Налог за транспорт 2025');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-24', 'Командировочные', 27000.0, 'Бирик- Китай');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-02-28', 'Прочие', 127000.0, 'Обучение');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-02', 'Аренда', 40000.0, 'Оренда базы Виталик, Панфер');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-02', 'Зарплата партнёрам', 2100000.0, 'зп за февраль');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-07', 'Благотворительность', 16000.0, 'Цветы 🌺 8 марта');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-18', 'Прочие', 100000.0, 'Страхование жизни');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-21', 'Прочие', 211000.0, 'Анализатор+Карты');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-25', 'Благотворительность', 50000.0, 'Дрова дача');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-25', 'Прочие', 10000.0, 'Вэб версия чат бот');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-27', 'Прочие', 99500.0, 'Полис страхования жизни');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-27', 'Прочие', 900.0, 'Транспортная анализатор');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-29', 'Аренда', 40000.0, 'Оренда базы Виталик Панфер');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-03-31', 'Зарплата партнёрам', 2100000.0, 'Зп за март');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-02', 'Прочие', 3033.0, 'Оформление страховок');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-08', 'Прочие', 77000.0, 'Биробиджан-Амурзет Перевозка бочки+ краны');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-08', 'Командировочные', 78000.0, 'Биробиджан-Китай-Тында');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-11', 'Бухгалтерия', 10000.0, NULL);
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-18', 'Прочие', 55000.0, 'Бонус хакер С');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-19', 'Командировочные', 115300.0, 'Юани 10.000');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-04-21', 'Прочие', 25000.0, 'Командировка Али в Благу(Коля Кулико)');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-01', 'Зарплата партнёрам', 1400000.0, 'ЗП апрель Серёжа и Нафаня');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-01', 'Прочие', 100000.0, 'Карты анализатор');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-06', 'Благотворительность', 100000.0, 'Псих Карик');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-10', 'Благотворительность', 38000.0, 'Батенька(трасса)');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-14', 'Аренда', 20000.0, 'Аренда база Цыба');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-17', 'Бухгалтерия', 10000.0, NULL);
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-17', 'Прочие', 100000.0, 'Приложение');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-17', 'Прочие', 20000.0, 'ИИ');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-21', 'Командировочные', 110600.0, 'Командировка Китай-Тында');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-21', 'Прочие', 21900.0, 'Прадо-Замена масла; Мойка; Шиномонтаж');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-23', 'Командировочные', 33000.0, 'Билеты');
INSERT INTO company_expenses (expense_at, category, amount, comment)
VALUES ('2026-05-23', 'Прочие', 6250.0, 'Ужин Маяк');

-- Расходы по машинам (fleet expenses)
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='MAN' LIMIT 1), '2026-01-21', 'Зарплата', 2700.0, NULL, NULL, 'Саня. Б. Заправка ⛽️ филдера постоновка Ман в ремонт');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-21', 'Топливо', 3080.0, NULL, NULL, 'Заправка дт с НК альянс');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-21', 'Прочие расходы', 2900.0, NULL, NULL, 'Перекидка прицепа');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-21', 'ТО', 5100.0, NULL, NULL, 'Шланг подкачки, манометр, фильтра топливный воздушный');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-01-21', 'Зарплата', 10000.0, NULL, NULL, 'Камандировочные Андрей');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-01-21', 'Зарплата', 10000.0, NULL, NULL, 'Зп камандировочные Саня');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-01-21', 'Зарплата', 10000.0, NULL, NULL, 'Зп Юра камандировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-01-21', 'ТО', 18000.0, NULL, NULL, 'Фильтра воздушный, масленые');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-01-21', 'ТО', 18000.0, NULL, NULL, 'Фильтр воздушный масляный');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='MAN' LIMIT 1), '2026-01-21', 'Ремонт', 132550.0, NULL, NULL, 'То в Хабаровске');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-01-21', 'Прочие расходы', 16000.0, NULL, NULL, 'Фильтра, прикуриватель машины');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-01-21', 'Прочие расходы', 12000.0, NULL, NULL, 'Датчик уровня пола, подушки кабины');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-21', 'Прочие расходы', 3720.0, NULL, NULL, 'Камлоки на шланги');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-01-21', 'Прочие расходы', 4700.0, NULL, NULL, 'Антифриз, болты');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-01-21', 'Зарплата', 10000.0, NULL, NULL, 'Зп Андрей командировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-01-21', 'Зарплата', 10000.0, NULL, NULL, 'Зп Юра камандировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-01-21', 'Зарплата', 10000.0, NULL, NULL, 'Зп Саня командировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-01-21', 'Прочие расходы', 2800.0, NULL, NULL, 'Курьер 🚚 Якуты запчасти с Благе');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-27', 'Прочие расходы', 50000.0, NULL, NULL, 'Аккумуляторы новые покупка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-27', 'Прочие расходы', 1000.0, NULL, NULL, 'Гос номер прицепа');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-27', 'Прочие расходы', 5000.0, NULL, NULL, 'Проезд пост');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-27', 'Прочие расходы', 5000.0, NULL, NULL, 'Платон');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-27', 'Топливо', 63000.0, NULL, NULL, 'Заправка до Тынды на заправке НК');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-01-27', 'Ремонт', 47000.0, NULL, NULL, 'Покупка корзина сцепления, диск сцепления + выжимной подшибник');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-27', 'Ремонт', 10000.0, NULL, NULL, 'Покупка привода на Аппаратуру топливную');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-31', 'Ремонт', 21000.0, NULL, NULL, 'Покупка компрессор');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-01-31', 'Ремонт', 5200.0, NULL, NULL, 'Прокладки лобавина');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-02', 'Зарплата', 30000.0, NULL, NULL, 'Зп. Егор на ремонте 6 дней');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-02-02', 'Зарплата', 250000.0, NULL, NULL, '3 рейса с Тында-участок.. 1 рейс Дипкун- Участок.. 7 дней ремонта база.. Биробиджан- Тында перегон Камаз.');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-02-02', 'Зарплата', 250000.0, NULL, NULL, '3 рейса с Тында-участок.. 1 рейс Дипкун- Участок.. 7 дней ремонта база.. Биробиджан- Тында перегон Камаз.');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-02', 'Зарплата', 250000.0, NULL, NULL, '3 рейса с Тында-участок.. 1 рейс Дипкун- Участок.. 7 дней ремонта база.. Биробиджан- Тында перегон Камаз.');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-02', 'Ремонт', 11300.0, NULL, NULL, 'Ремонт лобовины задней');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-04', 'Ремонт', 10500.0, NULL, NULL, 'Ремонт лобовины задней');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-05', 'Ремонт', 30000.0, NULL, NULL, 'Ремонт аппаратуры');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-08', 'Ремонт', 2500.0, NULL, NULL, 'Покупка форсунки');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-08', 'Ремонт', 25500.0, NULL, NULL, 'Диз масло');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='MAN' LIMIT 1), '2026-02-08', 'Налоги/штрафы', 8400.0, NULL, NULL, 'Штраф платон');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-08', 'Ремонт', 33000.0, NULL, NULL, 'Покупка рессор');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-08', 'Ремонт', 1910.0, NULL, NULL, '🔩 гайки');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-08', 'Ремонт', 26000.0, NULL, NULL, 'Курьер 🚚 доставка раздатки Бирик- Тында');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-02-08', 'ТО', 50000.0, NULL, NULL, 'Покупка бочка масло трансмиссии');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-10', 'Ремонт', 115000.0, NULL, NULL, 'Покупка резины на прицеп бочки');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-10', 'Ремонт', 8100.0, NULL, NULL, 'Фильтра воздушный, масляный');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-10', 'Ремонт', 3600.0, NULL, NULL, 'Штуцер камаз-прицеп');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-12', 'Ремонт', 8800.0, NULL, NULL, 'Токарь');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='MAN' LIMIT 1), '2026-02-13', 'Налоги/штрафы', 5000.0, NULL, NULL, 'Серега оплатил штраф');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-02-13', 'Зарплата', 10000.0, NULL, NULL, 'Командировка Андрей');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-02-13', 'Зарплата', 10000.0, NULL, NULL, 'Командировка Саня');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-13', 'Зарплата', 10000.0, NULL, NULL, 'Командировка Юра');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='MAN' LIMIT 1), '2026-02-15', 'Налоги/штрафы', 11470.0, NULL, NULL, 'Платон штраф');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-02-20', 'Зарплата', 10000.0, NULL, NULL, 'Андрей зп командировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-02-20', 'Зарплата', 10000.0, NULL, NULL, 'Саня зп камандировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-20', 'Зарплата', 10000.0, NULL, NULL, 'Юра зп камандировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='MAN' LIMIT 1), '2026-02-20', 'Налоги/штрафы', 15000.0, NULL, NULL, 'Платон');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-20', 'Ремонт', 1200.0, NULL, NULL, 'Гайки 🔩');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-24', 'Прочие расходы', 3500.0, NULL, NULL, 'Бензин ⛽️ на помпы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-24', 'Ремонт', 100000.0, NULL, NULL, 'Покупка коробки передач');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-24', 'Ремонт', 63000.0, NULL, NULL, 'Покупка рессор');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-24', 'Ремонт', 3930.0, NULL, NULL, 'Гофра на коробку передач');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-25', 'Резина/расходники', 23500.0, NULL, NULL, 'Покупка цепи ⛓️');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-25', 'Ремонт', 3500.0, NULL, NULL, 'Ускоритель форсунки');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-02-25', 'Ремонт', 17500.0, NULL, NULL, 'Покупка шкворень 3,5 дюйма и ремкомплект седло');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-02-27', 'Прочие расходы', 8100.0, NULL, NULL, 'Распределительный кран прицепа');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-02-27', 'Ремонт', 17650.0, NULL, NULL, 'Домкрат, гайки 🔩 болты, Токарь');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-01', 'Ремонт', 12470.0, NULL, NULL, 'Трещетка тормозов');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-02', 'Зарплата', 470000.0, NULL, NULL, 'Андрей зп за месяц');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-02', 'Зарплата', 470000.0, NULL, NULL, 'Саня зп за месяц');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-03-02', 'Зарплата', 315000.0, NULL, NULL, 'Юра зп за месяц');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-03-02', 'Зарплата', 280000.0, NULL, NULL, 'Егор зп за месяц, ремонт 140.000.₽ Аварийный.. ремонт… 50.000.₽ капитальный ремонт камаз.. 90.000.₽ рейс Тында-дипкун. Участок дальний');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-02', 'Топливо', 50000.0, NULL, NULL, 'Заправка машины');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-02', 'Топливо', 50000.0, NULL, NULL, 'Заправка машины');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-03-02', 'Топливо', 50000.0, NULL, NULL, 'Заправка ⛽️');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-02', 'Зарплата', 10000.0, NULL, NULL, 'Суточные Андрей');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-02', 'Зарплата', 10000.0, NULL, NULL, 'Суточные Саня');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-03-02', 'Зарплата', 10000.0, NULL, NULL, 'Суточные Юра');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-02', 'ТО', 35300.0, NULL, NULL, 'Покупка бочка тосол');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-02', 'Ремонт', 7320.0, NULL, NULL, 'Покупка тарсион кабины');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-07', 'Ремонт', 72700.0, NULL, NULL, 'Покупка кардан, клапана, фильтр осушителя');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-03-07', 'Ремонт', 2500.0, NULL, NULL, 'Тосол');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-11', 'Зарплата', 10000.0, NULL, NULL, 'Андрей командировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-11', 'Зарплата', 10000.0, NULL, NULL, 'Саня командировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-03-11', 'Зарплата', 10000.0, NULL, NULL, 'Юра командировка');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-03-11', 'Ремонт', 20000.0, NULL, NULL, 'Покупка люстр свет 💡');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-11', 'Ремонт', 10000.0, NULL, NULL, 'Доставка 🚚 с Владивостока запчасти на седло');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-11', 'Ремонт', 10000.0, NULL, NULL, 'Покупка Люстры, фонари, фитинги,');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-03-16', 'Ремонт', 90500.0, NULL, NULL, 'Покупка, радиатор, тосол, патрубки');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-25', 'Зарплата', 10000.0, NULL, NULL, 'Андрей зп суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-25', 'Зарплата', 10000.0, NULL, NULL, 'Саня. Зп суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-03-25', 'Зарплата', 10000.0, NULL, NULL, 'Юра. Зп суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-03-25', 'Налоги/штрафы', 30000.0, NULL, NULL, 'Штраф гаи Беркакит');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Скания' LIMIT 1), '2026-03-25', 'Ремонт', 35000.0, NULL, NULL, 'Тахограф 20.₽ 15.₽ мартеры кабины..');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-03-29', 'Ремонт', 46600.0, NULL, NULL, 'Датчики, фильтра, курьер');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-04-05', 'Зарплата', 460000.0, NULL, NULL, 'Андрей зп');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-04-05', 'Зарплата', 460000.0, NULL, NULL, 'Саня зп');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-04-05', 'Зарплата', 460000.0, NULL, NULL, 'Юра зп');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-04-05', 'Зарплата', 310000.0, NULL, NULL, 'Саня Тында зп');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-04-05', 'Ремонт', 17000.0, NULL, NULL, 'Покупка стопы, блок делителя коробки передач');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-04-05', 'Зарплата', 10000.0, NULL, NULL, 'Андрей зп суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-04-05', 'Зарплата', 10000.0, NULL, NULL, 'Саня зп суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-04-05', 'Зарплата', 10000.0, NULL, NULL, 'Юра зп суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-04-05', 'Топливо', 109500.0, NULL, NULL, 'Заправка дт на рейсы за месяц');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-04-05', 'Топливо', 100000.0, NULL, NULL, 'Заправка дт на рейсы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-04-05', 'Топливо', 50000.0, NULL, NULL, 'Заправка дт на рейсы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-04-05', 'Топливо', 50000.0, NULL, NULL, 'Заправка дт на рейсы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-04-08', 'Ремонт', 10000.0, NULL, NULL, 'Электрик');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-04-18', 'Ремонт', 25000.0, NULL, NULL, 'Привели в порядок после Тынды');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-04-18', 'Ремонт', 3500.0, NULL, NULL, 'Стремянки,болты,тормозуха');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-04-21', 'Зарплата', 10000.0, NULL, NULL, 'Суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-04-21', 'Зарплата', 10000.0, NULL, NULL, 'Суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-04-21', 'Зарплата', 10000.0, NULL, NULL, 'Суточные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Скания' LIMIT 1), '2026-04-30', 'Ремонт', 125000.0, NULL, NULL, 'Ремонт блока двигателя с Лёхой об колено');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-01', 'Зарплата', 355000.0, NULL, NULL, 'ЗП Андрей апрель');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-01', 'Зарплата', 300000.0, NULL, NULL, 'ЗП Саня апрель');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-05-01', 'Зарплата', 205000.0, NULL, NULL, 'ЗП Юра апрель');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Фусо' LIMIT 1), '2026-05-01', 'Топливо', 106500.0, NULL, NULL, 'Заправка апрель');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-04', 'Прочие расходы', 15000.0, NULL, NULL, 'Антифриз,масло моторное,трансмиссия');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-04', 'Прочие расходы', 15100.0, NULL, NULL, 'Антифриз,масло моторное,трансмиссия');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-05', 'Прочие расходы', 35000.0, NULL, NULL, 'Заправка, дорога до Хаб, электрик');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-05', 'Резина/расходники', 225000.0, NULL, NULL, '6 дисков по расчётному счёту с НДС');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-05', 'Резина/расходники', 321000.0, NULL, NULL, '6 колёс резина по счёту с НДС');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-05', 'Резина/расходники', 214000.0, NULL, NULL, '4 колеса резина по счёту с НДС');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-05', 'Резина/расходники', 214000.0, NULL, NULL, '4 колеса резина по счёту с НДС');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-08', 'Прочие расходы', 18000.0, NULL, NULL, 'Масла моторка, трансмиссия');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-08', 'Прочие расходы', 18000.0, NULL, NULL, 'Масла моторка, трансмиссия');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-11', 'ТО', 13000.0, NULL, NULL, 'Флиппера 6 штук');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-13', 'Прочие расходы', 7000.0, NULL, NULL, 'Пиломатериал на площадку');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-13', 'Прочие расходы', 6000.0, NULL, NULL, 'Маршрутная карта Платон');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-13', 'Прочие расходы', 41500.0, NULL, NULL, 'Заправка до Тынды');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-13', 'Резина/расходники', 9000.0, NULL, NULL, 'Масла моторка,трансмиссия');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-13', 'Резина/расходники', 9000.0, NULL, NULL, 'Масла');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-13', 'Резина/расходники', 9000.0, NULL, NULL, 'Масла');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-05-13', 'Прочие расходы', 5000.0, NULL, NULL, 'Пропуск бурея');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-05-13', 'Резина/расходники', 10000.0, NULL, NULL, 'Платон');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-05-13', 'Прочие расходы', 39600.0, NULL, NULL, 'Заправка до Тынды');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-14', 'Резина/расходники', 10500.0, NULL, NULL, 'Шиномонтаж');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-18', 'Зарплата', 10000.0, NULL, NULL, 'Андрей командировочные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-18', 'Зарплата', 10000.0, NULL, NULL, 'Боксёр командировочные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-18', 'Зарплата', 10000.0, NULL, NULL, 'Юра командировочные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-05-18', 'Зарплата', 10000.0, NULL, NULL, 'Витя командировочные');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-21', 'Ремонт', 4700.0, NULL, NULL, 'Ремонт бочки (круги отрезные, смазка)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-21', 'Ремонт', 37500.0, NULL, NULL, 'Ремонт сцепления (комплектующие)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-21', 'ТО', 29300.0, NULL, NULL, 'Ремни; фильтры;сальники');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-21', 'ТО', 28300.0, NULL, NULL, 'Ремни;фильтры;сальники');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-21', 'ТО', 29300.0, NULL, NULL, 'Ремни;фильтры;сальники');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-26', 'Прочие расходы', 19600.0, NULL, NULL, 'Транспортная (седло)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-26', 'Прочие расходы', 26850.0, NULL, NULL, 'Энергоаккумуляторы; трещётки на полуприцепы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-26', 'Прочие расходы', 26850.0, NULL, NULL, 'Энергоаккумуляторы; трещётки на полуприцепы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-26', 'Прочие расходы', 17300.0, NULL, NULL, 'Колодки;пружины;ключи');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-26', 'Прочие расходы', 17300.0, NULL, NULL, 'Колодки;пружины;ключи');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-26', 'Зарплата', 10000.0, NULL, NULL, 'Суточные (Андрей)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-26', 'Зарплата', 10000.0, NULL, NULL, 'Суточные (Боксёр)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Сайгак' LIMIT 1), '2026-05-26', 'Зарплата', 10000.0, NULL, NULL, 'Суточные (Витя)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-3' LIMIT 1), '2026-05-26', 'Зарплата', 10000.0, NULL, NULL, 'Суточные (Юра)');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-26', 'Прочие расходы', 9000.0, NULL, NULL, 'Доставка с Благи (Якуты) фильтры; расходники');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-26', 'Резина/расходники', 54500.0, NULL, NULL, 'Диски,флиппера на полуприцепы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-26', 'Резина/расходники', 54500.0, NULL, NULL, 'Диски,флиппера на полуприцепы');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-1' LIMIT 1), '2026-05-27', 'Резина/расходники', 70500.0, NULL, NULL, 'Диски на полуприцеп');
INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, trips, revenue, comment)
VALUES ((SELECT id FROM trucks WHERE name='Шахман-2' LIMIT 1), '2026-05-27', 'Резина/расходники', 70500.0, NULL, NULL, 'Диски на полуприцеп');

COMMIT;
