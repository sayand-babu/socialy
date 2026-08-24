import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { inngest, functions, serve } from "./src/inngest/index.js";
import {
  helmetSecurity,
  hppProtection,
  globalRateLimiter,
  corsOptions,
} from "./Middlewares/securityMiddleware.js";
import listingRouter from "./Routes/listingRoutes.js";
import chatRouter from "./Routes/chatRoutes.js";
import adminRouter from "./Routes/adminRoutes.js";
import paymentRouter from "./Routes/paymentRoutes.js";
import aiRouter from "./Routes/aiRoutes.js";
import uploadRouter from "./Routes/uploadRoutes.js";
import { attachChatSocketServer } from "./config/chatSocket.js";

const app = express();

// 1. HTTP Security Headers
app.use(helmetSecurity);

// 2. Hardened CORS
app.use(cors(corsOptions));

// 3. Payload size limiting & JSON parser (prevents memory exhaustion)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 4. HTTP Parameter Pollution Defense
app.use(hppProtection);

// 5. Global Rate Limiter
app.use(globalRateLimiter);

// 6. Clerk Authentication Middleware
app.use(clerkMiddleware());

// Polyfill req.auth to be seamlessly callable as a function OR accessed as an object
app.use((req, res, next) => {
  if (req.auth && typeof req.auth !== "function") {
    const authObj = req.auth;
    const authFn = () => authObj;
    Object.assign(authFn, authObj);
    req.auth = authFn;
  }
  next();
});

app.get("/", (req, res) => res.send("server is alive"));
app.use("/api/inngest/", serve({ client: inngest, functions }));

app.use("/api/listings", listingRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/chats", chatRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/ai", aiRouter);

const server = http.createServer(app);
attachChatSocketServer(server);

// Start server in standalone and container environments (unless Vercel serverless)
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`🚀 Socialy API server listening on port ${port}`);
  });
}

export default app;
