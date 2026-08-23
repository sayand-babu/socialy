import express from "express";
import { chatWithAi, parseSearch, generateDescription } from "../Controllers/aiController.js";
import { aiRateLimiter } from "../Middlewares/securityMiddleware.js";

const aiRouter = express.Router();

// Public endpoint for floating AI Assistant queries (rate limited)
aiRouter.post("/chat", aiRateLimiter, chatWithAi);

// Endpoint for natural language search filter parsing
aiRouter.post("/parse-search", parseSearch);

// Endpoint for generating listing descriptions (rate limited)
aiRouter.post("/generate-description", aiRateLimiter, generateDescription);

export default aiRouter;
