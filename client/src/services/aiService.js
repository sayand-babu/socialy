import api from './api';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/**
 * Request AI-generated high converting sales description for a listing
 * @param {object} payload - Listing metrics (platform, niche, followers, etc.) + custom prompt
 * @param {string} token - Clerk auth JWT token
 * @returns {Promise<{ success: boolean, description: string }>} Generated description
 */
export const generateAIDescription = async (payload, token) => {
  try {
    const response = await api.post('/ai/generate-description', payload, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error generating AI description:', error);
    throw error;
  }
};

/**
 * Parse conversational natural language query into structured marketplace filters
 * @param {string} query - Conversational search string (e.g. "monetized tech youtube under 50k")
 * @returns {Promise<{ success: boolean, parsed: object }>} Parsed filter object
 */
export const parseNaturalLanguageSearch = async (query) => {
  try {
    const response = await api.post('/ai/parse-search', { query });
    return response.data;
  } catch (error) {
    console.error('Error parsing natural language search:', error);
    throw error;
  }
};

export default {
  generateAIDescription,
  parseNaturalLanguageSearch,
};
