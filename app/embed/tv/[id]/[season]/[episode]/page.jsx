'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

function TvEpisodeEmbedContent() {
  const params = useParams();
  const id = params?.id;
  const season = params?.season || 1;
  const episode = params?.episode || 1;

  return <EmbedPlayerView type="tv" id={id} season={season} episode={episode} />;
}

export default function TvEpisodeEmbedPage() {
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
      <TvEpisodeEmbedContent />
    </Suspense>
  );
}

