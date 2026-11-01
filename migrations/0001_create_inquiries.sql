CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('tourism', 'onsen', 'website', 'suggestion')),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 2 AND 120),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 5000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'answered', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);