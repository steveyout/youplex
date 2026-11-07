'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function EmbedErrorBoundary({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('[EmbedPlayer] Unhandled error in embed player view:', error);

    try {
      fetch('/api/log-embed-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || String(error),
          name: error?.name,
          stack: error?.stack,
          digest: error?.digest,
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      }).catch(() => {});
    } catch {}
  }, [error]);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        bgcolor: '#050709',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Stack alignItems="center" spacing={2.5} sx={{ maxWidth: 520, width: '100%' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: alpha('#ef4444', 0.15),
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: 28, lineHeight: 1 }}>⚠️</Typography>
        </Box>

        <Box sx={{ width: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75, color: '#ffffff' }}>
            Unable to Load Video Stream
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6 }}>
            {error?.message && !error.message.includes('digest')
              ? error.message
              : 'The video stream could not be loaded at this time. Please click below to try again.'}
          </Typography>

          {error?.digest && (
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', mt: 0.5 }}>
              Error Code: {error.digest}
            </Typography>
          )}

          {showDetails && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: '#111',
                border: '1px solid #333',
                borderRadius: 1,
                fontSize: 11,
                fontFamily: 'monospace',
                textAlign: 'left',
                maxHeight: 160,
                overflowY: 'auto',
                color: '#f87171',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {error?.stack || error?.message || String(error)}
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            onClick={() => reset()}
            variant="contained"
            sx={{
              bgcolor: '#FF3030',
              color: '#ffffff',
              fontWeight: 700,
              px: 3.5,
              py: 1,
              borderRadius: 1.5,
              boxShadow: '0 4px 14px rgba(255, 48, 48, 0.4)',
              '&:hover': {
                bgcolor: '#e02828',
              },
            }}
          >
            Retry Stream
          </Button>

          <Button
            onClick={() => setShowDetails((prev) => !prev)}
            variant="outlined"
            size="small"
            sx={{
              color: '#9ca3af',
              borderColor: '#374151',
              '&:hover': { borderColor: '#4b5563' },
            }}
          >
            {showDetails ? 'Hide Details' : 'Details'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
