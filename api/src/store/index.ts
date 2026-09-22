import { createMemoryStore } from './memory.ts';
import { createPostgresStore } from './postgres.ts';
import type { Store } from './types.ts';
import { config, reportStoreKind } from '../config.ts';

export type { Store };

/**
 * Postgres is wired in only when DATABASE_URL is present. Until then the
 * in-memory store keeps the service fully functional locally, which is the
 * point: nobody should need to install a database to run the API.
 */
export const store: Store = config.databaseUrl
  ? createPostgresStore(config.databaseUrl)
  : createMemoryStore();

reportStoreKind(() => store.kind);
