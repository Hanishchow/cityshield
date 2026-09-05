/**
 * Per-incident pub/sub backing the SSE stream.
 *
 * SSE rather than WebSockets on purpose: responder tracking is a one-way
 * server-to-client stream, EventSource reconnects on its own after a dropped
 * mobile connection, and it survives corporate proxies that break WS upgrades.
 * A citizen watching an ambulance approach is exactly the case where the
 * connection WILL drop and must come back by itself.
 */

type Listener = (event: string, data: unknown) => void;

const topics = new Map<string, Set<Listener>>();

export function subscribe(id: string, listener: Listener): () => void {
  let set = topics.get(id);
  if (!set) {
    set = new Set();
    topics.set(id, set);
  }
  set.add(listener);

  return () => {
    set.delete(listener);
    /* Drop the topic once nobody is listening, or the map grows without bound
       across the lifetime of the process. */
    if (set.size === 0) topics.delete(id);
  };
}

export function publish(id: string, event: string, data: unknown): void {
  const set = topics.get(id);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(event, data);
    } catch {
      /* One broken client must never stop the others being notified. */
    }
  }
}

export const topicCount = () => topics.size;
