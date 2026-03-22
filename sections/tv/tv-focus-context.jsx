'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const TvFocusContext = createContext(null);

export function useTvFocus() {
  return useContext(TvFocusContext);
}

export function TvFocusProvider({ rows, children }) {
  const [focusRow, setFocusRow] = useState(0);
  const [focusCol, setFocusCol] = useState(0);
  const containerRef = useRef(null);

  const totalRows = rows.length;

  const moveFocus = useCallback(
    (direction) => {
      switch (direction) {
        case 'up':
          setFocusRow((prev) => Math.max(0, prev - 1));
          break;
        case 'down':
          setFocusRow((prev) => Math.min(totalRows - 1, prev + 1));
          break;
        case 'left':
          setFocusCol((prev) => Math.max(0, prev - 1));
          break;
        case 'right':
          setFocusCol((prev) => {
            const maxCol = (rows[focusRow]?.length || 1) - 1;
            return Math.min(maxCol, prev + 1);
          });
          break;
        default:
          break;
      }
    },
    [totalRows, rows, focusRow]
  );

  useEffect(() => {
    const maxCol = (rows[focusRow]?.length || 1) - 1;
    if (focusCol > maxCol) {
      setFocusCol(maxCol);
    }
  }, [focusRow, focusCol, rows]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveFocus('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveFocus('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveFocus('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveFocus('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveFocus]);

  return (
    <TvFocusContext.Provider value={{ focusRow, focusCol, setFocusRow, setFocusCol, containerRef }}>
      <div ref={containerRef}>{children}</div>
    </TvFocusContext.Provider>
  );
}
