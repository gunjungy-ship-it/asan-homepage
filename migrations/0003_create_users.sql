CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL CHECK (length(trim(nickname)) BETWEEN 2 AND 50),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (length(trim(email)) BETWEEN 3 AND 254),
  gender TEXT DEFAULT NULL
    CHECK (gender IS NULL OR gender IN ('female', 'male', 'undisclosed')),
  home_address TEXT DEFAULT NULL
    CHECK (home_address IS NULL OR length(trim(home_address)) BETWEEN 1 AND 500),
  password_hash TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT DEFAULT NULL
);

CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;