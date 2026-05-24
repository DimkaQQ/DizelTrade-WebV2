-- Тестовые пользователи для проверки ролей
-- Пароль для всех: Test1234
-- ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ — удалить на продакшене если нужно

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES
  ('Артём Тест', 'artem@test.local',    '$2b$12$C13c8ojcbCPnG3hVkRC0yOCsczzqVg/Gj.MCf4LbyPEwbzZfLFTRO', 'artem',    TRUE),
  ('Оператор Тест', 'op@test.local',    '$2b$12$C13c8ojcbCPnG3hVkRC0yOCsczzqVg/Gj.MCf4LbyPEwbzZfLFTRO', 'operator', TRUE)
ON CONFLICT (email) DO NOTHING;
