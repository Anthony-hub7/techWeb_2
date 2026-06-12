CREATE TABLE IF NOT EXISTS comptes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  numero     TEXT UNIQUE NOT NULL DEFAULT 'ACC-' || to_char(now(), 'YYYY') || '-' || substr(gen_random_uuid()::text, 1, 6),
  statut     TEXT NOT NULL DEFAULT 'actif'
             CHECK (statut IN ('actif', 'suspendu', 'cloture')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comptes_user_id ON comptes(user_id);
