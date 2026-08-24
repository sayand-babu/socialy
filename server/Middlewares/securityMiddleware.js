import helmet from "helmet";
import hpp from "hpp";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../config/redis.js";

/**
 * 1. HTTP Security Headers with Helmet
 */
export const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://ik.imagekit.io", "https://images.unsplash.com", "https://randomuser.me", "https://*.clerk.com", "https://raw.githubusercontent.com"],
      connectSrc: ["'self'", "https://*.clerk.accounts.dev", "https://api.razorpay.com", "https://ik.imagekit.io", "wss:", "ws:"],
      frameSrc: ["'self'", "https://checkout.razorpay.com", "https://api.razorpay.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

/**
 * 2. HTTP Parameter Pollution Protection
 */
export const hppProtection = hpp({
  whitelist: ["platform", "niche", "sort", "status"], // Allowed query array parameters
});

/**
 * Helper to build rate limiters with graceful memory store fallback
 */
const buildLimiter = ({ windowMs, max, message }) => {
  let store = undefined;

  // Use RedisStore only if Redis is explicitly connected and ready
  if (redis && redis.status === "ready") {
    try {
      store = new RedisStore({
        // @ts-expect-error - ioredis client compatibility
        sendCommand: async (...args) => {
          try {
            return await redis.call(...args);
          } catch (err) {
            // Fallback silently if redis connection hiccups
            return null;
          }
        },
        prefix: "rl:",
      });
    } catch (e) {
      store = undefined; // Fallback to built-in memory store
    }
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store, // Defaults to built-in high-performance MemoryStore when undefined
    validate: { xForwardedForHeader: false },
    message: {
      success: false,
      message: message || "Too many requests from this IP. Please try again later.",
    },
  });
};

/**
 * Tiered Rate Limiters
 */
export const globalRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: "Global rate limit exceeded. Please wait a few minutes before trying again.",
});

export const aiRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: "AI query rate limit reached (30 requests / 15 min). Please wait before asking more questions.",
});

export const paymentRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: "Payment order creation rate limit reached. Please wait before initiating new orders.",
});

export const disputeRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Dispute action limit reached. Please wait before submitting more dispute requests.",
});

/**
 * 3. Hardened Production-Grade CORS Configuration
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.includes("vercel.app") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.startsWith("http://13.204.83.17") ||
      origin.startsWith("https://socialy");

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  maxAge: 86400, // Preflight cache for 24 hours
};
