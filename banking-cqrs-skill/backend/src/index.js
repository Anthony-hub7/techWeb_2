import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authMiddleware } from './auth/authMiddleware.js';
import authRoutes from './rest/routes/auth.routes.js';
import accountRoutes from './rest/routes/accounts.routes.js';
import transactionRoutes from './rest/routes/transactions.routes.js';
import { typeDefs, resolvers } from './graphql/index.js';
import { setupWebSocket } from './websocket/wsServer.js';
import { startProjectionRunner } from './projections/projectionRunner.js';
import { eventBus } from './events/eventBus.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

app.use(express.json());

const openApiSpec = YAML.load(join(__dirname, './rest/openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/accounts', authMiddleware, transactionRoutes);

const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await apollo.start();
app.use('/graphql', expressMiddleware(apollo, {
  context: async ({ req }) => ({ user: req.user }),
}));

const { io, notify } = setupWebSocket(httpServer);

startProjectionRunner();

eventBus.on('compte.events', (event) => {
  notify(event);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Serveur prêt sur http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
  console.log(`GraphQL: http://localhost:${PORT}/graphql`);
});
