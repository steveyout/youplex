'use client';

// ----------------------------------------------------------------------

export const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend.pstream.site';

export const BACKEND_URL_STORAGE_KEY = 'youplex_sync_backend_url_v1';
export const AUTH_STORAGE_KEY = 'youplex_sync_account_v1';

/**
 * Returns current effective backend URL
 */
export function getBackendUrl() {
  if (typeof window === 'undefined') return DEFAULT_BACKEND_URL;
  try {
    const custom = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch (err) {
    console.warn('Failed to read backend URL from storage:', err);
  }
  return DEFAULT_BACKEND_URL.replace(/\/+$/, '');
}

/**
 * Saves custom backend URL or resets to default if null
 */
export function setCustomBackendUrl(url) {
  if (typeof window === 'undefined') return;
  try {
    if (!url || url.trim() === '' || url.trim() === DEFAULT_BACKEND_URL) {
      window.localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    } else {
      window.localStorage.setItem(BACKEND_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch (err) {
    console.warn('Failed to save backend URL to storage:', err);
  }
}
