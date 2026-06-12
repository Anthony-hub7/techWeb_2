---
name: banking-cqrs-event-sourcing
description: >
  Architecture complète d'une application bancaire Node.js combinant CQRS, Event Sourcing,
  API REST (OpenAPI), API GraphQL, JWT/OAuth2, WebSocket, PostgreSQL et Docker.
  Utiliser ce skill dès que l'utilisateur mentionne : CQRS, Event Sourcing, application bancaire,
  gestion de comptes, journal d'événements, projection, Read Model, CommandBus, EventStore,
  ou toute combinaison REST + GraphQL + WebSocket + Auth sur Node.js.
  Aussi déclencher pour toute question sur la dockerisation de ce projet ou l'ajout de nouvelles
  fonctionnalités (routes, commandes, projections, migrations).
---

# Banking App — CQRS + Event Sourcing

## Vue d'ensemble

Application bancaire Node.js structurée autour de deux patterns fondamentaux :
- **CQRS** : séparation stricte des chemins d'écriture (Command) et de lecture (Query)
- **Event Sourcing** : l'état du système est reconstruit à partir d'un journal immuable d'événements

Deux surfaces API coexistent sur le même serveur Express :
- **REST** (OpenAPI 3.0) — opérations CRUD standards, documentées via `/api-docs`
- **GraphQL** (Apollo Server) — queries/mutations flexibles, subscriptions temps-réel

Voir `references/architecture.md` pour le diagramme complet et `references/database.md` pour le schéma SQL.

---

## Arborescence du projet

```
banking-app/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js                        # Point d'entrée Express + Apollo + WS
│       │
│       ├── rest/                           # API REST (OpenAPI)
│       │   ├── openapi.yaml                # Spec OpenAPI 3.0
│       │   ├── routes/
│       │   │   ├── auth.routes.js          # POST /auth/login, /auth/refresh, /auth/oauth
│       │   │   ├── accounts.routes.js      # GET/POST /accounts, GET /accounts/:id
│       │   │   └── transactions.routes.js  # POST /accounts/:id/credit|debit, GET /accounts/:id/history
│       │   └── controllers/
│       │       ├── auth.controller.js
│       │       ├── account.controller.js
│       │       └── transaction.controller.js
│       │
│       ├── graphql/
│       │   ├── schema.graphql              # Types, Query, Mutation, Subscription
│       │   ├── commandResolvers.js         # Mutations → CommandBus
│       │   └── queryResolvers.js           # Queries → Read Model DB
│       │
│       ├── commands/
│       │   ├── commandBus.js               # Dispatcher — mappe type → handler
│       │   └── handlers/
│       │       ├── creerCompte.js
│       │       ├── crediterCompte.js
│       │       └── debiterCompte.js
│       │
│       ├── events/
│       │   ├── eventStore.js               # INSERT immuable dans PostgreSQL
│       │   ├── eventBus.js                 # Publication Kafka / Redis Streams
│       │   └── types/
│       │       ├── CompteCreé.js
│       │       ├── CompteCrédité.js
│       │       └── CompteDébité.js
│       │
│       ├── projections/
│       │   ├── projectionRunner.js         # Consomme Kafka → met à jour Read Model
│       │   └── compteProjection.js         # Logique de reconstruction du solde
│       │
│       ├── queries/
│       │   ├── soldeActuel.js              # SELECT depuis read_model_comptes
│       │   └── historiqueTransactions.js   # SELECT depuis events (order by version)
│       │
│       ├── auth/
│       │   ├── jwtService.js               # sign/verify access (15min) + refresh (7j)
│       │   ├── oauthService.js             # Passport.js — Google / GitHub
│       │   ├── authMiddleware.js           # Vérifie JWT, injecte req.user
│       │   └── refreshToken.js            # Rotation sécurisée du refresh token
│       │
│       ├── websocket/
│       │   ├── wsServer.js                 # socket.io — mappe userId → socketId
│       │   ├── notificationService.js      # Envoie notif ciblée après événement
│       │   └── wsAuth.js                  # Vérifie JWT au handshake WS
│       │
│       └── db/
│           ├── eventStoreDB.js             # Pool PostgreSQL — table events
│           ├── readModelDB.js              # Pool PostgreSQL — table read_model_comptes
│           └── migrations/
│               ├── 001_users.sql
│               ├── 002_comptes.sql
│               ├── 003_events.sql
│               └── 004_read_model.sql
└── frontend/
    └── src/
        ├── apollo/client.js
        ├── auth/
        ├── pages/
        └── hooks/useNotifications.js
```

