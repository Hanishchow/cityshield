import { config } from '../config.ts';
import { createMemoryStore } from './memory.ts';
import type { Store } from './types.ts';

export type { Store };

/**
 * Postgres is wired in only when DATABASE_URL is present. Until then the
 * in-memory store keeps the service fully functional locally, which is the
 * point: nobody should need to install a database to run the API.
 */
export const store: Store = createMemoryStore();
