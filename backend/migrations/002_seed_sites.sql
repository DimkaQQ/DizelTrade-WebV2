-- Migration 002: ensure all 7 dispatch sites exist
INSERT INTO sites (name) VALUES ('Дипкун ближний') ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Дипкун дальний') ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Акурдан')        ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Сагинах')        ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Нагорная')       ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Камагин')        ON CONFLICT DO NOTHING;
INSERT INTO sites (name) VALUES ('Беркакит')       ON CONFLICT DO NOTHING;
