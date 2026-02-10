'use client';

import { paths } from '@/routes/paths';
import { searchMedia } from '@/actions/api';
import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

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

  /**
   * Helper to format object keys into Titles
   * Example: "popularMovies" -> "Popular Movies"
   */
  const formatSectionTitle = (key) => {
    const result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  return (
    <Container sx={{ pb: 10 }}>
      <Stack
        spacing={3}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-end', sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ py: { xs: 3, md: 5 } }}
      >
        <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>
          Explore Content
        </Typography>

        <Stack direction="row" spacing={1} flexShrink={0}>
          <PostSearch
            query={debouncedQuery}
            results={searchResults}
            onSearch={handleSearch}
            loading={searchLoading}
            /**
             * Refined hrefItem logic:
             * 1. Check item.media_type (returned by multi-search)
             * 2. Fallback to checking for 'first_air_date' (unique to TV)
             * 3. Default to 'movie'
             */
            hrefItem={(item) => {
              const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
              const title = item.title || item.name;

              return paths.watch.details(type, item.id, title);
            }}
          />
          <PostSort sort={sortBy} onSort={handleSortBy} sortOptions={SORT_OPTIONS} />
        </Stack>
      </Stack>

      <Stack spacing={8}>
        {Object.keys(categories).map((key) => {
          const items = categories[key];

          if (!items || items.length === 0) return null;

          const filteredItems = applyFilter(items, sortBy);

          return (
            <BoxSection
              key={key}
              title={formatSectionTitle(key)}
              posts={filteredItems}
            />
          );
        })}
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
