import { useRef, useMemo, useCallback } from 'react';

// ----------------------------------------------------------------------

export function useDoubleClick({ click, doubleClick, timeout = 250 }) {
  const clickTimeout = useRef(null);

  const clearClickTimeout = useCallback(() => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
    }
  }, []);

  const handleEvent = useCallback(
    (event) => {
      clearClickTimeout();
      if (click && event.detail === 1) {
        clickTimeout.current = setTimeout(() => {
          click(event);
        }, timeout);
      }
      if (event.detail % 2 === 0) {
        doubleClick(event);
      }
    },
    [click, doubleClick, timeout, clearClickTimeout]
  );

  const memoizedValue = useMemo(() => handleEvent, [handleEvent]);

  return memoizedValue;
}
