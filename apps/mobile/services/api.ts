import * as SecureStore from 'expo-secure-store';
import { silentlyRefreshToken, isTokenNearExpiry } from './tokenRefresh';
import { authEmitter } from './authEmitter';

const DEFAULT_URL = 'https://chapuu.com';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `${WEB_URL}/api`;

interface ApiOptions extends RequestInit {
  params?: Record<string, any>;
  requiresAuth?: boolean;
}

export const apiClient = {
  async get(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint: string, body: any, options: ApiOptions = {}) {
    const isFormData = body instanceof FormData;
    const headers = isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers };
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  },

  async put(endpoint: string, body: any, options: ApiOptions = {}) {
    const isFormData = body instanceof FormData;
    const headers = isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers };
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  },

  async delete(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  async patch(endpoint: string, body: any, options: ApiOptions = {}) {
    // Determine if body is FormData. If so, let fetch set the Content-Type automatically.
    const isFormData = body instanceof FormData;
    const headers = isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers };
    
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body),
      headers,
    });
  },

  async request(endpoint: string, options: ApiOptions) {
    let url = `${BASE_URL}${endpoint}`;
    
    if (options.params) {
      const query = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers = new Headers(options.headers || {});
    const requiresAuth = options.requiresAuth !== false;

    // If the body is FormData, delete Content-Type to let fetch generate the boundary
    if (options.body instanceof FormData) {
      headers.delete('Content-Type');
      headers.delete('content-type');
    }

    if (requiresAuth) {
      let token = await SecureStore.getItemAsync('chapuu_access_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && requiresAuth) {
        console.warn(`[apiClient] 401 for ${endpoint}, attempting refresh...`);
        const refreshToken = await SecureStore.getItemAsync('chapuu_refresh_token');
        const newToken = await silentlyRefreshToken(refreshToken);

        if (newToken) {
          await SecureStore.setItemAsync('chapuu_access_token', newToken);
          headers.set('Authorization', `Bearer ${newToken}`);
          // Retry request
          response = await fetch(url, { ...options, headers });
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          console.warn(`[apiClient] 401 Unauthorized for ${endpoint} after refresh attempt`);
          authEmitter.emitLogout();
        }
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }
        
        let errorMessage = '';
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else {
            errorMessage = Object.entries(errorData)
              .map(([key, val]) => {
                const msgs = Array.isArray(val) ? val.join(', ') : String(val);
                return `${key}: ${msgs}`;
              })
              .join('\n');
          }
        }
        throw new Error(errorMessage || `HTTP Error ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        // Mimic axios response shape
        return { data, status: response.status, headers: response.headers };
      }

      return { data: null, status: response.status, headers: response.headers };
    } catch (error) {
      console.error(`[apiClient] Error fetching ${endpoint}:`, error);
      throw error;
    }
  }
};

export const getWebSocketURL = async (endpoint: string) => {
  const cleanWebUrl = WEB_URL.replace(/\/+$/, '');
  const wsProto = cleanWebUrl.startsWith('https') ? 'wss' : 'ws';
  const host = cleanWebUrl.replace(/^https?:\/\//, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let wsUrl = `${wsProto}://${host}${cleanEndpoint}`;

  try {
    const token = await SecureStore.getItemAsync('chapuu_access_token');
    if (token) {
      wsUrl += (wsUrl.includes('?') ? '&' : '?') + `token=${token}`;
    }
  } catch (err) {
    console.warn('[apiClient] getWebSocketURL: SecureStore error', err);
  }
  return wsUrl;
};

export default apiClient;
