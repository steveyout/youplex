'use client';

import {
  getBookmarks as getLocalBookmarks,
  addBookmark as addLocalBookmark,
  BOOKMARKS_EVENT,
} from '@/lib/bookmarks';
import {
  getWatchHistory as getLocalHistory,
  saveWatchProgress as saveLocalHistory,
  WATCH_HISTORY_EVENT,
} from '@/lib/watch-history';
import {
  getBookmarks as getRemoteBookmarks,
  addBookmark as addRemoteBookmark,
  removeBookmark as removeRemoteBookmark,
  importBookmarks as importRemoteBookmarks,
  getProgress as getRemoteProgress,
  setProgress as setRemoteProgress,
  removeProgress as removeRemoteProgress,
  importProgress as importRemoteProgress,
  getWatchHistory as getRemoteHistory,
  setWatchHistory as setRemoteHistory,
  removeWatchHistory as removeRemoteHistory,
  importWatchHistory as importRemoteHistory,
} from './api';
import { getBackendUrl } from './config';

// ----------------------------------------------------------------------

let isApplyingRemoteUpdate = false;
let syncTimeout = null;

/**
 * Maps a local bookmark item to backend format
 */
export function localBookmarkToRemote(item) {
  return {
    tmdbId: String(item.tmdbId || item.id),
    meta: {
      title: item.title || item.name || '',
      year: Number(parseInt(item.release_date || item.first_air_date || 0, 10)) || 0,
      poster: item.poster || item.poster_path || '',
      type: item.type === 'tv' ? 'show' : 'movie',
    },
  };
}

/**
 * Maps a remote bookmark item to local format
 */
export function remoteBookmarkToLocal(b) {
  const normType = b.meta?.type === 'show' ? 'tv' : 'movie';
  return {
    id: b.tmdbId,
    tmdbId: b.tmdbId,
    type: normType,
    title: b.meta?.title || 'Untitled',
    name: b.meta?.title || 'Untitled',
    poster: b.meta?.poster || null,
    poster_path: b.meta?.poster || null,
    release_date: b.meta?.year ? String(b.meta.year) : null,
    vote_average: 0,
    createdAt: b.updatedAt ? new Date(b.updatedAt).getTime() : Date.now(),
  };
}

/**
 * Maps local progress/history item to remote format
 */
export function localHistoryToRemote(item) {
  const normType = item.type === 'tv' ? 'show' : 'movie';
  const tmdbId = String(item.tmdbId || item.id);
  const watched = Math.round(Number(item.currentTime) || 0);
  const duration = Math.round(Number(item.duration) || 0);
  const updatedAt = new Date(item.updatedAt || Date.now()).toISOString();

  return {
    tmdbId,
    duration,
    watched,
    watchedAt: updatedAt,
    updatedAt,
    completed: Boolean(item.isCompleted),
    seasonNumber: item.season != null ? Number(item.season) : undefined,
    episodeNumber: item.episode != null ? Number(item.episode) : undefined,
    seasonId: item.season != null ? String(item.season) : undefined,
    episodeId: item.episode != null ? String(item.episode) : undefined,
    meta: {
      title: item.title || '',
      type: normType,
      year: 0,
      poster: item.poster || '',
    },
  };
}

/**
 * Maps remote progress or watch history item to local format
 */
export function remoteHistoryToLocal(item) {
  const normType = item.meta?.type === 'show' ? 'tv' : 'movie';
  const cur = Number(item.watched) || 0;
  const dur = Number(item.duration) || 0;
  const season = item.season?.number != null ? item.season.number : item.seasonNumber;
  const episode = item.episode?.number != null ? item.episode.number : item.episodeNumber;

  return {
    id: item.tmdbId,
    tmdbId: item.tmdbId,
    type: normType,
    title: item.meta?.title || 'Untitled',
    poster: item.meta?.poster || null,
    season: season != null ? Number(season) : null,
    episode: episode != null ? Number(episode) : null,
    currentTime: cur,
    duration: dur,
    isCompleted: item.completed || (dur > 0 && cur / dur >= 0.93),
  };
}

/**
 * Performs full bi-directional synchronization
 */