---

## Implémentation des fichiers clés

### `src/index.js` — Point d'entrée

```js
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { Server } from 'socket.io';
import { authMiddleware } from './auth/authMiddleware.js';
import { wsServer } from './websocket/wsServer.js';
import authRoutes from './rest/routes/auth.routes.js';
import accountRoutes from './rest/routes/accounts.routes.js';
import transactionRoutes from './rest/routes/transactions.routes.js';
import { typeDefs, resolvers } from './graphql/index.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.json());

// REST — OpenAPI
const openApiSpec = YAML.load('./src/rest/openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/accounts', authMiddleware, transactionRoutes);

// GraphQL
const apollo = new ApolloServer({ typeDefs, resolvers });
await apollo.start();
app.use('/graphql', expressMiddleware(apollo, {
  context: async ({ req }) => ({ user: req.user })
}));

// WebSocket
wsServer(io);

httpServer.listen(4000, () => console.log('Server ready on :4000'));
```

### `src/commands/commandBus.js`

```js
import { creerCompteHandler }    from './handlers/creerCompte.js';
import { crediterCompteHandler } from './handlers/crediterCompte.js';
import { debiterCompteHandler }  from './handlers/debiterCompte.js';

const handlers = {
  CreerCompte:    creerCompteHandler,
  CrediterCompte: crediterCompteHandler,
  DebiterCompte:  debiterCompteHandler,
};

export async function dispatch(command) {
  const handler = handlers[command.type];
  if (!handler) throw new Error(`Commande inconnue : ${command.type}`);
  return handler(command.payload);
}
```

### `src/commands/handlers/crediterCompte.js`

```js
import { eventStore } from '../../events/eventStore.js';
import { eventBus }   from '../../events/eventBus.js';

export async function crediterCompteHandler({ compteId, montant, userId }) {
  const version = await eventStore.nextVersion(compteId);
  const event = {
    aggregate_id: compteId,
    version,
    type: 'CompteCrédité',
    payload: { montant, devise: 'MGA' },
    created_by: userId,
  };
  await eventStore.append(event);
  await eventBus.publish('compte.events', event);
  return event;
}
```

### `src/events/eventStore.js`

```js
import { pool } from '../db/eventStoreDB.js';

export const eventStore = {
  async append(event) {
    const sql = `
      INSERT INTO events (aggregate_id, version, type, payload, created_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const { rows } = await pool.query(sql, [
      event.aggregate_id, event.version,
      event.type, event.payload, event.created_by
    ]);
    return rows[0];
  },

  async nextVersion(aggregateId) {
    const { rows } = await pool.query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM events WHERE aggregate_id = $1',
      [aggregateId]
    );
    return rows[0].next;
  },

  async replay(aggregateId) {
    const { rows } = await pool.query(
      'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY version ASC',
      [aggregateId]
    );
    return rows;
  },
};
```

### `src/projections/projectionRunner.js`

```js
import { kafka } from '../events/eventBus.js';
import { compteProjection } from './compteProjection.js';
import { notificationService } from '../websocket/notificationService.js';

const consumer = kafka.consumer({ groupId: 'projection-group' });

export async function startProjectionRunner() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'compte.events', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      await compteProjection.apply(event);
      await notificationService.notify(event);
    },
  });
}
```

### `src/projections/compteProjection.js`

```js
import { pool } from '../db/readModelDB.js';

