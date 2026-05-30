-- Migration 016: Справочники cleanup — merge duplicates and rename suppliers
-- Safe: uses DO blocks with existence checks, ILIKE for fuzzy matching

DO $$
DECLARE
    v_canonical_id   INTEGER;
    v_duplicate_id   INTEGER;
BEGIN

    -- ─────────────────────────────────────────────────────────────────
    -- CLIENTS
    -- ─────────────────────────────────────────────────────────────────

    -- Лау/Лао → Саша
    SELECT id INTO v_canonical_id FROM clients WHERE name ILIKE 'Саша' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients WHERE name ILIKE ANY(ARRAY['Лау','Лао']) AND id <> v_canonical_id
        LOOP
            UPDATE orders          SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            UPDATE income_records  SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- Леша/Леша 2₽/Лёша 2 рубля → Лёша
    SELECT id INTO v_canonical_id FROM clients WHERE name ILIKE 'Лёша' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients
            WHERE name ILIKE ANY(ARRAY['Леша','Леша 2₽','Лёша 2 рубля'])
              AND id <> v_canonical_id
        LOOP
            UPDATE orders          SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            UPDATE income_records  SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- Луи Витон/Луи Виттон → Максим
    SELECT id INTO v_canonical_id FROM clients WHERE name ILIKE 'Максим' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients
            WHERE name ILIKE ANY(ARRAY['Луи Витон','Луи Виттон'])
              AND id <> v_canonical_id
        LOOP
            UPDATE orders          SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            UPDATE income_records  SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- Коля кит → Кулико
    SELECT id INTO v_canonical_id FROM clients WHERE name ILIKE 'Кулико' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM clients
            WHERE name ILIKE 'Коля кит'
              AND id <> v_canonical_id
        LOOP
            UPDATE orders          SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            UPDATE income_records  SET client_id  = v_canonical_id WHERE client_id  = v_duplicate_id;
            DELETE FROM clients WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

    -- ─────────────────────────────────────────────────────────────────
    -- SUPPLIERS (rename to city names)
    -- ─────────────────────────────────────────────────────────────────

    -- Камыш → Хабаровск
    UPDATE suppliers SET name = 'Хабаровск'
    WHERE name ILIKE 'Камыш'
      AND NOT EXISTS (SELECT 1 FROM suppliers WHERE name ILIKE 'Хабаровск');

    -- Садик Февральск → Февральск
    UPDATE suppliers SET name = 'Февральск'
    WHERE name ILIKE 'Садик Февральск'
      AND NOT EXISTS (SELECT 1 FROM suppliers WHERE name ILIKE 'Февральск');

    -- Гарик → Февральск (only if Февральск doesn't already exist after previous rename)
    -- If a supplier named Гарик still exists and no Февральск exists, rename it.
    -- If Февральск already exists, merge references and delete.
    SELECT id INTO v_canonical_id FROM suppliers WHERE name ILIKE 'Февральск' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM suppliers WHERE name ILIKE 'Гарик' AND id <> v_canonical_id
        LOOP
            UPDATE hire_deliveries SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            UPDATE fuel_receipts    SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            DELETE FROM suppliers WHERE id = v_duplicate_id;
        END LOOP;
    ELSE
        UPDATE suppliers SET name = 'Февральск' WHERE name ILIKE 'Гарик';
    END IF;

    -- Стёпа → Биробиджан
    SELECT id INTO v_canonical_id FROM suppliers WHERE name ILIKE 'Биробиджан' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM suppliers WHERE name ILIKE 'Стёпа' AND id <> v_canonical_id
        LOOP
            UPDATE hire_deliveries SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            UPDATE fuel_receipts    SET supplier_id = v_canonical_id WHERE supplier_id = v_duplicate_id;
            DELETE FROM suppliers WHERE id = v_duplicate_id;
        END LOOP;
    ELSE
        UPDATE suppliers SET name = 'Биробиджан' WHERE name ILIKE 'Стёпа';
    END IF;

    -- биржа → Биржа (capitalise)
    UPDATE suppliers SET name = 'Биржа'
    WHERE name = 'биржа';

    -- Add Ангарск if not exists
    INSERT INTO suppliers (name)
    SELECT 'Ангарск'
    WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name ILIKE 'Ангарск');

    -- Add Тында if not exists
    INSERT INTO suppliers (name)
    SELECT 'Тында'
    WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name ILIKE 'Тында');

    -- ─────────────────────────────────────────────────────────────────
    -- CARRIERS
    -- ─────────────────────────────────────────────────────────────────

    -- Козлоффы/Козлофф → Козлофф (canonical = keep the one named Козлофф)
    SELECT id INTO v_canonical_id FROM carriers WHERE name ILIKE 'Козлофф' LIMIT 1;
    IF v_canonical_id IS NOT NULL THEN
        FOR v_duplicate_id IN
            SELECT id FROM carriers
            WHERE name ILIKE 'Козлоффы'
              AND id <> v_canonical_id
        LOOP
            UPDATE hire_deliveries SET carrier_id = v_canonical_id WHERE carrier_id = v_duplicate_id;
            DELETE FROM carriers WHERE id = v_duplicate_id;
        END LOOP;
    END IF;

END $$;
