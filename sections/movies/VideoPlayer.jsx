'use client';

import { useState } from 'react';
import { Iconify } from '@/components/iconify';
import { providers, getEmbedUrl, DEFAULT_PROVIDER_ID } from '@/config/providers';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export default function VideoPlayer({ tmdbId, type, season = 1, episode = 1 }) {
  // Use the default provider ID from your config
  const [selectedProviderId, setSelectedProviderId] = useState(DEFAULT_PROVIDER_ID);

  // Filter only enabled providers from your config
  const availableProviders = providers.filter((p) => p.enabled);

  // Use your helper function to generate the source
  const iframeSrc = getEmbedUrl(selectedProviderId, type, tmdbId, season, episode);

  return (
    <Box>
      {/* 1. The Iframe Container */}
      <Box
        sx={{
          width: 1,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'common.black',
          aspectRatio: '16/9',
          boxShadow: (theme) => `0 24px 48px 0 ${alpha(theme.palette.common.black, 0.4)}`,
        }}
      >
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            title="Movie Player"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: 1, color: 'white' }}>
            <Typography variant="h6">No Provider Selected</Typography>
          </Stack>
        )}
      </Box>

      {/* 2. Server/Provider Selection Bar */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 1.5,
          bgcolor: 'background.neutral',
          border: (theme) => `solid 1px ${theme.vars.palette.divider}`
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', flexShrink: 0 }}>
          <Iconify icon="solar:play-stream-bold-duotone" width={24} />
          <Typography variant="subtitle2">Server:</Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1.5} // Increased spacing for better touch targets
          sx={{
            overflowX: 'auto',
            pb: 1, // Space for the scrollbar if visible
            px: { xs: 2, sm: 0 }, // Adds "edge" spacing on mobile so buttons don't hit the screen wall
            scrollbarWidth: 'none', // Hides scrollbar on Firefox
            '&::-webkit-scrollbar': { display: 'none' }, // Hides scrollbar on Chrome/Safari
            '& > *': {
              flexShrink: 0, // Prevents buttons from squishing
            },
          }}
        >
          {availableProviders.map((provider) => {
            const isSelected = selectedProviderId === provider.id;

            return (
              <Button
                key={provider.id}
                size="small"
                variant={isSelected ? 'contained' : 'soft'}
                color={isSelected ? 'primary' : 'inherit'}
                onClick={() => setSelectedProviderId(provider.id)}
                sx={{
                  whiteSpace: 'nowrap',
                  borderRadius: 1.25, // Slightly rounder for a modern look
                  px: 2 // Internal button padding for better clickable area
                }}
              >
                {provider.name}
              </Button>
            );
          })}
        </Stack>
      </Stack>

      <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.disabled', textAlign: 'center' }}>
        If the current server is slow or not working, please try switching to a different one.
      </Typography>
    </Box>
  );
}
