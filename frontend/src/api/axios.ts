import axios from 'axios';
import { startLoading, endLoading } from '@/utils/loadingCounter';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  startLoading();
  const token = sessionStorage.getItem('access_token');
  if (token && !config.url?.includes('/auth/login')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => { endLoading(); return response; },
  (error) => {
    endLoading();
    if (error.response?.status === 401) {
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
