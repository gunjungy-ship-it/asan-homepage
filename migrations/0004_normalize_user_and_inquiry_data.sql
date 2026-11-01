-- Normalize repeated domain values and optional profile data into reference/child tables.
-- D1 enforces SQLite foreign keys for each transaction; defer checks during table rebuild.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE inquiry_categories (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('tourism', 'onsen', 'website', 'suggestion')),
  label TEXT NOT NULL UNIQUE
);

INSERT INTO inquiry_categories (id, code, label) VALUES
  (1, 'tourism', '관광 정보'),
  (2, 'onsen', '온천 여행'),
  (3, 'website', '홈페이지 이용'),
  (4, 'suggestion', '개선 의견');

CREATE TABLE gender_options (
  code TEXT PRIMARY KEY CHECK (code IN ('female', 'male', 'undisclosed')),
  label TEXT NOT NULL UNIQUE
);

INSERT INTO gender_options (code, label) VALUES
  ('female', '여성'),
  ('male', '남성'),
  ('undisclosed', '선택 안 함');

-- A profile contains optional personal details, separate from account credentials.
CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY,
  gender_code TEXT DEFAULT NULL REFERENCES gender_options(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  home_address TEXT DEFAULT NULL
    CHECK (home_address IS NULL OR length(trim(home_address)) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rebuild users without optional profile attributes; retain account IDs, hashes, and timestamps.
CREATE TABLE users_3nf (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL CHECK (length(trim(nickname)) BETWEEN 2 AND 50),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE
    CHECK (length(trim(email)) BETWEEN 3 AND 254),
  password_hash TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT DEFAULT NULL
);

INSERT INTO users_3nf (id, nickname, email, password_hash, created_at, updated_at, deleted_at)
SELECT id, nickname, email, password_hash, created_at, updated_at, deleted_at
FROM users;

INSERT INTO user_profiles (user_id, gender_code, home_address, created_at, updated_at)
SELECT id, gender, home_address, created_at, updated_at
FROM users;

DROP TRIGGER IF EXISTS users_updated_at;
DROP TABLE users;
ALTER TABLE users_3nf RENAME TO users;

CREATE TRIGGER users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TRIGGER user_profiles_updated_at
AFTER UPDATE ON user_profiles
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE user_profiles
  SET updated_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.user_id;
END;

-- Map existing category text to its reference row; preserve inquiry IDs and all timestamps.
CREATE TABLE inquiries_3nf (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES inquiry_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 2 AND 120),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 5000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'answered', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT DEFAULT NULL
);

INSERT INTO inquiries_3nf (id, category_id, subject, message, status, created_at, updated_at, deleted_at)
SELECT i.id, c.id, i.subject, i.message, i.status, i.created_at, i.updated_at, i.deleted_at
FROM inquiries AS i
JOIN inquiry_categories AS c ON c.code = i.category;

DROP TRIGGER IF EXISTS inquiries_updated_at;
DROP TABLE inquiries;
ALTER TABLE inquiries_3nf RENAME TO inquiries;

CREATE TRIGGER inquiries_updated_at
AFTER UPDATE ON inquiries
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE inquiries
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE INDEX idx_inquiries_category_id ON inquiries(category_id);
CREATE INDEX idx_inquiries_status_created_at ON inquiries(status, created_at);