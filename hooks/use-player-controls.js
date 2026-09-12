'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

const AUTO_HIDE_MS = 3200;

/**
 * Custom hook to handle auto-hiding the player controls overlay
 * during active playback, while keeping them visible when paused,
 * when a menu is open, or during mouse/touch interaction.
 */
export function usePlayerControls(paused, isMenuOpen = false) {
  const [visible, setVisible] = useState(true);

  const hideTimer = useRef(null);
  const pausedRef = useRef(paused);
  const menuOpenRef = useRef(isMenuOpen);
  const isTouchRef = useRef(false);

  pausedRef.current = paused;
  menuOpenRef.current = isMenuOpen;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      isTouchRef.current =
        window.matchMedia('(pointer: coarse), (max-width: 600px)').matches;
    }
  }, []);

  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);

    if (!pausedRef.current && !menuOpenRef.current) {
      hideTimer.current = setTimeout(() => {
        if (!pausedRef.current && !menuOpenRef.current) {
          setVisible(false);
        }
      }, AUTO_HIDE_MS);
    }
  }, []);

  useEffect(() => {
    show();
    return () => clearTimeout(hideTimer.current);
  }, [show]);

  useEffect(() => {
    if (paused || isMenuOpen) {
      setVisible(true);
      clearTimeout(hideTimer.current);
    } else {
      show();
    }
  }, [paused, isMenuOpen, show]);

  return { visible, show, isTouch: isTouchRef.current };
}
