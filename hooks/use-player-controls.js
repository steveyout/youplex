import { useRef, useState, useCallback, useEffect } from 'react';

const AUTO_HIDE_MS = 3200;

export function usePlayerControls(paused) {
  const [visible, setVisible] = useState(true);

  const hideTimer = useRef(null);
  const pausedRef = useRef(paused);
  const isTouchRef = useRef(false);

  pausedRef.current = paused;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      isTouchRef.current =
        window.matchMedia('(pointer: coarse), (max-width: 600px)').matches;
    }
  }, []);

  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!pausedRef.current && !isTouchRef.current) setVisible(false);
    }, AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    show();
    return () => clearTimeout(hideTimer.current);
  }, [show]);

  useEffect(() => {
    if (paused) setVisible(true);
  }, [paused]);

  return { visible, show, isTouch: isTouchRef.current };
}