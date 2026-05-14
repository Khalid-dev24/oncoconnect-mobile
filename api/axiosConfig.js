import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://oncoconnect-backend.onrender.com';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - add auth token if available
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✓ Auth token added to request');
      } else {
        console.warn('⚠ No auth token found in AsyncStorage');
      }
    } catch (err) {
      console.warn('Failed to retrieve auth token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - better error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        message: error.response.data?.message || error.response.statusText,
      });
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error - No Response:', {
        message: error.message,
        code: error.code,
      });
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
export { API_BASE_URL };
