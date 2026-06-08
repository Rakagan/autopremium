-- AutoPremium — Turso (SQLite) schema
-- Run once in the Turso dashboard shell or via the Turso CLI.

CREATE TABLE IF NOT EXISTS cars (
  id          TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  approved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_content (
  key         TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  updated_at  TEXT DEFAULT (datetime('now'))
);
