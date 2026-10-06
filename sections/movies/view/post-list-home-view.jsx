'use client';

import { m } from 'framer-motion';
import { paths } from '@/routes/paths';
import { varAlpha } from '@/theme/styles';
import { searchMedia } from '@/actions/api';
import { Iconify } from '@/components/iconify';
import { useDebounce } from '@/hooks/use-debounce';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { PostList } from '../post-list';
import { PostSort } from '../post-sort';
import { HeroBanner } from './hero-banner';
import { PostSearch } from '../post-search';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'topRated', label: 'Top Rated' },
];

const HOME_TABS = [
  { id: 'all', label: 'All Content', icon: 'solar:widget-2-bold' },
  { id: 'movies', label: 'Movies', icon: 'solar:clapperboard-play-bold' },
  { id: 'tv', label: 'TV Shows', icon: 'solar:tv-bold' },
];

const MOVIE_TABS = [
  { id: 'all', label: 'All Movies', icon: 'solar:clapperboard-play-bold' },
  { id: 'recommended', label: 'Recommended', icon: 'solar:magic-stick-3-bold' },
  { id: 'trending', label: 'Trending', icon: 'solar:fire-bold' },
  { id: 'nowPlaying', label: 'Now Playing', icon: 'solar:play-stream-bold' },
  { id: 'popular', label: 'Popular', icon: 'solar:flame-bold' },
  { id: 'topRated', label: 'Top Rated', icon: 'solar:star-bold' },
  { id: 'upcoming', label: 'Upcoming', icon: 'solar:calendar-date-bold' },
];

const TV_TABS = [
  { id: 'all', label: 'All Series', icon: 'solar:tv-bold' },
  { id: 'recommended', label: 'Recommended', icon: 'solar:magic-stick-3-bold' },
  { id: 'trending', label: 'Trending', icon: 'solar:fire-bold' },
  { id: 'airingToday', label: 'Airing Today', icon: 'solar:clock-circle-bold' },
  { id: 'onTheAir', label: 'On The Air', icon: 'solar:broadcast-bold' },
  { id: 'popular', label: 'Popular', icon: 'solar:flame-bold' },
  { id: 'topRated', label: 'Top Rated', icon: 'solar:star-bold' },
];

