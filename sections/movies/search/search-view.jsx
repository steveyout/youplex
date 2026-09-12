'use client';

import { paths } from '@/routes/paths';
import { varAlpha } from '@/theme/styles';
import { Iconify } from '@/components/iconify';
import { m, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter, useSearchParams } from '@/routes/hooks';
import { SearchNotFound } from '@/components/search-not-found';
import { getMovies, getTrending, searchMedia } from '@/actions/api';
import { SliderRow } from '@/components/slider-row/slider-row';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { PostItem } from '../post-item';
import { PostItemSkeleton } from '../post-skeleton';

// ----------------------------------------------------------------------

const motionEase = [0.22, 1, 0.36, 1];

const QUICK_SEARCHES = [
  'Dune',
  'Interstellar',
  'Oppenheimer',
  'Arcane',
  'Breaking Bad',
  'Stranger Things',
  'Attack on Titan',
  'Cyberpunk',
  'The Batman',
  'Avengers',
];

const GENRES = [
  { label: 'Action', query: 'Action', icon: 'solar:fire-bold' },
  { label: 'Sci-Fi', query: 'Sci-Fi', icon: 'solar:planet-bold' },
  { label: 'Drama', query: 'Drama', icon: 'solar:masks-bold' },
  { label: 'Animation', query: 'Anime', icon: 'solar:magic-stick-3-bold' },
  { label: 'Comedy', query: 'Comedy', icon: 'solar:smile-circle-bold' },
  { label: 'Horror', query: 'Horror', icon: 'solar:ghost-bold' },
  { label: 'Thriller', query: 'Thriller', icon: 'solar:danger-triangle-bold' },
  { label: 'Romance', query: 'Romance', icon: 'solar:heart-bold' },
];

const RESULT_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

const SORT_OPTIONS = [
  { key: 'relevance', label: 'Most Relevant' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'newest', label: 'Newest Releases' },
];

const RECENT_SEARCHES_KEY = 'youplex_recent_searches';

const filterWatchable = (list) =>
  Array.isArray(list) ? list.filter((item) => item.media_type !== 'person' && (item.poster_path || item.backdrop_path)) : [];

