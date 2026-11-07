'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

function TvEmbedContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params?.id;
  const season = searchParams.get('season') || 1;
  const episode = searchParams.get('episode') || 1;

  return <EmbedPlayerView type="tv" id={id} season={season} episode={episode} />;
}

export default function TvEmbedPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            width: '100vw',
            height: '100vh',
            bgcolor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={48} sx={{ color: '#FF3030' }} />
        </Box>
      }
    >
      <TvEmbedContent />
    </Suspense>
  );
}

