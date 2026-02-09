'use client';

import { paths } from '@/routes/paths';
import { Label } from '@/components/label';
import { searchMedia } from '@/actions/api';
import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useSetState } from '@/hooks/use-set-state';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import { PostSort } from '../post-sort';
import { PostSearch } from '../post-search';
import { PostListHorizontal } from '../post-list-horizontal';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'topRated', label: 'Top Rated' },
];

export function PostListView({ posts = [], loading }) {
  const [sortBy, setSortBy] = useState('latest');

  const [searchQuery, setSearchQuery] = useState('');

  const [searchResults, setSearchResults] = useState([]);

  const [searchLoading, setSearchLoading] = useState(false);

  const debouncedQuery = useDebounce(searchQuery);

  const filters = useSetState({ type: 'all' });

  // Handle TMDB Search
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

  const dataFiltered = applyFilter({ inputData: posts, filters: filters.state, sortBy });

  const handleSortBy = useCallback((newValue) => {
    setSortBy(newValue);
  }, []);

  const handleFilterType = useCallback(
    (event, newValue) => {
      filters.setState({ type: newValue });
    },
    [filters]
  );

  return (
    <Container sx={{ py: 5 }}>
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
          hrefItem={(item) => paths.post.details(item.media_type || 'movie', item.id)}
        />

        <PostSort sort={sortBy} onSort={handleSortBy} sortOptions={SORT_OPTIONS} />
      </Stack>

      <Tabs
        value={filters.state.type}
        onChange={handleFilterType}
        sx={{ mb: { xs: 3, md: 5 } }}
      >
        {['all', 'movie', 'tv'].map((tab) => (
          <Tab
            key={tab}
            iconPosition="end"
            value={tab}
            label={tab === 'all' ? 'All Content' : tab === 'movie' ? 'Movies' : 'TV Shows'}
            icon={
              <Label
                variant={((tab === 'all' || tab === filters.state.type) && 'filled') || 'soft'}
                color={(tab === 'movie' && 'info') || (tab === 'tv' && 'secondary') || 'default'}
              >
                {tab === 'all' && posts.length}
                {tab === 'movie' && posts.filter((post) => post.media_type === 'movie').length}
                {tab === 'tv' && posts.filter((post) => post.media_type === 'tv').length}
              </Label>
            }
            sx={{ textTransform: 'capitalize' }}
          />
        ))}
      </Tabs>

      <PostListHorizontal posts={dataFiltered} loading={loading} />
    </Container>
  );
}

// ----------------------------------------------------------------------

const applyFilter = ({ inputData, filters, sortBy }) => {
  const { type } = filters;

  let filteredData = [...inputData];

  // TMDB Sorting Logic
  if (sortBy === 'latest') {
    filteredData.sort((a, b) =>
      new Date(b.release_date || b.first_air_date) - new Date(a.release_date || a.first_air_date)
    );
  }

  if (sortBy === 'popular') {
    filteredData.sort((a, b) => b.popularity - a.popularity);
  }

  if (sortBy === 'topRated') {
    filteredData.sort((a, b) => b.vote_average - a.vote_average);
  }

  // Filter by Type (Movie vs TV)
  if (type !== 'all') {
    filteredData = filteredData.filter((post) => post.media_type === type);
  }

  return filteredData;
};
