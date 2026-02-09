'use client';

import { paths } from '@/routes/paths';
import { searchMedia } from '@/actions/api';
import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce'; // Updated to use your new TMDB search

import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { PostList } from '../post-list';
import { PostSort } from '../post-sort';
import { PostSearch } from '../post-search';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'topRated', label: 'Top Rated' },
];

export function PostListHomeView({ categories }) {
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const debouncedQuery = useDebounce(searchQuery);

  // Handle Search using TMDB
  const handleSearch = useCallback(async (inputValue) => {
    setSearchQuery(inputValue);
    if (inputValue.length > 2) {
      setSearchLoading(true);
      try {
        const data = await searchMedia(inputValue);
        setSearchResults(data?.results || []);
      } catch (error) {
        console.error(error);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleSortBy = useCallback((newValue) => {
    setSortBy(newValue);
  }, []);

  return (
    <Container sx={{ pb: 10 }}>
      <Typography variant="h4" sx={{ my: { xs: 3, md: 5 } }}>
        Explore Content
      </Typography>

      <Stack
        spacing={3}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-end', sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ mb: { xs: 3, md: 5 } }}
      >
        <PostSearch
          query={debouncedQuery}
          results={searchResults}
          onSearch={handleSearch}
          loading={searchLoading}
          // Assuming your path helper takes (type, id)
          hrefItem={(item) => paths.post.details(item.media_type || 'movie', item.id)}
        />

        <PostSort sort={sortBy} onSort={handleSortBy} sortOptions={SORT_OPTIONS} />
      </Stack>

      {/* Rendering Different Categories */}
      <Stack spacing={5}>
        {categories.trending.length > 0 && (
          <BoxSection title="Trending Now" posts={applyFilter(categories.trending, sortBy)} />
        )}

        {categories.popularMovies.length > 0 && (
          <BoxSection title="Popular Movies" posts={applyFilter(categories.popularMovies, sortBy)} />
        )}

        {categories.topRatedTv.length > 0 && (
          <BoxSection title="Top Rated TV Shows" posts={applyFilter(categories.topRatedTv, sortBy)} />
        )}

        {categories.upcoming.length > 0 && (
          <BoxSection title="Upcoming Releases" posts={applyFilter(categories.upcoming, sortBy)} />
        )}
      </Stack>
    </Container>
  );
}

// ----------------------------------------------------------------------

function BoxSection({ title, posts }) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
      <PostList posts={posts} />
    </Stack>
  );
}

// ----------------------------------------------------------------------

const applyFilter = (inputData, sortBy) => {
  if (!inputData) return [];

  const data = [...inputData];

  if (sortBy === 'latest') {
    return data.sort((a, b) =>
      new Date(b.release_date || b.first_air_date) - new Date(a.release_date || a.first_air_date)
    );
  }

  if (sortBy === 'popular') {
    return data.sort((a, b) => b.popularity - a.popularity);
  }

  if (sortBy === 'topRated') {
    return data.sort((a, b) => b.vote_average - a.vote_average);
  }

  return data;
};
