/**
 * Module-level in-memory API cache with TTL support.
 *
 * Lives in module scope so it persists across tab switches without
 * hitting the server again. Pull-to-refresh callers can pass
 * `forceRefresh = true` to bypass and repopulate the cache.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<any>>();

/** Default TTLs (in milliseconds) */
export const CACHE_TTL = {
  TODAY_LOGS: 2 * 60 * 1000,      // 2 minutes  – changes after each punch
  MONTHLY_ATTENDANCE: 5 * 60 * 1000, // 5 minutes
  LEAVE: 5 * 60 * 1000,            // 5 minutes
  TIMESLIPS: 5 * 60 * 1000,        // 5 minutes
  AUTH_PROFILE: 10 * 60 * 1000,    // 10 minutes – almost static
  ORG_SETTINGS: 15 * 60 * 1000,    // 15 minutes – rarely changes
};

/**
 * Returns cached data if it exists and is younger than `ttlMs`,
 * otherwise returns `null`.
 */
export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Stores `data` in the cache under `key` with the current timestamp.
 */
export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}

/**
 * Removes a single cache entry (e.g. after a mutation like submitting
 * a leave request or timeslip).
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Removes all entries whose key starts with `prefix`.
 * Useful for invalidating a whole section (e.g. "leave_").
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Convenience wrapper: returns cached data if fresh, otherwise calls
 * `fetcher`, caches the result, and returns it.
 *
 * @param key        Cache key
 * @param ttlMs      TTL in milliseconds
 * @param fetcher    Async function that returns fresh data
 * @param force      Skip cache lookup and always call fetcher
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  force = false,
): Promise<T> {
  if (!force) {
    const cached = getCached<T>(key, ttlMs);
    if (cached !== null) return cached;
  }
  const data = await fetcher();
  setCached(key, data);
  return data;
}