export function PostListHomeView({ categories = {}, pageType = 'all' }) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('all');
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

  const currentTabs = useMemo(() => {
    if (pageType === 'movies') return MOVIE_TABS;
    if (pageType === 'tv') return TV_TABS;
    return HOME_TABS;
  }, [pageType]);

  const formatSectionTitle = useCallback(
    (key) => {
      switch (key) {
        case 'recommended':
          return pageType === 'tv' ? 'Recommended Series' : 'Recommended Movies';
        case 'trending':
          return 'Trending Now';
        case 'popularMovies':
          return 'Popular Movies';
        case 'popular':
          return 'Most Popular';
        case 'topRatedTv':
          return 'Critically Acclaimed Shows';
        case 'topRated':
          return 'Critically Acclaimed';
        case 'nowPlaying':
          return 'Now Playing in Theaters';
        case 'upcoming':
          return 'Upcoming Releases';
        case 'airingToday':
          return 'Airing Today';
        case 'onTheAir':
          return 'Currently On The Air';
        default: {
          const result = key.replace(/([A-Z])/g, ' $1');
          return result.charAt(0).toUpperCase() + result.slice(1);
        }
      }
    },
    [pageType]
  );

  const getSectionIcon = (key) => {
    switch (key) {
      case 'recommended':
        return 'solar:magic-stick-3-bold';
      case 'trending':
        return 'solar:fire-bold';
      case 'popularMovies':
      case 'popular':
        return 'solar:flame-bold';
      case 'topRatedTv':
      case 'topRated':
        return 'solar:star-bold';
      case 'nowPlaying':
        return 'solar:play-stream-bold';
      case 'upcoming':
        return 'solar:calendar-date-bold';
      case 'airingToday':
        return 'solar:clock-circle-bold';
      case 'onTheAir':
        return 'solar:broadcast-bold';
      default:
        return 'solar:play-circle-bold';
    }
  };

  const filteredCategories = useMemo(() => {
    if (activeTab === 'all') return categories;

    // Direct tab key match (e.g. 'recommended', 'popular', 'trending')
    if (categories[activeTab]) {
      return { [activeTab]: categories[activeTab] };
    }

    const res = {};
    if (activeTab === 'movies') {
      if (categories.popularMovies) res.popularMovies = categories.popularMovies;
      if (categories.popular) res.popular = categories.popular;
      if (categories.upcoming) res.upcoming = categories.upcoming;
      if (categories.trending) {
        res.trending = categories.trending.filter((i) => (i.media_type || 'movie') === 'movie');
      }
    } else if (activeTab === 'tv') {
      if (categories.topRatedTv) res.topRatedTv = categories.topRatedTv;
      if (categories.popular) res.popular = categories.popular;
      if (categories.trending) {
        res.trending = categories.trending.filter((i) => i.media_type === 'tv');
      }
    }
    return Object.keys(res).length > 0 ? res : categories;
  }, [categories, activeTab]);

  const heroItems = useMemo(() => {
    if (categories?.trending?.length) return categories.trending.slice(0, 5);
    if (categories?.popular?.length) return categories.popular.slice(0, 5);
    if (categories?.popularMovies?.length) return categories.popularMovies.slice(0, 5);
    if (categories?.recommended?.length) return categories.recommended.slice(0, 5);
    return [];
  }, [categories]);

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Ambient background glow */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 1440,
          height: 600,
          background: (t) =>
            `radial-gradient(ellipse at 50% 0%, ${varAlpha(t.vars.palette.primary.mainChannel, 0.15)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {heroItems.length > 0 && <HeroBanner items={heroItems} />}

      <Container sx={{ pb: 12, position: 'relative', zIndex: 1 }}>
        {/* Category switcher & search toolbar */}
        <Stack
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ py: { xs: 3, md: 5 } }}
        >
          {/* Category Tabs */}
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: { xs: 0.5, sm: 0 }, scrollbarWidth: 'none' }}>
            {currentTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Box
                  key={tab.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2.2,
                    py: 0.8,
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 600,
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    color: active ? 'common.white' : 'text.secondary',
                    bgcolor: active
                      ? 'primary.main'
                      : varAlpha(theme.vars.palette.background.paperChannel, 0.4),
                    border: '1px solid',
                    borderColor: active
                      ? 'primary.main'
                      : varAlpha(theme.vars.palette.divider, 0.12),
                    boxShadow: active
                      ? `0 6px 20px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.45)}`
                      : 'none',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      color: active ? 'common.white' : 'text.primary',
                      borderColor: active
                        ? 'primary.main'
                        : varAlpha(theme.vars.palette.primary.mainChannel, 0.4),
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Iconify icon={tab.icon} width={18} />
                  {tab.label}
                </Box>
              );
            })}
          </Stack>

          {/* Search & Sort Controls */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexShrink={0}>
            <PostSearch
              query={debouncedQuery}
              results={searchResults}
              onSearch={handleSearch}
              loading={searchLoading}
              hrefItem={(item) => {
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                const title = item.title || item.name;
                return paths.watch.details(type, item.id, title);
              }}
            />
            <PostSort sort={sortBy} onSort={handleSortBy} sortOptions={SORT_OPTIONS} />
          </Stack>
        </Stack>

        {/* Dynamic Sections */}
        <Stack spacing={8}>
          {Object.keys(filteredCategories).map((key, sectionIdx) => {
            let items = filteredCategories[key];
            if (!items || items.length === 0) return null;

            if (key === 'trending' && items.length > 5 && activeTab === 'all' && heroItems.length > 0) {
              items = items.slice(5);
            }

            const filteredItems = applyFilter(items, sortBy);

            return (
              <BoxSection
                key={key}
                sectionKey={key}
                title={formatSectionTitle(key)}
                icon={getSectionIcon(key)}
                posts={filteredItems}
                index={sectionIdx}
              />
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}

// ----------------------------------------------------------------------

function BoxSection({ sectionKey, title, icon, posts, index }) {
  const theme = useTheme();

  return (
    <Stack spacing={3}>
      <m.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05, margin: '100px 0px' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ willChange: 'opacity, transform' }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            variant="h5"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                color: 'primary.main',
                border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.25)}`,
              }}
            >
              <Iconify icon={icon} width={18} />
            </Box>
            {title}
            <Chip
              size="small"
              label={posts.length}
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
                color: 'primary.main',
                border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.2)}`,
                borderRadius: 1,
              }}
            />
          </Typography>
        </Stack>
      </m.div>

      <PostList posts={posts} startIndex={(index ?? 0) * 4} />
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
    return data.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  if (sortBy === 'topRated') {
    return data.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  }

  return data;
};
