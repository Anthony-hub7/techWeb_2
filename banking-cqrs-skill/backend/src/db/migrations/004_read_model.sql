CREATE TABLE IF NOT EXISTS read_model_comptes (
  compte_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  solde NUMERIC(15, 2) DEFAULT 0,
  nb_transactions INT DEFAULT 0,
  derniere_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_read_model_user ON read_model_comptes(user_id);
