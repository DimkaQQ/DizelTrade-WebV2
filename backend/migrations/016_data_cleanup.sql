-- Migration 016: Справочники cleanup — merge duplicates and rename
-- Safe: idempotent DO block. Uses ILIKE, updates all FK tables.

DO $$
DECLARE
    v_canonical_id   INTEGER;
    v_duplicate_id   INTEGER;
BEGIN

    -- ─────────────────────────────────────────────────────────────────
    -- HELPER: merge_client(old_names[], new_name)
    -- 1. Find or create canonical client with new_name
    -- 2. Re-point all old_name records → canonical, delete old rows
    -- ─────────────────────────────────────────────────────────────────

    -- ── Лау/Лао → Саша ───────────────────────────────────────────────
    SELECT id INTO v_canonical_id FROM clients WHERE name = 'Саша' LIMIT 1;
    IF v_canonical_id IS NULL THEN
        -- Rename the first match to canonical
        UPDATE clients SET name = 'Саша'
        WHERE id = (SELECT id FROM clients WHERE name ILIKE ANY(ARRAY['Лау','Лао']) ORDER BY id LIMIT 1);
        SELECT id INTO v_canonical_id FROM clients WHERE name = 'Саша' LIMIT 1;
    END IF;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients WHERE name ILIKE ANY(ARRAY['Лау','Лао']) AND id <> v_canonical_id
        LOOP
            UPDATE orders           SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE income_records   SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE hire_deliveries  SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- ── Леша / Леша 2₽ / Лёша 2 рубля → Лёша ────────────────────────
    SELECT id INTO v_canonical_id FROM clients WHERE name = 'Лёша' LIMIT 1;
    IF v_canonical_id IS NULL THEN
        -- Prefer id=21 (Леша) as canonical per spec analysis
        UPDATE clients SET name = 'Лёша'
        WHERE id = (
            SELECT id FROM clients
            WHERE name ILIKE ANY(ARRAY['Леша','Леша 2₽','Лёша 2 рубля'])
            ORDER BY id LIMIT 1
        );
        SELECT id INTO v_canonical_id FROM clients WHERE name = 'Лёша' LIMIT 1;
    END IF;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients
            WHERE name ILIKE ANY(ARRAY['Леша','Леша 2₽','Лёша 2 рубля'])
              AND id <> v_canonical_id
        LOOP
            UPDATE orders           SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE income_records   SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE hire_deliveries  SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- ── Луи Витон / Луи Виттон → Максим ─────────────────────────────
    SELECT id INTO v_canonical_id FROM clients WHERE name = 'Максим' LIMIT 1;
    IF v_canonical_id IS NULL THEN
        UPDATE clients SET name = 'Максим'
        WHERE id = (
            SELECT id FROM clients
            WHERE name ILIKE ANY(ARRAY['Луи Витон','Луи Виттон'])
            ORDER BY id LIMIT 1
        );
        SELECT id INTO v_canonical_id FROM clients WHERE name = 'Максим' LIMIT 1;
    END IF;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients
            WHERE name ILIKE ANY(ARRAY['Луи Витон','Луи Виттон'])
              AND id <> v_canonical_id
        LOOP
            UPDATE orders           SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE income_records   SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE hire_deliveries  SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- ── Коля кит → Кулико ────────────────────────────────────────────
    SELECT id INTO v_canonical_id FROM clients WHERE name = 'Кулико' LIMIT 1;
    IF v_canonical_id IS NULL THEN
        UPDATE clients SET name = 'Кулико'
        WHERE id = (SELECT id FROM clients WHERE name ILIKE 'Коля кит' ORDER BY id LIMIT 1);
        SELECT id INTO v_canonical_id FROM clients WHERE name = 'Кулико' LIMIT 1;
    END IF;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients WHERE name ILIKE 'Коля кит' AND id <> v_canonical_id
        LOOP
            UPDATE orders           SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE income_records   SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            UPDATE hire_deliveries  SET client_id = v_canonical_id WHERE client_id = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- ─────────────────────────────────────────────────────────────────
    -- SUPPLIERS (rename to city names)
    -- ─────────────────────────────────────────────────────────────────

    -- Камыш → Хабаровск
    UPDATE suppliers SET name = 'Хабаровск'
    WHERE name ILIKE 'Камыш'
      AND NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Хабаровск');

    -- Садик Февральск → Февральск (first, if Февральск not yet exists)
    UPDATE suppliers SET name = 'Февральск'
    WHERE name ILIKE 'Садик Февральск'
      AND NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Февральск');

    -- Гарик → Февральск (merge if Февральск exists, else rename)
    SELECT id INTO v_canonical_id FROM suppliers WHERE name = 'Февральск' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM suppliers WHERE name ILIKE 'Гарик' AND id <> v_canonical_id
        LOOP
            UPDATE hire_deliveries SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            UPDATE fuel_receipts   SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            DELETE FROM suppliers WHERE id = v_duplicate_id;
        END LOOP;
    ELSE
        UPDATE suppliers SET name = 'Февральск' WHERE name ILIKE 'Гарик';
    END IF;

    -- Стёпа → Биробиджан (merge if exists, else rename)
    SELECT id INTO v_canonical_id FROM suppliers WHERE name = 'Биробиджан' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM suppliers WHERE name ILIKE 'Стёпа' AND id <> v_canonical_id
        LOOP
            UPDATE hire_deliveries SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            UPDATE fuel_receipts   SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            DELETE FROM suppliers WHERE id = v_duplicate_id;
        END LOOP;
    ELSE
        UPDATE suppliers SET name = 'Биробиджан' WHERE name ILIKE 'Стёпа';
    END IF;

    -- биржа → Биржа (normalise capitalisation)
    UPDATE suppliers SET name = 'Биржа' WHERE name = 'биржа';

    -- Add Ангарск if not exists
    INSERT INTO suppliers (name)
    SELECT 'Ангарск' WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Ангарск');

    -- Add Тында if not exists
    INSERT INTO suppliers (name)
    SELECT 'Тында'   WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Тында');

    -- ─────────────────────────────────────────────────────────────────
    -- CARRIERS
    -- ─────────────────────────────────────────────────────────────────

    -- Козлоффы → Козлофф (merge or rename)
    SELECT id INTO v_canonical_id FROM carriers WHERE name = 'Козлофф' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM carriers WHERE name ILIKE 'Козлоффы' AND id <> v_canonical_id
        LOOP
            UPDATE hire_deliveries SET carrier_id = v_canonical_id WHERE carrier_id = v_duplicate_id;
            DELETE FROM carriers WHERE id = v_duplicate_id;
        END LOOP;
    ELSE
        UPDATE carriers SET name = 'Козлофф' WHERE name ILIKE 'Козлоффы';
    END IF;

END $$;