export const compteProjection = {
  async apply(event) {
    switch (event.type) {
      case 'CompteCreé':
        await pool.query(
          `INSERT INTO read_model_comptes (compte_id, user_id, solde)
           VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
          [event.aggregate_id, event.payload.userId]
        );
        break;
      case 'CompteCrédité':
        await pool.query(
          `UPDATE read_model_comptes
           SET solde = solde + $1, nb_transactions = nb_transactions + 1,
               derniere_op = now(), updated_at = now()
           WHERE compte_id = $2`,
          [event.payload.montant, event.aggregate_id]
        );
        break;
      case 'CompteDébité':
        await pool.query(
          `UPDATE read_model_comptes
           SET solde = solde - $1, nb_transactions = nb_transactions + 1,
               derniere_op = now(), updated_at = now()
           WHERE compte_id = $2`,
          [event.payload.montant, event.aggregate_id]
        );
        break;
    }
  },
};
```

### `src/rest/controllers/transaction.controller.js`

```js
import { dispatch } from '../../commands/commandBus.js';
import { historiqueTransactions } from '../../queries/historiqueTransactions.js';

export async function crediter(req, res) {
  try {
    const event = await dispatch({
      type: 'CrediterCompte',
      payload: { compteId: req.params.id, montant: req.body.montant, userId: req.user.id }
    });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function debiter(req, res) {
  try {
    const event = await dispatch({
      type: 'DebiterCompte',
      payload: { compteId: req.params.id, montant: req.body.montant, userId: req.user.id }
    });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function historique(req, res) {
  const rows = await historiqueTransactions(req.params.id);
  res.json(rows);
}
```

### `src/auth/authMiddleware.js`

```js
import { verifyToken } from './jwtService.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
```

### `src/websocket/wsServer.js`

```js
import { verifyToken } from '../auth/jwtService.js';

const userSockets = new Map(); // userId → Set<socketId>

export function wsServer(io) {
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth.token);
      next();
    } catch {
      next(new Error('Auth WebSocket échouée'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId } = socket.user;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket.id);
    });
  });

  return { io, userSockets };
}
```

---

## REST — Routes principales

```
POST   /api/auth/login              → Retourne access + refresh token
POST   /api/auth/refresh            → Rotation du refresh token
GET    /api/auth/oauth/google       → Redirect OAuth Google

GET    /api/accounts                → Liste des comptes de l'utilisateur
POST   /api/accounts                → Crée un compte (commande CreerCompte)
GET    /api/accounts/:id            → Détail + solde (depuis Read Model)

POST   /api/accounts/:id/credit     → Commande CrediterCompte
POST   /api/accounts/:id/debit      → Commande DebiterCompte
GET    /api/accounts/:id/history    → Historique (depuis events, ORDER BY version)
```

---

## GraphQL — Schema

```graphql
type Query {
  soldeActuel(compteId: ID!): SoldeResult
  historiqueTransactions(compteId: ID!): [Transaction!]!
  mesComptes: [Compte!]!
}

type Mutation {
  creerCompte: Compte!
  crediterCompte(compteId: ID!, montant: Float!): Event!
  debiterCompte(compteId: ID!, montant: Float!): Event!
}

type Subscription {
  transactionEffectuee(compteId: ID!): Event!
}
```

---

## Auth — Flux JWT + OAuth

**Login classique** :
1. `POST /api/auth/login` → vérifie email/password_hash → retourne `{ accessToken, refreshToken }`
2. `accessToken` : JWT signé, expire 15 min, contient `{ id, email }`
3. `refreshToken` : JWT signé, expire 7 jours, stocké en BDD pour révocation possible

**OAuth Google/GitHub** :
1. Redirect vers `/api/auth/oauth/google`
2. Callback Passport.js → upsert `users` (oauth_provider + oauth_id)
3. Émet un JWT interne identique au flow classique

**WebSocket** :
- Client envoie `{ auth: { token: accessToken } }` au handshake
- `wsAuth.js` vérifie le JWT avant d'accepter la connexion

---

## Références détaillées

- `references/database.md` — Schéma SQL complet, migrations, index recommandés
- `references/docker.md` — docker-compose.yml, Dockerfile, variables d'environnement
- `references/openapi.md` — Spec OpenAPI 3.0 complète pour Swagger UI
