'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getBookmarks,
  isBookmarked as checkIsBookmarked,
  addBookmark as addBookmarkUtil,
  removeBookmark as removeBookmarkUtil,
  toggleBookmark as toggleBookmarkUtil,
  clearBookmarks as clearBookmarksUtil,
  BOOKMARKS_EVENT,
} from '@/lib/bookmarks';

// ----------------------------------------------------------------------

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshBookmarks = useCallback(() => {
    setBookmarks(getBookmarks());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refreshBookmarks();

    const handleCustomChange = () => {
      refreshBookmarks();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'youplex_bookmarks_v1') {
        refreshBookmarks();
      }
    };

    window.addEventListener(BOOKMARKS_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(BOOKMARKS_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshBookmarks]);

  const isBookmarked = useCallback((id, type) => checkIsBookmarked(id, type), []);
  const addBookmark = useCallback((item) => addBookmarkUtil(item), []);
  const removeBookmark = useCallback((id, type) => removeBookmarkUtil(id, type), []);
  const toggleBookmark = useCallback((item) => toggleBookmarkUtil(item), []);
  const clearBookmarks = useCallback(() => clearBookmarksUtil(), []);

  return {
    bookmarks,
    isLoaded,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearBookmarks,
  };
}
