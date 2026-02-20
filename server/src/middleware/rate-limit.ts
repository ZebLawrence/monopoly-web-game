/**
 * Simple in-memory rate limiter for WebSocket game actions.
 * Limits each connection to a configurable number of actions per second.
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

export interface RateLimiterConfig {
  /** Max actions per second per connection */
  maxPerSecond: number;
  /** Burst capacity (max tokens) */
  burst: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxPerSecond: 10,
  burst: 20,
};

export function createRateLimiter(config: RateLimiterConfig = DEFAULT_CONFIG) {
  const entries = new Map<string, RateLimitEntry>();

  function check(connectionId: string): boolean {
    const now = Date.now();
    let entry = entries.get(connectionId);

    if (!entry) {
      entry = { tokens: config.burst, lastRefill: now };
      entries.set(connectionId, entry);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - entry.lastRefill) / 1000;
    entry.tokens = Math.min(config.burst, entry.tokens + elapsed * config.maxPerSecond);
    entry.lastRefill = now;

    if (entry.tokens >= 1) {
      entry.tokens -= 1;
      return true;
    }

    return false;
  }

  function remove(connectionId: string): void {
    entries.delete(connectionId);
  }

  function clear(): void {
    entries.clear();
  }

  return { check, remove, clear };
}