export function SearchView({ initialQuery = '' }) {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || 'all';

  const inputRef = useRef(null);
  const [draft, setDraft] = useState(initialQuery || urlQuery);
  const [allResults, setAllResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  const debouncedQuery = useDebounce(draft, 350);

  const pageRef = useRef(1);
  const requestSeq = useRef(0);
  const didInit = useRef(false);

  // Load Recent Searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 8));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = useCallback((term) => {
    const q = term.trim();
    if (!q || q.length < 2) return;

    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback((term, event) => {
    if (event) event.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== term);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearAllRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Fetch Trending and Top Rated for Idle view
  useEffect(() => {
    getTrending('all', 'day')
      .then((data) => setTrending(filterWatchable(data?.results)))
      .catch(() => setTrending([]));

    getMovies('top_rated', 1)
      .then((data) => setTopRated(filterWatchable(data?.results)))
      .catch(() => setTopRated([]));
  }, []);

  // Global Keyboard Shortcut: Ctrl+K or / focuses search bar, ESC clears
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== inputRef.current && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Sync the input when the URL changes externally
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    setDraft(urlQuery);
  }, [urlQuery]);

  const commitQuery = useCallback(
    (query) => {
      const q = query.trim();

      if (q.length >= 2) {
        saveRecentSearch(q);
        if (q !== urlQuery) {
          router.replace(`${paths.search}?q=${encodeURIComponent(q)}&type=${urlType}`, { scroll: false });
        }
        return;
      }

      if (urlQuery) {
        router.replace(`${paths.search}?type=${urlType}`, { scroll: false });
      }
    },
    [router, saveRecentSearch, urlQuery, urlType]
  );

  // Fetch results whenever debounced query settles
  useEffect(() => {
    const q = debouncedQuery.trim();

    if (q.length < 2) {
      requestSeq.current += 1;
      pageRef.current = 1;
      setAllResults([]);
      setTotalResults(0);
      setLoading(false);
      return;
    }

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    pageRef.current = 1;
    setLoading(true);

    searchMedia(q, 1)
      .then((data) => {
        if (requestSeq.current !== seq) return;
        setAllResults(filterWatchable(data?.results));
        setTotalResults(data?.total_results || 0);
        saveRecentSearch(q);
      })
      .catch((error) => {
        console.error(error);
        if (requestSeq.current !== seq) return;
        setAllResults([]);
        setTotalResults(0);
      })
      .finally(() => {
        if (requestSeq.current === seq) setLoading(false);
      });
  }, [debouncedQuery, saveRecentSearch]);

  const visibleResults = useMemo(() => {
    let list = urlType === 'all' ? allResults : allResults.filter((item) => item.media_type === urlType);

    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'newest') {
      list = [...list].sort((a, b) => {
        const dateA = new Date(a.release_date || a.first_air_date || 0).getTime();
        const dateB = new Date(b.release_date || b.first_air_date || 0).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [allResults, urlType, sortBy]);

  const handleLoadMore = async () => {
    const q = debouncedQuery.trim();
    if (loadingMore || !q || allResults.length >= totalResults) return;

    const seq = requestSeq.current;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);

    try {
      const data = await searchMedia(q, nextPage);
      if (requestSeq.current !== seq) return;
      pageRef.current = nextPage;

      setAllResults((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const next = filterWatchable(data?.results).filter((item) => !seen.has(item.id));
        return next.length ? [...prev, ...next] : prev;
      });
      setTotalResults(data?.total_results || totalResults);
    } catch (error) {
      console.error(error);
    } finally {
      if (requestSeq.current === seq) setLoadingMore(false);
    }
  };

  const handleNavigate = useCallback(
    (item) => {
      const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      const title = item.title || item.name;
      router.push(paths.watch.details(type, item.id, title));
    },
    [router]
  );

  const handleChangeType = (type) => {
    if (type === urlType) return;
    const q = draft.trim();
    const query = q.length >= 2 ? q : urlQuery;
    router.replace(`${paths.search}?q=${encodeURIComponent(query)}&type=${type}`, { scroll: false });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (draft.trim()) commitQuery(draft);
      if (visibleResults.length > 0) handleNavigate(visibleResults[0]);
    }

    if (event.key === 'Escape') {
      commitQuery('');
      setDraft('');
    }
  };

  const showIdle = debouncedQuery.trim().length < 2;
  const showNotFound = !loading && !loadingMore && !showIdle && visibleResults.length === 0;
  const hasMore = totalResults > 0 && allResults.length < totalResults && !loading;

  const gridStyles = {
    display: 'grid',
    gap: { xs: 2, sm: 2.5, md: 3 },
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)',
      sm: 'repeat(3, 1fr)',
      md: 'repeat(4, 1fr)',
      lg: 'repeat(5, 1fr)',
    },
  };

  const renderHorizontalRow = (items) => (
    <SliderRow itemWidth={{ xs: 150, sm: 175, md: 190 }}>
      {items.map((item, index) => (
        <Box key={item.id}>
          <PostItem post={item} index={index} />
        </Box>
      ))}
    </SliderRow>
  );

  const renderTypeFilter = (
    <Stack direction="row" spacing={1} sx={{ mt: { xs: 2.5, sm: 3 } }}>
      {RESULT_TYPES.map((type) => {
        const active = urlType === type.key;

        return (
          <Box
            key={type.key}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={() => handleChangeType(type.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleChangeType(type.key);
              }
            }}
            sx={{
              px: 2.2,
              py: 0.6,
              borderRadius: 999,
              cursor: 'pointer',
              fontWeight: active ? 700 : 600,
              fontSize: '0.875rem',
              color: active ? 'common.white' : 'text.secondary',
              bgcolor: active
                ? 'primary.main'
                : varAlpha(theme.vars.palette.background.paperChannel, 0.4),
              border: '1px solid',
              borderColor: active
                ? 'primary.main'
                : varAlpha(theme.vars.palette.divider, 0.12),
              boxShadow: active ? `0 6px 16px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.4)}` : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: active ? 'common.white' : 'text.primary',
                borderColor: active ? 'primary.main' : varAlpha(theme.vars.palette.primary.mainChannel, 0.4),
                transform: 'translateY(-1px)',
              },
            }}
          >
            {type.label}
          </Box>
        );
      })}
    </Stack>
  );

  const renderRecentSearches = recentSearches.length > 0 && (
    <Box sx={{ mt: 2.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Iconify icon="solar:history-bold" width={16} sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Recent Searches
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          onClick={clearAllRecentSearches}
          sx={{
            cursor: 'pointer',
            color: 'text.disabled',
            '&:hover': { color: 'error.main' },
            transition: 'color 0.2s ease',
          }}
        >
          Clear all
        </Typography>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {recentSearches.map((term) => (
          <Chip
            key={term}
            label={term}
            size="small"
            clickable
            onDelete={(e) => removeRecentSearch(term, e)}
            onClick={() => {
              setDraft(term);
              commitQuery(term);
            }}
            sx={{
              fontWeight: 500,
              fontSize: '0.8rem',
              borderRadius: 999,
              bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.5),
              border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.12)}`,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.5),
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
                color: 'primary.main',
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  );

  const renderQuickSearches = (
    <Box sx={{ mt: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <Iconify icon="solar:fire-bold" width={16} sx={{ color: 'primary.main' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Trending Searches
        </Typography>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {QUICK_SEARCHES.map((term) => (
          <Chip
            key={term}
            label={term}
            size="small"
            clickable
            onClick={() => {
              setDraft(term);
              commitQuery(term);
            }}
            sx={{
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: 999,
              border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.12)}`,
              bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.35),
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.6),
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                color: 'primary.main',
                transform: 'translateY(-1px)',
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  );

  const renderGenreExploration = (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 5,
            height: 20,
            borderRadius: 999,
            bgcolor: 'info.main',
            boxShadow: (t) => `0 0 12px ${varAlpha(t.vars.palette.info.mainChannel, 0.6)}`,
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Explore Genres
        </Typography>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1.25}>
        {GENRES.map((g) => (
          <Box
            key={g.label}
            role="button"
            tabIndex={0}
            onClick={() => {
              setDraft(g.query);
              commitQuery(g.query);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.4),
              border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.1)}`,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                color: 'primary.main',
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 20px -6px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.3)}`,
              },
            }}
          >
            <Iconify icon={g.icon} width={18} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {g.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );

  const renderIdle = (
    <m.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {renderGenreExploration}

      {trending.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 5,
                height: 20,
                borderRadius: 999,
                bgcolor: 'primary.main',
                boxShadow: (t) => `0 0 14px ${varAlpha(t.vars.palette.primary.mainChannel, 0.6)}`,
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Trending Right Now
            </Typography>
          </Stack>

          {renderHorizontalRow(trending)}
        </Box>
      )}

      {topRated.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 5,
                height: 20,
                borderRadius: 999,
                bgcolor: 'warning.main',
                boxShadow: (t) => `0 0 14px ${varAlpha(t.vars.palette.warning.mainChannel, 0.6)}`,
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Top Rated All-Time
            </Typography>
          </Stack>

          {renderHorizontalRow(topRated)}
        </Box>
      )}
    </m.div>
  );

  const renderLoading = (
    <m.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={gridStyles}>
        <PostItemSkeleton amount={15} />
      </Box>
    </m.div>
  );

  const renderEmpty = (
    <m.div
      key="empty"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: motionEase }}
    >
      <SearchNotFound query={debouncedQuery.trim()} sx={{ py: 6 }} />
    </m.div>
  );

  const renderResults = (
    <m.div
      key="results"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: motionEase }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        gap={1.5}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Results
          </Typography>
          <Chip
            size="small"
            label={`${totalResults || visibleResults.length} Found`}
            color="primary"
            variant="soft"
            sx={{ fontWeight: 700, borderRadius: 1 }}
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={(e) => setSortAnchorEl(e.currentTarget)}
            endIcon={<Iconify icon="solar:alt-arrow-down-bold" width={14} />}
            sx={{
              borderRadius: 2,
              borderColor: varAlpha(theme.vars.palette.divider, 0.16),
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Sort: {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
          </Button>

          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={() => setSortAnchorEl(null)}
            slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160 } } }}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.key}
                selected={sortBy === opt.key}
                onClick={() => {
                  setSortBy(opt.key);
                  setSortAnchorEl(null);
                }}
                sx={{ typography: 'body2', fontWeight: sortBy === opt.key ? 700 : 500 }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Stack>

      <Box sx={gridStyles}>
        {visibleResults.map((item, index) => (
          <PostItem key={item.id} post={item} index={index} />
        ))}
      </Box>

      {hasMore && (
        <Stack alignItems="center" sx={{ mt: 6 }}>
          <Button
            size="large"
            variant="contained"
            color="primary"
            disabled={loadingMore}
            onClick={handleLoadMore}
            startIcon={
              loadingMore ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Iconify icon="solar:alt-arrow-down-bold" />
              )
            }
            sx={{
              px: 4,
              py: 1.25,
              borderRadius: 999,
              fontWeight: 700,
              boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.4)}`,
            }}
          >
            {loadingMore ? 'Loading More...' : 'Load More Results'}
          </Button>
        </Stack>
      )}
    </m.div>
  );

  return (
    <Container sx={{ maxWidth: 'lg', py: { xs: 4, md: 6 } }}>
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: motionEase }}
      >
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Search
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Search through thousands of movies, series, and anime with instant streaming.
        </Typography>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: motionEase }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.25, sm: 1.75 },
            mt: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: varAlpha(theme.vars.palette.divider, 0.16),
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.6),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: `0 20px 48px -20px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.25)}`,
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: `0 0 0 2px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.35)}, 0 20px 48px -16px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.45)}`,
            },
          }}
        >
          <Iconify
            icon="solar:magnifer-bold"
            width={24}
            sx={{
              color: draft ? 'primary.main' : 'text.disabled',
              transition: 'color 0.2s ease',
            }}
          />

          <InputBase
            inputRef={inputRef}
            fullWidth
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, TV shows, anime, genres..."
            inputProps={{
              sx: {
                typography: { xs: 'h6', sm: 'h5' },
                fontWeight: 500,
              },
            }}
          />

          {/* Keyboard shortcut hint badge */}
          {!draft && (
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.3,
                borderRadius: 1,
                bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
                color: 'text.disabled',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              Ctrl + K
            </Box>
          )}

          {loading ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            draft.length > 0 && (
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={() => {
                  commitQuery('');
                  setDraft('');
                  inputRef.current?.focus();
                }}
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <Iconify icon="solar:close-circle-bold" width={22} />
              </IconButton>
            )
          )}
        </Box>

        {renderTypeFilter}
        {renderRecentSearches}
        {renderQuickSearches}
      </m.div>

      <Box sx={{ mt: { xs: 4, sm: 6 } }}>
        <AnimatePresence mode="wait" initial={false}>
          {showIdle ? renderIdle : loading ? renderLoading : showNotFound ? renderEmpty : renderResults}
        </AnimatePresence>
      </Box>
    </Container>
  );
}
