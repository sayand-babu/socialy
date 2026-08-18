import axios from 'axios';

// Determine API base URL based on environment
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials only needed if using cookies for auth
  // Clerk uses headers instead, so we can disable this
});

// Optional: Add request interceptor to attach auth token if needed
api.interceptors.request.use(
  (config) => {
    // Clerk tokens are handled automatically by @clerk/clerk-react
    // No need to manually attach tokens here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login if needed
      console.log('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

export default api;
