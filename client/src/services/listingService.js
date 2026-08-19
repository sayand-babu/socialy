import api from './api';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/**
 * Fetch all public active listings from the server with optional search, filters, sorting and pagination
 * @param {Object} [params] - Query parameters (search, platform, niche, minFollowers, maxPrice, sortBy, page, limit)
 * @returns {Promise<{listings: Array, pagination: Object}>} Payload containing listings and pagination metadata
 */
export const getPublicListings = async (params = {}) => {
  try {
    const response = await api.get('/listings/public', { params });
    return {
      listings: response.data.listings || [],
      pagination: response.data.pagination || {
        total: (response.data.listings || []).length,
        page: 1,
        limit: 12,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error) {
    console.error('Error fetching public listings:', error);
    throw error;
  }
};

/**
 * Fetch a single listing by its ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Listing object
 */
export const getListingById = async (listingId) => {
  try {
    const response = await api.get(`/listings/${listingId}`);
    return response.data.listing;
  } catch (error) {
    console.error('Error fetching listing by ID:', error);
    throw error;
  }
};

/**
 * Fetch all listings for the authenticated user
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Object containing listings and balance info
 */
export const getUserListings = async (token) => {
  try {
    const response = await api.get('/listings/user', authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching user listings:', error);
    throw error;
  }
};

/**
 * Create a new listing
 * @param {FormData} formData - Form data containing listing details and images
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Created listing object
 */
export const createListing = async (formData, token) => {
  try {
    const response = await api.post('/listings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
};

/**
 * Update an existing listing
 * @param {FormData} formData - Form data containing updated listing details
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Updated listing object
 */
export const updateListing = async (formData, token) => {
  try {
    const response = await api.put('/listings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
};

/**
 * Toggle listing status (active/inactive)
 * @param {string} listingId - Listing ID
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Updated listing
 */
export const toggleListingStatus = async (listingId, token) => {
  try {
    const response = await api.put(`/listings/${listingId}/status`, {}, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error toggling listing status:', error);
    throw error;
  }
};

/**
 * Delete a listing
 * @param {string} listingId - Listing ID
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Response object
 */
export const deleteListing = async (listingId, token) => {
  try {
    const response = await api.delete(`/listings/${listingId}`, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
};

/**
 * Mark listing as featured
 * @param {string} listingId - Listing ID
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Updated listing
 */
export const markAsFeatured = async (listingId, token) => {
  try {
    const response = await api.put(`/listings/featured/${listingId}`, {}, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error marking as featured:', error);
    throw error;
  }
};

/**
 * Submit credential details for a listing
 * @param {string} listingId - Listing ID
 * @param {Array} credential - Credentials array
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Response object
 */
export const addCredential = async (listingId, credential, token) => {
  try {
    const response = await api.post(
      '/listings/add-credential',
      { listingId, credential },
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting credentials:', error);
    throw error;
  }
};

/**
 * Get user's orders
 * @param {string} token - Clerk auth token
 * @returns {Promise<Array>} Array of order objects
 */
export const getUserOrders = async (token) => {
  try {
    const response = await api.get('/listings/user-orders', authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
};

/**
 * Submit withdrawal request
 * @param {Object} withdrawalData - Withdrawal details
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Response object
 */
export const submitWithdrawal = async (withdrawalData, token) => {
  try {
    const response = await api.post('/listings/withdraw', withdrawalData, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error submitting withdrawal:', error);
    throw error;
  }
};

/**
 * Purchase an account through escrow
 * @param {string} listingId - Listing ID
 * @param {string} token - Clerk auth token
 * @returns {Promise<Object>} Response object
 */
export const purchaseListing = async (listingId, token) => {
  try {
    const response = await api.post(`/listings/${listingId}/purchase`, {}, authHeaders(token));
    return response.data;
  } catch (error) {
    console.error('Error purchasing listing:', error);
    throw error;
  }
};
