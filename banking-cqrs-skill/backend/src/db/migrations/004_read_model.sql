CREATE TABLE IF NOT EXISTS read_model_comptes (
  compte_id       UUID PRIMARY KEY REFERENCES comptes(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  solde           DECIMAL(15, 2) NOT NULL DEFAULT 0
                  CHECK (solde >= 0),
  nb_transactions INT NOT NULL DEFAULT 0,
  derniere_op     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rm_user_id ON read_model_comptes(user_id);
