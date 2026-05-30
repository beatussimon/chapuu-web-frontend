const DEFAULT_URL = 'https://chapuu.com';
const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_URL;

// Lightweight JWT payload decoder
function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    // Convert Base64Url to Base64
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad string with '='
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[TokenService] Failed to decode JWT:', e);
    return null;
  }
}

/**
 * Checks if the token is within a specified buffer time (in seconds) of expiring.
 * Default buffer is 5 minutes (300 seconds).
 */
export function isTokenNearExpiry(token: string | null, bufferSeconds = 300): boolean {
  if (!token) return true;
  
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;

  const currentUnixTime = Math.floor(Date.now() / 1000);
  return (payload.exp - currentUnixTime) < bufferSeconds;
}

/**
 * Attempts to silently refresh the access token using the refresh token.
 * Returns the new access token if successful, or null if it fails.
 */
export async function silentlyRefreshToken(refreshToken: string | null): Promise<string | null> {
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.access) {
        console.log('[TokenService] Token successfully refreshed in background.');
        return data.access;
      }
    }
    
    console.warn('[TokenService] Refresh API returned non-OK or missing access token');
    return null;
  } catch (e) {
    console.error('[TokenService] Network error while refreshing token:', e);
    return null;
  }
}
