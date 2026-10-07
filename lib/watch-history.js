'use client';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'youplex_watch_history_v1';
const MAX_HISTORY_ITEMS = 60;
export const WATCH_HISTORY_EVENT = 'youplex_watch_history_change';

/**
 * Normalizes item ID and creates a stable unique key
 */
export function getHistoryKey(id, type = 'movie', season = null, episode = null) {
  const normType = type === 'tv' ? 'tv' : 'movie';
  if (normType === 'tv' && season != null && episode != null) {
    return `${normType}:${id}:s${season}:e${episode}`;
  }
  return `${normType}:${id}`;
}

/**
 * Retrieves full watch history list from localStorage
 */
export function getWatchHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load watch history:', err);
    return [];
  }
}

/**
 * Retrieves saved watch progress for a specific media item
 */
export function getWatchProgress(id, type = 'movie', season = null, episode = null) {
  if (!id) return null;
  const history = getWatchHistory();
  const targetKey = getHistoryKey(id, type, season, episode);

  // First try exact key match
  const match = history.find((item) => item.key === targetKey);
  if (match) return match;

  // Fallback: match by id & type
  if (type === 'tv' && season != null && episode != null) {
    return (
      history.find(
        (item) =>
          String(item.id) === String(id) &&
          item.type === 'tv' &&
          Number(item.season) === Number(season) &&
          Number(item.episode) === Number(episode)
      ) || null
    );
  }

  return (
    history.find(
      (item) => String(item.id) === String(id) && (item.type || 'movie') === (type || 'movie')
    ) || null
  );
}

/**
 * Saves or updates playback progress for a title
 */
export function saveWatchProgress({
  id,
  tmdbId,
  type = 'movie',
  title,
  poster,
  backdrop,
  season = null,
  episode = null,
  episodeName = null,
  currentTime = 0,
  duration = 0,
}) {
  if (typeof window === 'undefined' || !id) return null;

  const cur = Number(currentTime) || 0;
  const dur = Number(duration) || 0;

  // Avoid persisting momentary accidental starts under 5 seconds
  if (cur < 5 && dur > 30) return null;

  const key = getHistoryKey(id, type, season, episode);
  const progressRatio = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;
  const isCompleted = progressRatio >= 0.93;

  const entry = {
    key,
    id,
    tmdbId: tmdbId || id,
    type: type === 'tv' ? 'tv' : 'movie',
    title: title || 'Untitled',
    poster: poster || null,
    backdrop: backdrop || null,
    season: season != null ? Number(season) : null,
    episode: episode != null ? Number(episode) : null,
    episodeName: episodeName || null,
    currentTime: Math.round(cur),
    duration: Math.round(dur),
    progress: progressRatio,
    isCompleted,
    updatedAt: Date.now(),
  };

  try {
    const list = getWatchHistory();
    // Filter out existing entry for this exact key
    const filtered = list.filter((item) => item.key !== key);
    // Insert updated item at the beginning
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(WATCH_HISTORY_EVENT, { detail: entry }));
    return entry;
  } catch (err) {
    console.warn('Failed to save watch progress:', err);
    return null;
  }
}

/**
 * Removes a specific item from watch history
 */
export function removeWatchHistoryItem(id, type = 'movie', season = null, episode = null) {
  if (typeof window === 'undefined') return;
  const targetKey = getHistoryKey(id, type, season, episode);

  try {
    const list = getWatchHistory();
    const updated = list.filter(
      (item) =>
        item.key !== targetKey &&
        !(
          String(item.id) === String(id) &&
          item.type === type &&
          (season == null || Number(item.season) === Number(season)) &&
          (episode == null || Number(item.episode) === Number(episode))
        )
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(WATCH_HISTORY_EVENT, { detail: { removedKey: targetKey } }));
  } catch (err) {
    console.warn('Failed to remove watch history item:', err);
  }
}

/**
 * Clears entire watch history
 */
export function clearWatchHistory() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(WATCH_HISTORY_EVENT, { detail: { cleared: true } }));
  } catch (err) {
    console.warn('Failed to clear watch history:', err);
  }
}
