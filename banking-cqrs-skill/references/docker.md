# Référence Docker

## `docker-compose.yml`

```yaml
version: '3.9'

services:

  postgres:
    image: postgres:16-alpine
    container_name: banking_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: banking_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: banking_zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: banking_kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 10s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: banking_backend
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/banking_db
      KAFKA_BROKERS: kafka:29092
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      OAUTH_GOOGLE_CLIENT_ID: ${OAUTH_GOOGLE_CLIENT_ID}
      OAUTH_GOOGLE_CLIENT_SECRET: ${OAUTH_GOOGLE_CLIENT_SECRET}
      OAUTH_CALLBACK_URL: http://localhost:4000/api/auth/oauth/google/callback
    volumes:
      - ./backend/src:/app/src
    command: node --watch src/index.js

volumes:
  postgres_data:
```

---

## `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]
```

### Dockerfile multi-stage (production)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json .

EXPOSE 4000
USER node
CMD ["node", "src/index.js"]
```

---

## `.env.example`

```env
# Base de données
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/banking_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=banking_db

# Kafka
KAFKA_BROKERS=localhost:9092

# JWT
JWT_SECRET=change_me_in_production_min_32_chars
JWT_REFRESH_SECRET=another_secret_for_refresh_tokens

# OAuth Google (optionnel)
OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret

# App
PORT=4000
NODE_ENV=development
```

---

## Commandes utiles

```bash
# Lancer tout le stack
docker compose up -d

# Voir les logs du backend
docker compose logs -f backend

# Accéder à PostgreSQL
docker compose exec postgres psql -U postgres -d banking_db

# Lister les topics Kafka
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Reconstruire le backend après changement de dépendances
docker compose build backend && docker compose up -d backend

# Arrêter et supprimer les volumes (reset complet)
docker compose down -v
```

---

## Réseau interne Docker

Les services communiquent par leurs noms de conteneur :

| Service   | Accessible depuis le backend via       |
|-----------|----------------------------------------|
| postgres  | `postgres:5432`                        |
| kafka     | `kafka:29092` (port interne)           |
| backend   | `localhost:4000` (depuis l'hôte)       |
| swagger   | `http://localhost:4000/api-docs`       |
| graphql   | `http://localhost:4000/graphql`        |

---

## `package.json` — dépendances backend

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "migrate": "node src/db/migrate.js"
  },
  "dependencies": {
    "@apollo/server": "^4.10.0",
    "express": "^4.18.0",
    "graphql": "^16.8.0",
    "pg": "^8.11.0",
    "kafkajs": "^2.2.4",
    "socket.io": "^4.7.0",
    "jsonwebtoken": "^9.0.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "bcrypt": "^5.1.0",
    "swagger-ui-express": "^5.0.0",
    "yamljs": "^0.3.0",
    "dotenv": "^16.0.0"
  }
}
```