export async function syncAllData(account, backendUrl) {
  if (!account || !account.token) return;
  const url = backendUrl || getBackendUrl();

  try {
    // 1. Fetch remote data in parallel
    const [remoteBookmarks, remoteProgress, remoteHistory] = await Promise.all([
      getRemoteBookmarks(url, account).catch(() => []),
      getRemoteProgress(url, account).catch(() => []),
      getRemoteHistory(url, account).catch(() => []),
    ]);

    isApplyingRemoteUpdate = true;

    // 2. Merge remote bookmarks into local storage
    if (Array.isArray(remoteBookmarks)) {
      remoteBookmarks.forEach((b) => {
        const local = remoteBookmarkToLocal(b);
        addLocalBookmark(local);
      });
    }

    // 3. Merge remote history/progress into local storage
    const allRemoteHistory = [...(Array.isArray(remoteProgress) ? remoteProgress : []), ...(Array.isArray(remoteHistory) ? remoteHistory : [])];
    allRemoteHistory.forEach((h) => {
      const local = remoteHistoryToLocal(h);
      saveLocalHistory(local);
    });

    isApplyingRemoteUpdate = false;

    // 4. Upload local bookmarks not yet on server
    const currentLocalBookmarks = getLocalBookmarks();
    const remoteTmdbIds = new Set((remoteBookmarks || []).map((b) => String(b.tmdbId)));
    const missingOnServer = currentLocalBookmarks.filter((b) => !remoteTmdbIds.has(String(b.tmdbId || b.id)));

    if (missingOnServer.length > 0) {
      const inputs = missingOnServer.map(localBookmarkToRemote);
      await importRemoteBookmarks(url, account, inputs).catch((err) =>
        console.warn('Failed to bulk upload missing bookmarks:', err)
      );
    }

    // 5. Upload local history items not yet on server
    const currentLocalHistory = getLocalHistory();
    if (currentLocalHistory.length > 0 && (remoteHistory || []).length === 0 && (remoteProgress || []).length === 0) {
      const historyInputs = currentLocalHistory.map(localHistoryToRemote);
      await Promise.all([
        importRemoteProgress(url, account, historyInputs).catch(() => {}),
        importRemoteHistory(url, account, historyInputs).catch(() => {}),
      ]);
    }
  } catch (err) {
    console.error('Failed to perform full sync:', err);
    throw err;
  } finally {
    isApplyingRemoteUpdate = false;
  }
}

/**
 * Sets up live real-time listeners for changes made while logged in
 */
export function setupRealtimeSync(getAccount, getBackendUrlFn) {
  if (typeof window === 'undefined') return () => {};

  const handleBookmarkChange = async (e) => {
    if (isApplyingRemoteUpdate) return;
    const account = getAccount();
    if (!account || !account.token) return;
    const url = getBackendUrlFn ? getBackendUrlFn() : getBackendUrl();
    const { action, entry, id, type } = e.detail || {};

    try {
      if (action === 'add' && entry) {
        await addRemoteBookmark(url, account, localBookmarkToRemote(entry));
      } else if (action === 'remove' && id) {
        await removeRemoteBookmark(url, account, String(id));
      }
    } catch (err) {
      console.warn('Realtime bookmark sync error:', err);
    }
  };

  const handleHistoryChange = async (e) => {
    if (isApplyingRemoteUpdate) return;
    const account = getAccount();
    if (!account || !account.token) return;
    const url = getBackendUrlFn ? getBackendUrlFn() : getBackendUrl();
    const entry = e.detail;

    if (!entry) return;

    // Debounce progress saves to avoid spamming the backend every 250ms
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
      try {
        if (entry.removedKey) {
          const parts = entry.removedKey.split(':');
          const tmdbId = parts[1];
          await Promise.all([
            removeRemoteProgress(url, account, tmdbId).catch(() => {}),
            removeRemoteHistory(url, account, tmdbId).catch(() => {}),
          ]);
        } else if (entry.id) {
          const remoteInput = localHistoryToRemote(entry);
          await Promise.all([
            setRemoteProgress(url, account, remoteInput).catch(() => {}),
            setRemoteHistory(url, account, remoteInput).catch(() => {}),
          ]);
        }
      } catch (err) {
        console.warn('Realtime history sync error:', err);
      }
    }, 1500);
  };

  window.addEventListener(BOOKMARKS_EVENT, handleBookmarkChange);
  window.addEventListener(WATCH_HISTORY_EVENT, handleHistoryChange);

  return () => {
    window.removeEventListener(BOOKMARKS_EVENT, handleBookmarkChange);
    window.removeEventListener(WATCH_HISTORY_EVENT, handleHistoryChange);
    if (syncTimeout) clearTimeout(syncTimeout);
  };
}
