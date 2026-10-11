/**
 * In-process cache for the expensive network-wide aggregates.
 *
 * Why this works without any cache infrastructure: the three aggregate reads in
 * db.service.js each scan the entire DynamoDB table, and Lambda keeps a
 * container warm between invocations, so a plain Map removes almost all of that
 * read cost for zero spend and zero added latency.
 *
 * What it deliberately does not do: share state between containers. Each warm
 * Lambda holds its own copy, so an eviction in one container is invisible to
 * the others. That is why TTLs here are short - the TTL, not invalidation, is
 * what bounds how stale an aggregate can get. Anything that genuinely needs
 * cross-instance state (exact rate limiting, distributed locks) would need a
 * shared cache such as ElastiCache, which is a VPC and ~USD 100/month decision
 * and is intentionally not part of this setup.
 *
 * Hard rule: the cache is an optimisation and must never fail a request. Every
 * operation swallows its own errors and degrades to a cache miss.
 */

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 60;
const MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES) || 500;
const KEY_PREFIX = process.env.CACHE_PREFIX || 'kaagaz';
const ENABLED = process.env.CACHE_ENABLED !== 'false';

const namespaced = (key) => `${KEY_PREFIX}:${key}`;

// Logged at most once per container so a misbehaving cache cannot flood logs.
const warned = new Set();
const warnOnce = (scope, error) => {
  if (warned.has(scope)) return;
  warned.add(scope);
  console.warn(`[cache] ${scope} failed, continuing without cache:`, error && error.message);
};

const store = new Map();

/**
 * Bounded so a long-lived warm container cannot grow without limit. Expired
 * entries are dropped first; if everything is still live we evict the
 * insertion-oldest, which Map iteration order gives us for free.
 */
const evictIfNeeded = () => {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
};

const get = async (key) => {
  if (!ENABLED) return null;
  try {
    const entry = store.get(namespaced(key));
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(namespaced(key));
      return null;
    }
    return entry.value;
  } catch (error) {
    warnOnce('get', error);
    return null;
  }
};

const set = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  if (!ENABLED) return;
  try {
    store.set(namespaced(key), { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    evictIfNeeded();
  } catch (error) {
    warnOnce('set', error);
  }
};

const del = async (...keys) => {
  if (!ENABLED) return;
  try {
    keys.flat().filter(Boolean).forEach((key) => store.delete(namespaced(key)));
  } catch (error) {
    warnOnce('del', error);
  }
};

/**
 * Read-through helper. On a hit the loader is never called; on a miss the
 * loader runs and its result is cached best-effort.
 *
 * `undefined` is never cached, so a loader that legitimately returns nothing
 * will not pin an empty value for the whole TTL.
 */
const wrap = async (key, ttlSeconds, loader) => {
  const cached = await get(key);
  if (cached !== null && cached !== undefined) return cached;
  const value = await loader();
  if (value !== undefined) await set(key, value, ttlSeconds);
  return value;
};

const status = () => ({
  enabled: ENABLED,
  driver: 'memory',
  defaultTtlSeconds: DEFAULT_TTL_SECONDS,
  entries: store.size,
  // Flags that evictions do not propagate between Lambda containers, so a
  // reader knows staleness is bounded by the TTL rather than by invalidation.
  shared: false,
});

module.exports = {
  get,
  set,
  del,
  wrap,
  status,
  DEFAULT_TTL_SECONDS,
};
