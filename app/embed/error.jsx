'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function EmbedErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('[EmbedPlayer] Unhandled error in embed player view:', error);
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
      <Stack alignItems="center" spacing={2.5} sx={{ maxWidth: 460 }}>
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

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75, color: '#ffffff' }}>
            Unable to Load Video Stream
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6 }}>
            {error?.message && !error.message.includes('digest')
              ? error.message
              : 'The video stream could not be loaded at this time. Please click below to try again.'}
          </Typography>
        </Box>

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
      </Stack>
    </Box>
  );
}
