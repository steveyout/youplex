'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { TvFocusProvider } from './tv-focus-context';
import { TvRow } from './tv-row';

// ----------------------------------------------------------------------

function formatTitle(key) {
  const result = key.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function TvHomeView({ categories }) {
  // Build the rows data for the focus provider
  const rowKeys = useMemo(() => Object.keys(categories), [categories]);
  const rows = useMemo(
    () => rowKeys.map((key) => categories[key] || []),
    [rowKeys, categories]
  );

  // Hero item from trending
  const heroItem = categories?.trending?.[0];
  const heroBackdrop = heroItem?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`
    : '';

  return (
    <TvFocusProvider rows={rows}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#050505' }}>
        {/* ── TV Hero Banner ── */}
        {heroItem && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 360, md: 500 },
              overflow: 'hidden',
              background: `url(${heroBackdrop}) center center / cover no-repeat`,
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.5) 40%, rgba(5,5,5,0.15) 100%)',
              },
            }}
          >
            <Stack
              sx={{
                position: 'absolute',
                bottom: { xs: 30, md: 60 },
                left: { xs: 30, md: 60 },
                zIndex: 2,
              }}
              spacing={1.5}
            >
              <Typography
                variant="h2"
                sx={{
                  color: 'white',
                  fontWeight: 900,
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  textShadow: '0 4px 30px rgba(0,0,0,0.9)',
                  lineHeight: 1.05,
                  maxWidth: 700,
                }}
              >
                {heroItem.title || heroItem.name}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'grey.300',
                  maxWidth: 550,
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textShadow: '0 2px 15px rgba(0,0,0,0.8)',
                }}
              >
                {heroItem.overview}
              </Typography>
            </Stack>
          </Box>
        )}

        {/* ── Category Rows ── */}
        <Box sx={{ py: { xs: 2, md: 4 } }}>
          {rowKeys.map((key, rowIdx) => {
            const items = categories[key];
            if (!items || items.length === 0) return null;

            return (
              <TvRow
                key={key}
                title={formatTitle(key)}
                items={items}
                rowIndex={rowIdx}
              />
            );
          })}
        </Box>

        {/* ── Navigation hint ── */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 30,
            zIndex: 100,
            display: 'flex',
            gap: 2,
            opacity: 0.4,
          }}
        >
          <Typography variant="caption" sx={{ color: 'grey.400', fontSize: '0.75rem' }}>
            ← → ↑ ↓ Navigate &nbsp;|&nbsp; Enter Select
          </Typography>
        </Box>
      </Box>
    </TvFocusProvider>
  );
}
