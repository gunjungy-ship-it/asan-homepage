CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('tourism', 'onsen', 'website', 'suggestion')),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 2 AND 120),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 5000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'answered', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT DEFAULT NULL
);

CREATE TRIGGER IF NOT EXISTS inquiries_updated_at
AFTER UPDATE ON inquiries
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE inquiries
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;