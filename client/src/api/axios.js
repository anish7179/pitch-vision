import axios from 'axios';

const apiClient = axios.create({
  // The /api prefix will be proxied by Vite to our backend (http://localhost:5000)
  baseURL: '/api',
  // Ensure cookies (e.g., httpOnly refresh token, Google auth session) are sent with every request
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach access token if available in memory (optional depending on JWT strategy)
// In Phase 1 we use cookies for refresh token, but the access token might be returned
// and stored in memory. For now, since the dashboard uses public/live routes, 
// if it requires auth, the cookie will be sent.
apiClient.interceptors.request.use(
  (config) => {
    // You can attach a Bearer token here if storing it in memory/context
    // const token = localStorage.getItem('accessToken');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
