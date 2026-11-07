import { Suspense } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

export default async function TvEmbedPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const id = resolvedParams?.id;
  const season = resolvedSearch?.season || 1;
  const episode = resolvedSearch?.episode || 1;

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
      <EmbedPlayerView type="tv" id={id} season={season} episode={episode} />
    </Suspense>
  );
}
