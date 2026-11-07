'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

function MovieEmbedContent() {
  const params = useParams();
  const id = params?.id;

  return <EmbedPlayerView type="movie" id={id} />;
}

export default function MovieEmbedPage() {
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
      <MovieEmbedContent />
    </Suspense>
  );
}

