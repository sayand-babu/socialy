import express from "express";
import {
  generateListingDescription,
  parseNaturalLanguageSearch,
} from "../Controllers/aiController.js";
import { protect } from "../Middlewares/authMiddleware.js";

const aiRouter = express.Router();

// Generate high-converting sales listing description using Gemini (authenticated)
aiRouter.post("/generate-description", protect, generateListingDescription);

// Parse natural language search queries into marketplace filters (publicly accessible)
aiRouter.post("/parse-search", parseNaturalLanguageSearch);

export default aiRouter;
