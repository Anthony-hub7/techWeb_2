CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,
  oauth_provider  TEXT,
  oauth_id        TEXT,
  refresh_token   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT oauth_or_password CHECK (
    password_hash IS NOT NULL OR (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;
