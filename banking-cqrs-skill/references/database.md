# Référence base de données

## Schéma relationnel (4 tables)

```
users ──< comptes ──< events
users ──< events (created_by)
comptes ──── read_model_comptes (1:1 projection)
```

---

## Migrations SQL

### `001_users.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
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

CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;
```

### `002_comptes.sql`

```sql
CREATE TABLE comptes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  numero     TEXT UNIQUE NOT NULL DEFAULT 'ACC-' || to_char(now(), 'YYYY') || '-' || substr(gen_random_uuid()::text, 1, 6),
  statut     TEXT NOT NULL DEFAULT 'actif'
             CHECK (statut IN ('actif', 'suspendu', 'cloture')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comptes_user_id ON comptes(user_id);
```

### `003_events.sql`

```sql
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL REFERENCES comptes(id),
  version      INT NOT NULL,
  type         TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),

  -- Garantie d'ordre : pas deux événements au même numéro de version pour un même compte
  CONSTRAINT events_aggregate_version_unique UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_events_aggregate_id ON events(aggregate_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
```

> La table `events` est **append-only** — aucun `UPDATE` ni `DELETE` ne doit être effectué.
> Le champ `version` assure l'ordre causal des événements par agrégat.

### `004_read_model.sql`

```sql
CREATE TABLE read_model_comptes (
  compte_id       UUID PRIMARY KEY REFERENCES comptes(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  solde           DECIMAL(15, 2) NOT NULL DEFAULT 0
                  CHECK (solde >= 0),
  nb_transactions INT NOT NULL DEFAULT 0,
  derniere_op     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rm_user_id ON read_model_comptes(user_id);
```

> Cette table est **écrite uniquement par le ProjectionRunner** (jamais par les controllers REST).
> Les Query Resolvers et controllers GET lisent exclusivement ici.

---

## Exemples de données

### Événements d'un compte

```sql
SELECT aggregate_id, version, type, payload, created_at
FROM events
WHERE aggregate_id = 'uuid-du-compte'
ORDER BY version ASC;

-- Résultat :
-- version 1 : CompteCreé    { "userId": "...", "numero": "ACC-2026-001" }
-- version 2 : CompteCrédité { "montant": 500000, "devise": "MGA", "ref": "VIR-001" }
-- version 3 : CompteDébité  { "montant": 120000, "devise": "MGA", "ref": "RET-042" }
-- version 4 : CompteCrédité { "montant": 300000, "devise": "MGA", "ref": "VIR-002" }
```

### Reconstruction du solde

```sql
-- Solde calculé depuis les événements (pour vérification / rebuild)
SELECT
  SUM(CASE WHEN type = 'CompteCrédité' THEN (payload->>'montant')::decimal ELSE 0 END) -
  SUM(CASE WHEN type = 'CompteDébité'  THEN (payload->>'montant')::decimal ELSE 0 END) AS solde_recalcule
FROM events
WHERE aggregate_id = 'uuid-du-compte';
```

---

## Connexion PostgreSQL (Node.js)

### `src/db/eventStoreDB.js` et `readModelDB.js`

```js
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL inattendue', err);
});
```

Les deux fichiers utilisent le même pool — `DATABASE_URL` pointe vers la même base.
En production, on peut séparer les pools (EventStore → réplica primaire, ReadModel → réplica secondaire).

---

## Variables d'environnement BDD

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/banking_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=banking_db
```
