import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bitcoder_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bitcoder_token');
      localStorage.removeItem('bitcoder_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
