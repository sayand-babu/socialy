import api from './api';

/**
 * Fetch all public active listings from the server
 * @returns {Promise<Array>} Array of listing objects
 */
export const getPublicListings = async () => {
  try {
    const response = await api.get('/listings/public');
    return response.data.listings || [];
  } catch (error) {
    console.error('Error fetching public listings:', error);
    throw error;
  }
};

/**
 * Fetch all listings for the authenticated user
 * @returns {Promise<Object>} Object containing listings and balance info
 */
export const getUserListings = async (token) => {
  try {
    const response = await api.get('/listings/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user listings:', error);
    throw error;
  }
};

/**
 * Create a new listing
 * @param {FormData} formData - Form data containing listing details and images
 * @returns {Promise<Object>} Created listing object
 */
export const createListing = async (formData, token) => {
  try {
    const response = await api.post('/listings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
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
 * @returns {Promise<Object>} Updated listing object
 */
export const updateListing = async (formData, token) => {
  try {
    const response = await api.put('/listings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
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
 * @returns {Promise<Object>} Updated listing
 */
export const toggleListingStatus = async (listingId) => {
  try {
    const response = await api.put(`/listings/${listingId}/status`);
    return response.data;
  } catch (error) {
    console.error('Error toggling listing status:', error);
    throw error;
  }
};

/**
 * Delete a listing
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Response object
 */
export const deleteListing = async (listingId) => {
  try {
    const response = await api.delete(`/listings/${listingId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
};

/**
 * Mark listing as featured
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Updated listing
 */
export const markAsFeatured = async (listingId) => {
  try {
    const response = await api.put(`/listings/featured/${listingId}`);
    return response.data;
  } catch (error) {
    console.error('Error marking as featured:', error);
    throw error;
  }
};

/**
 * Get user's orders
 * @returns {Promise<Array>} Array of order objects
 */
export const getUserOrders = async () => {
  try {
    const response = await api.get('/listings/user-orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
};

/**
 * Submit withdrawal request
 * @param {Object} withdrawalData - Withdrawal details
 * @returns {Promise<Object>} Response object
 */
export const submitWithdrawal = async (withdrawalData) => {
  try {
    const response = await api.post('/listings/withdraw', withdrawalData);
    return response.data;
  } catch (error) {
    console.error('Error submitting withdrawal:', error);
    throw error;
  }
};
