CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- These schema revisions were already provisioned directly to the existing D1 databases.
INSERT OR IGNORE INTO d1_migrations (name) VALUES
  ('0001_create_inquiries.sql'),
  ('0002_add_inquiry_audit_timestamps.sql'),
  ('0003_create_users.sql'),
  ('0004_normalize_user_and_inquiry_data.sql');