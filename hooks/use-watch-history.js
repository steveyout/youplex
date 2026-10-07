'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getWatchHistory,
  getWatchProgress,
  saveWatchProgress,
  removeWatchHistoryItem,
  clearWatchHistory,
  WATCH_HISTORY_EVENT,
} from '@/lib/watch-history';

// ----------------------------------------------------------------------

export function useWatchHistory() {
  const [history, setHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshHistory = useCallback(() => {
    setHistory(getWatchHistory());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refreshHistory();

    const handleCustomChange = () => {
      refreshHistory();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'youplex_watch_history_v1') {
        refreshHistory();
      }
    };

    window.addEventListener(WATCH_HISTORY_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(WATCH_HISTORY_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshHistory]);

  const saveProgress = useCallback((params) => saveWatchProgress(params), []);
  const getProgress = useCallback((id, type, sn, ep) => getWatchProgress(id, type, sn, ep), []);
  const removeItem = useCallback((id, type, sn, ep) => removeWatchHistoryItem(id, type, sn, ep), []);
  const clearAll = useCallback(() => clearWatchHistory(), []);

  return {
    history,
    isLoaded,
    saveProgress,
    getProgress,
    removeItem,
    clearAll,
  };
}
