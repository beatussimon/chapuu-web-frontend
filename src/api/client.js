import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export const getWebSocketURL = (path) => {
    const url = new URL(BACKEND_URL);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${protocol}//${url.host}${cleanPath}`;
};

const apiClient = axios.create({
    baseURL: `${BACKEND_URL}/api`, 
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to inject token
apiClient.interceptors.request.use((config) => {
    // Standardize URL
    if (config.url && !config.url.startsWith('/') && !config.url.startsWith('http')) {
        config.url = '/' + config.url;
    }

    // STRICT: NEVER attach tokens to login or register requests
    if (config.url.includes('/token/') || config.url.includes('/register/')) {
        return config;
    }

    const token = localStorage.getItem('access_token');
    
    // ONLY attach if it looks like a valid JWT (contains 2 dots)
    // This prevents "Bearer null", "Bearer undefined", etc.
    if (token && token.split('.').length === 3) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Helper to check if it's a public endpoint we can retry without auth
const isPublicEndpoint = (url) => {
    if (!url) return false;
    return url.includes('/stores/') || 
           url.includes('/stats/billboard/') || 
           url.includes('/currencies/') || 
           url.includes('/products/') ||
           url.includes('/auth/users/me/'); 
};

let isHandling401 = false;

// Interceptor to handle global errors (e.g. 401 Unauthorized)
apiClient.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401) {
        // Clear stale tokens immediately on any 401
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        // 1. If it's a public endpoint, retry ONCE without auth
        if (isPublicEndpoint(originalRequest.url) && !originalRequest._retry) {
            originalRequest._retry = true;
            if (originalRequest.headers) {
                delete originalRequest.headers.Authorization;
            }
            return apiClient(originalRequest);
        }

        // 2. If we aren't already on the login page, do a full logout redirect
        const isAlreadyOnLoginPage = window.location.pathname.includes('/login');
        if (!isHandling401 && !isAlreadyOnLoginPage) {
            isHandling401 = true;
            
            import('react-hot-toast').then(({ default: toast }) => {
                toast.error('Session expired. Please log in again.');
            });

            setTimeout(() => { 
                isHandling401 = false; 
                window.location.href = '/login';
            }, 2000);
        }
    }
    return Promise.reject(error);
});

export default apiClient;
