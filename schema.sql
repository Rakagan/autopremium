-- AutoPremium — Vercel Postgres schema
-- Run once after connecting your Postgres database in the Vercel dashboard.

CREATE TABLE IF NOT EXISTS cars (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_content (
  key         TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

