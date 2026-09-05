import { createAuditChain } from './chain.ts';

/**
 * One process-wide chain. It is in-memory today, which means it does not
 * survive a restart — the durability story is the `incident_events` table this
 * mirrors once Postgres is wired up. The chain logic is separated from its
 * storage precisely so that swap changes where entries live, not how they are
 * linked or verified.
 */
export const audit = createAuditChain();
