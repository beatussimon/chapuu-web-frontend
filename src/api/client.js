import axios from 'axios';

export const BACKEND_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
    baseURL: `${BACKEND_URL}/api/`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to inject token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default apiClient;
