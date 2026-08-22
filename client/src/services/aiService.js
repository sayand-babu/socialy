import api from './api';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/**
 * Send inquiry message to Socialy AI Copilot
 * @param {string} message - User query
 * @param {Array} history - Session history array: [{ role: 'user'|'model', text: string }]
 */
export const askAiCopilot = async (message, history = []) => {
  const res = await api.post('/ai/chat', { message, history });
  return res.data;
};

/**
 * Parse natural language search query into structured listing filters
 * @param {string} query - Natural language search phrase
 */
export const parseNaturalLanguageSearch = async (query) => {
  try {
    const res = await api.post('/ai/parse-search', { query });
    return res.data;
  } catch (error) {
    console.error('Natural language parse error:', error);
    return { parsed: null };
  }
};

/**
 * Generate high-converting AI description for a social media account listing
 * @param {object} payload - Account metrics and details
 * @param {string} token - User auth token
 */
export const generateAIDescription = async (payload, token) => {
  const res = await api.post('/ai/generate-description', payload, authHeaders(token));
  return res.data;
};
