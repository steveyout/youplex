import { Suspense } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

export default async function TvEpisodeEmbedPage({ params }) {
  const resolvedParams = await params;

  const id = resolvedParams?.id;
  const season = resolvedParams?.season || 1;
  const episode = resolvedParams?.episode || 1;

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
