import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

export default async function QueryMovieEmbedPage({ searchParams }) {
  const resolvedParams = searchParams ? await searchParams : {};
  const id = resolvedParams?.tmdb || resolvedParams?.imdb || resolvedParams?.id;

  if (!id) {
    redirect('/embed');
  }

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
      <EmbedPlayerView type="movie" id={id} />
    </Suspense>
  );
}
