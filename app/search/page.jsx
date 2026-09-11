import { Suspense } from 'react';
import { CONFIG } from '@/config-global';
import { SearchView } from '@/sections/movies/search/search-view';

import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

// ----------------------------------------------------------------------

function SearchFallback() {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
      <CircularProgress color="inherit" />
    </Stack>
  );
}

// ----------------------------------------------------------------------

export const metadata = {
  title: `Search Movies & TV Shows - ${CONFIG.site.name}`,
  description: `Search the entire ${CONFIG.site.name} library for movies, TV shows and anime to stream online in high quality.`,
  keywords: 'search, streaming, movies, tv shows, anime, online cinema, youplex',
  openGraph: {
    title: `Search - ${CONFIG.site.name}`,
    description: 'Find your next favorite movie, series or anime.',
    type: 'website',
  },
};

// ----------------------------------------------------------------------

export default async function Page({ searchParams }) {
  const { q = '' } = await searchParams;

  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchView initialQuery={typeof q === 'string' ? q : ''} />
    </Suspense>
  );
}