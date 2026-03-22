'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { useTvFocus } from './tv-focus-context';
import { TvCard } from './tv-card';

// ----------------------------------------------------------------------

export function TvRow({ title, items, rowIndex }) {
  const { focusRow } = useTvFocus();
  const scrollRef = useRef(null);

  const isFocusedRow = focusRow === rowIndex;

  // Scroll the active row into the viewport
  useEffect(() => {
    if (isFocusedRow && scrollRef.current) {
      scrollRef.current.closest('[data-tv-row]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isFocusedRow]);

  return (
    <Box data-tv-row sx={{ py: { xs: 2, md: 3 } }}>
      <Typography
        variant="h5"
        sx={{
          px: { xs: 4, md: 6 },
          mb: 2,
          fontWeight: 800,
          fontSize: { xs: '1.3rem', md: '1.8rem' },
          color: isFocusedRow ? '#fff' : 'grey.500',
          transition: 'color 0.3s ease',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </Typography>

      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: { xs: 1.5, md: 2.5 },
          px: { xs: 4, md: 6 },
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          pb: 1,
        }}
      >
        {items.map((item, colIdx) => (
          <TvCard
            key={item.id}
            post={item}
            rowIndex={rowIndex}
            colIndex={colIdx}
          />
        ))}
      </Box>
    </Box>
  );
}
