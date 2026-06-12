import { creerCompteHandler } from './handlers/creerCompte.js';
import { crediterCompteHandler } from './handlers/crediterCompte.js';
import { debiterCompteHandler } from './handlers/debiterCompte.js';

const handlers = {
  CreerCompte: creerCompteHandler,
  CrediterCompte: crediterCompteHandler,
  DebiterCompte: debiterCompteHandler,
};

export async function dispatch(command) {
  const handler = handlers[command.type];
  if (!handler) throw new Error(`Commande inconnue : ${command.type}`);
  return handler(command.payload);
}
