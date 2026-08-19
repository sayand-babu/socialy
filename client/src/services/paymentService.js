import api from "./api";

const authHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

/**
 * Creates a Razorpay Order on the backend
 * @param {string} listingId - The listing ID to purchase
 * @param {string} token - Clerk auth JWT
 * @returns {Promise<Object>} Order metadata (orderId, amount, currency, keyId)
 */
export const createPaymentOrder = async (listingId, token) => {
  try {
    const response = await api.post(
      "/payments/create-order",
      { listingId },
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error("Error creating payment order:", error);
    throw error;
  }
};

/**
 * Verifies Razorpay HMAC signature on backend and fulfills escrow transfer
 * @param {Object} paymentData - { razorpay_order_id, razorpay_payment_id, razorpay_signature, listingId }
 * @param {string} token - Clerk auth JWT
 * @returns {Promise<Object>} Verification response and transaction details
 */
export const verifyPayment = async (paymentData, token) => {
  try {
    const response = await api.post(
      "/payments/verify-payment",
      paymentData,
      authHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw error;
  }
};
