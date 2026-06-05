/**
 * Safely resolves the store ID from inconsistent backend payloads.
 * The backend sometimes serializes the store as an object { id: 1, name: '...' }
 * and sometimes as a primitive ID (1 or '1').
 */
export function normalizeStoreId(store: any): string {
  if (!store) return 'unknown';
  
  if (typeof store === 'object') {
    return store.id?.toString() || 'unknown';
  }
  
  return store.toString();
}

/**
 * Safely resolves the store Name from inconsistent backend payloads.
 */
export function normalizeStoreName(store: any): string {
  if (!store) return 'Unknown Store';
  
  if (typeof store === 'object') {
    return store.name || 'Unknown Store';
  }
  
  return 'Unknown Store';
}
