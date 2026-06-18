-- Migration 028: Remove duplicate and incorrect reference entries
-- Carriers: 3 drivers (not carriers) + 3 name duplicates
DELETE FROM carriers WHERE id IN (14, 18, 19, 20, 21, 27);

-- Clients: 2 duplicates
DELETE FROM clients WHERE id IN (33, 36);
