# Référence OpenAPI

## `src/rest/openapi.yaml` — Spec complète

```yaml
openapi: 3.0.3
info:
  title: Banking App API
  description: Application bancaire CQRS + Event Sourcing
  version: 1.0.0

servers:
  - url: http://localhost:4000/api
    description: Développement local

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:   { type: string, format: email }
        password: { type: string, minLength: 8 }

    TokenResponse:
      type: object
      properties:
        accessToken:  { type: string }
        refreshToken: { type: string }

    Compte:
      type: object
      properties:
        id:         { type: string, format: uuid }
        numero:     { type: string, example: ACC-2026-abc123 }
        statut:     { type: string, enum: [actif, suspendu, cloture] }
        created_at: { type: string, format: date-time }

    SoldeResult:
      type: object
      properties:
        compte_id:      { type: string, format: uuid }
        solde:          { type: number, example: 380000 }
        devise:         { type: string, example: MGA }
        nb_transactions: { type: integer }
        derniere_op:    { type: string, format: date-time }

    Transaction:
      type: object
      properties:
        id:           { type: string, format: uuid }
        type:         { type: string, enum: [CompteCrédité, CompteDébité] }
        montant:      { type: number }
        devise:       { type: string }
        version:      { type: integer }
        created_at:   { type: string, format: date-time }

    Error:
      type: object
      properties:
        error: { type: string }

security:
  - BearerAuth: []

paths:
  /auth/login:
    post:
      summary: Authentification email / password
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: Tokens JWT retournés
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenResponse' }
        '401':
          description: Identifiants invalides
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /auth/refresh:
    post:
      summary: Rotation du refresh token
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                refreshToken: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenResponse' }

  /auth/oauth/google:
    get:
      summary: Démarrer le flux OAuth Google
      security: []
      responses:
        '302':
          description: Redirection vers Google

  /accounts:
    get:
      summary: Liste des comptes de l'utilisateur connecté
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Compte' }
    post:
      summary: Créer un nouveau compte
      responses:
        '201':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Compte' }

  /accounts/{id}:
    get:
      summary: Solde et détails du compte (Read Model)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SoldeResult' }

  /accounts/{id}/credit:
    post:
      summary: Créditer le compte (commande CrediterCompte)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                montant: { type: number, minimum: 1 }
      responses:
        '201':
          description: Événement CompteCrédité créé

  /accounts/{id}/debit:
    post:
      summary: Débiter le compte (commande DebiterCompte)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                montant: { type: number, minimum: 1 }
      responses:
        '201':
          description: Événement CompteDébité créé
        '400':
          description: Solde insuffisant
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /accounts/{id}/history:
    get:
      summary: Historique des transactions (depuis Event Store)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Transaction' }
```

---

## Routes Express correspondantes

### `src/rest/routes/accounts.routes.js`

```js
import { Router } from 'express';
import { listAccounts, getAccount, createAccount } from '../controllers/account.controller.js';

const router = Router();
router.get('/',    listAccounts);
router.post('/',   createAccount);
router.get('/:id', getAccount);
export default router;
```

### `src/rest/routes/transactions.routes.js`

```js
import { Router } from 'express';
import { crediter, debiter, historique } from '../controllers/transaction.controller.js';

const router = Router();
router.post('/:id/credit',  crediter);
router.post('/:id/debit',   debiter);
router.get('/:id/history',  historique);
export default router;
```

### `src/rest/routes/auth.routes.js`

```js
import { Router } from 'express';
import passport from 'passport';
import { login, refresh } from '../controllers/auth.controller.js';

const router = Router();
router.post('/login',   login);
router.post('/refresh', refresh);
router.get('/oauth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/oauth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const { accessToken, refreshToken } = req.user;
    res.redirect(`http://localhost:3000/auth/callback?access=${accessToken}&refresh=${refreshToken}`);
  }
);
export default router;
```
