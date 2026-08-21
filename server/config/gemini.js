import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ [Gemini] GEMINI_API_KEY not set. AI features will be disabled.");
}

/**
 * Shared Google Gemini AI client instance.
 */
export const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

/** Ultra-fast, responsive sub-second models (benchmarked <1.5s) */
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
];

export const GEMINI_MODEL = CANDIDATE_MODELS[0];

/**
 * Helper to wrap a promise with a timeout
 */
const withTimeout = (promise, ms = 4500) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

/**
 * Generate text content from Gemini with fast sub-second models and timeout guards.
 * @param {string} prompt - The prompt to send
 * @param {object} [options] - Optional config overrides
 * @returns {Promise<string|null>} Generated text or null on failure
 */
export const generateText = async (prompt, options = {}) => {
  if (!genAI) {
    return null;
  }

  const modelsToTry = options.model ? [options.model, ...CANDIDATE_MODELS] : CANDIDATE_MODELS;

  for (const modelName of modelsToTry) {
    try {
      const response = await withTimeout(
        genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 800,
          },
        }),
        options.timeoutMs || 4500
      );

      if (response?.text) {
        return response.text.trim();
      }
    } catch {
      // Fast failover to next candidate model
    }
  }

  return null;
};

export default genAI;
