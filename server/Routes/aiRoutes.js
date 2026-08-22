import express from "express";
import { chatWithAi, parseSearch, generateDescription } from "../Controllers/aiController.js";

const aiRouter = express.Router();

// Public endpoint for floating AI Assistant queries
aiRouter.post("/chat", chatWithAi);

// Endpoint for natural language search filter parsing
aiRouter.post("/parse-search", parseSearch);

// Endpoint for generating listing descriptions
aiRouter.post("/generate-description", generateDescription);

export default aiRouter;
