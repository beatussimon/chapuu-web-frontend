import { BACKEND_URL } from '../api/client';

/**
 * Robustly resolves an image URL from the backend.
 * Handles:
 * 1. Relative paths (e.g., /media/...)
 * 2. Absolute URIs with incorrect origins (e.g., internal Docker IPs, localhost)
 * 3. Protocol mismatches (http vs https)
 * 4. Local blob URLs (for previews)
 */
export const resolveMediaUrl = (url, version = null) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    
    let path = url;
    let isAbsolute = url.startsWith('http');

    try {
        if (isAbsolute) {
            const urlObj = new URL(url);
            path = urlObj.pathname + urlObj.search;
            
            // SECURITY/PROTOCOL FIX:
            // If the current site is HTTPS, force the media URL to be HTTPS
            if (window.location.protocol === 'https:' && urlObj.protocol === 'http:') {
                // We'll rebuild it using BACKEND_URL below to ensure correct origin
            } else if (urlObj.host !== new URL(BACKEND_URL).host) {
                // Host mismatch (e.g. internal Docker IP), rebuild it
            } else {
                // URL is already absolute, correct host, and correct protocol
                // Just add version if needed
                if (!version) return url;
                const sep = url.includes('?') ? '&' : '?';
                return `${url}${sep}v=${version}`;
            }
        }
    } catch (e) {
        // Fallback for invalid absolute URLs
        if (isAbsolute) return url;
    }

    // Only prefix if it looks like a media or static path
    if (path.startsWith('/media/') || path.startsWith('/static/')) {
        // Ensure BACKEND_URL doesn't have a trailing slash to avoid //media/
        const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
        let resolved = `${base}${path}`;
        
        // Final Protocol Check: Ensure we use HTTPS if the site is HTTPS
        if (window.location.protocol === 'https:' && resolved.startsWith('http:')) {
            resolved = resolved.replace('http:', 'https:');
        }

        if (version) {
            const separator = resolved.includes('?') ? '&' : '?';
            resolved = `${resolved}${separator}v=${version}`;
        }
        
        return resolved;
    }

    return url;
};
