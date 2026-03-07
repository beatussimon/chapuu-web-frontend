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

// Interceptor to handle global errors (e.g. 401 Unauthorized)
apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        import('react-hot-toast').then(({ default: toast }) => {
            toast.error('Session expired or unauthorized. Please log in again.');
        });
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Optional: window.location.href = '/login'; depending on router setup
    }
    return Promise.reject(error);
});

export default apiClient;
