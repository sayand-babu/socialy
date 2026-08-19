import "dotenv/config";
import Redis from "ioredis";

// Redis Connection Configuration
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient = null;
let isRedisConnected = false;

try {
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    retryStrategy(times) {
      // Reconnect with capped backoff
      if (times > 5) {
        return 10000;
      }
      return Math.min(times * 1000, 5000);
    },
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("⚡ [Redis] Successfully connected to Redis server");
  });

  redisClient.on("ready", () => {
    isRedisConnected = true;
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
    // Suppress connection refused spam in dev environments without Redis
    if (err.code === "ECONNREFUSED") {
      // Silent or info log
    } else {
      console.warn("⚠️ [Redis Error]:", err.message);
    }
  });

  redisClient.on("close", () => {
    isRedisConnected = false;
  });

  // Attempt initial lazy connection without blocking startup
  redisClient.connect().catch(() => {
    // Non-fatal: PostgreSQL fallback is active
  });
} catch (err) {
  console.warn("⚠️ [Redis Init Warning]: Could not initialize Redis. Operating in direct database mode.");
}

/**
 * Safely retrieve a cached value by key.
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed JSON or null
 */
export const getCache = async (key) => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
};

/**
 * Safely store a value in cache with a TTL.
 * @param {string} key - Cache key
 * @param {any} value - Value to serialize and store
 * @param {number} [ttlSeconds=300] - Expiry in seconds (default 5 min)
 * @returns {Promise<boolean>} Success boolean
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
  if (!redisClient || !isRedisConnected || value === undefined) return false;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redisClient.set(key, serialized, "EX", ttlSeconds);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Safely delete one or more cache keys.
 * @param {...string} keys - Cache keys to delete
 * @returns {Promise<number>} Number of deleted keys
 */
export const delCache = async (...keys) => {
  if (!redisClient || !isRedisConnected || keys.length === 0) return 0;
  try {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length === 0) return 0;
    return await redisClient.del(...validKeys);
  } catch (error) {
    return 0;
  }
};

/**
 * Safely invalidate all keys matching a wildcard pattern using non-blocking SCAN.
 * @param {string} pattern - Pattern e.g. "listings:*"
 * @returns {Promise<number>} Number of keys invalidated
 */
export const delCachePattern = async (pattern) => {
  if (!redisClient || !isRedisConnected || !pattern) return 0;
  try {
    let cursor = "0";
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      if (keys && keys.length > 0) {
        await redisClient.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== "0");

    return totalDeleted;
  } catch (error) {
    return 0;
  }
};

export default redisClient;
