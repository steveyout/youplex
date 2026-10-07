'use client';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'youplex_bookmarks_v1';
export const BOOKMARKS_EVENT = 'youplex_bookmarks_change';

/**
 * Normalizes item ID and creates a stable unique key
 */
export function getBookmarkKey(id, type = 'movie') {
  return `${type === 'tv' ? 'tv' : 'movie'}:${id}`;
}

/**
 * Retrieves all bookmarked items
 */
export function getBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load bookmarks:', err);
    return [];
  }
}

/**
 * Checks if a specific title is currently bookmarked
 */
export function isBookmarked(id, type = 'movie') {
  if (!id || typeof window === 'undefined') return false;
  const bookmarks = getBookmarks();
  const key = getBookmarkKey(id, type);
  return bookmarks.some(
    (b) => b.key === key || (String(b.id) === String(id) && (b.type || 'movie') === (type || 'movie'))
  );
}

/**
 * Adds an item to bookmarks
 */
export function addBookmark(item) {
  if (typeof window === 'undefined' || !item?.id) return false;

  const key = getBookmarkKey(item.id, item.type);
  const entry = {
    key,
    id: item.id,
    tmdbId: item.tmdbId || item.id,
    type: item.type === 'tv' ? 'tv' : 'movie',
    title: item.title || item.name || 'Untitled',
    name: item.name || item.title || 'Untitled',
    poster_path: item.poster_path || item.poster || null,
    poster: item.poster || item.poster_path || null,
    backdrop_path: item.backdrop_path || item.backdrop || null,
    backdrop: item.backdrop || item.backdrop_path || null,
    vote_average: item.vote_average != null ? Number(item.vote_average) : 0,
    release_date: item.release_date || null,
    first_air_date: item.first_air_date || null,
    overview: item.overview || '',
    media_type: item.type === 'tv' ? 'tv' : 'movie',
    createdAt: Date.now(),
  };

  try {
    const bookmarks = getBookmarks();
    if (bookmarks.some((b) => b.key === key)) return true;

    const updated = [entry, ...bookmarks];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT, { detail: { action: 'add', entry } }));
    return true;
  } catch (err) {
    console.warn('Failed to save bookmark:', err);
    return false;
  }
}

/**
 * Removes an item from bookmarks
 */
export function removeBookmark(id, type = 'movie') {
  if (typeof window === 'undefined' || !id) return false;
  const key = getBookmarkKey(id, type);

  try {
    const bookmarks = getBookmarks();
    const updated = bookmarks.filter(
      (b) => b.key !== key && !(String(b.id) === String(id) && (b.type || 'movie') === (type || 'movie'))
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT, { detail: { action: 'remove', id, type } }));
    return true;
  } catch (err) {
    console.warn('Failed to remove bookmark:', err);
    return false;
  }
}

/**
 * Toggles an item's bookmarked status
 */
export function toggleBookmark(item) {
  if (!item?.id) return false;
  const bookmarked = isBookmarked(item.id, item.type);
  if (bookmarked) {
    removeBookmark(item.id, item.type);
    return false;
  }
  addBookmark(item);
  return true;
}

/**
 * Clears all bookmarks
 */
export function clearBookmarks() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT, { detail: { action: 'clear' } }));
  } catch (err) {
    console.warn('Failed to clear bookmarks:', err);
  }
}
