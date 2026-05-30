import * as SecureStore from 'expo-secure-store';
import { silentlyRefreshToken, isTokenNearExpiry } from './tokenRefresh';

const DEFAULT_URL = 'https://chapuu.com';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

interface ApiOptions extends RequestInit {
  params?: Record<string, any>;
  requiresAuth?: boolean;
}

export const apiClient = {
  async get(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint: string, body: any, options: ApiOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },

  async put(endpoint: string, body: any, options: ApiOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },

  async delete(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
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

    if (requiresAuth) {
      let token = await SecureStore.getItemAsync('chapuu_access_token');
      
      if (isTokenNearExpiry(token)) {
        console.log('[apiClient] Token near expiry, refreshing...');
        const refreshToken = await SecureStore.getItemAsync('chapuu_refresh_token');
        const newToken = await silentlyRefreshToken(refreshToken);
        
        if (newToken) {
          await SecureStore.setItemAsync('chapuu_access_token', newToken);
          token = newToken;
          
          // Also broadcast the new token to WebViews if needed, though native screens won't need it.
          // This ensures if we switch back to a WebView tab, the new token is available.
        } else {
          // If refresh fails, we might want to log out the user. 
          // For now, we'll let the request fail with 401.
          console.warn('[apiClient] Token refresh failed');
        }
      }

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // If it's a 401, we could potentially trigger a global logout event here.
        if (response.status === 401) {
          console.warn(`[apiClient] 401 Unauthorized for ${endpoint}`);
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }
        throw new Error(errorData.detail || `HTTP Error ${response.status}`);
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

export default apiClient;
