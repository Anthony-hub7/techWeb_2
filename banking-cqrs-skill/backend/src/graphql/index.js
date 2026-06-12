import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryResolvers } from './queryResolvers.js';
import { commandResolvers } from './commandResolvers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf8');

export const resolvers = {
  Query: queryResolvers,
  Mutation: commandResolvers,
};
