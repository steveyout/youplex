'use client';

import { paths } from '@/routes/paths';
import { varAlpha } from '@/theme/styles';
import { Iconify } from '@/components/iconify';
import { m, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/use-debounce';
import { searchMedia, getTrending } from '@/actions/api';
import { useRouter, useSearchParams } from '@/routes/hooks';
import { SearchNotFound } from '@/components/search-not-found';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
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
  'Interstellar',
  'Dune',
  'Inception',
  'The Batman',
  'Breaking Bad',
  'Stranger Things',
  'Attack on Titan',
  'Avengers',
];

const RESULT_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

const filterWatchable = (list) => (Array.isArray(list) ? list.filter((item) => item.media_type !== 'person') : []);

export function SearchView({ initialQuery = '' }) {
  const theme = useTheme();

  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || 'all';

  const [draft, setDraft] = useState(initialQuery || urlQuery);
  const [allResults, setAllResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trending, setTrending] = useState([]);

  const debouncedQuery = useDebounce(draft, 400);

  const pageRef = useRef(1);
  const requestSeq = useRef(0);
  const didInit = useRef(false);

  useEffect(() => {
    getTrending('all', 'day')
      .then((data) => setTrending(filterWatchable(data?.results)))
      .catch(() => setTrending([]));
  }, []);

  // Sync the input when the URL changes externally (links, back/forward).
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      return;
    }

    setDraft(urlQuery);
  }, [urlQuery]);

  const commitQuery = (query) => {
    const q = query.trim();

    if (q.length >= 3) {
      if (q !== urlQuery) {
        router.replace(`${paths.search}?q=${encodeURIComponent(q)}&type=${urlType}`, { scroll: false });
      }
      return;
    }

    if (urlQuery) {
      router.replace(`${paths.search}?type=${urlType}`, { scroll: false });
    }
  };

  // Fetch the first page whenever the debounced query settles.
  useEffect(() => {
    const q = debouncedQuery.trim();

    if (q.length < 3) {
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
  }, [debouncedQuery]);

  const visibleResults = useMemo(() => {
    if (urlType === 'all') return allResults;
    return allResults.filter((item) => item.media_type === urlType);
  }, [allResults, urlType]);

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
    const query = q.length >= 3 ? q : urlQuery;

    router.replace(`${paths.search}?q=${encodeURIComponent(query)}&type=${type}`, { scroll: false });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && visibleResults.length > 0) {
      handleNavigate(visibleResults[0]);
    }

    if (event.key === 'Escape') {
      commitQuery('');
      setDraft('');
    }
  };

  const showIdle = debouncedQuery.trim().length < 3;
  const showNotFound = !loading && !loadingMore && !showIdle && visibleResults.length === 0;
  const hasMore = totalResults > 0 && allResults.length < totalResults && !loading;

  const gridStyles = {
    display: 'grid',
    gap: { xs: 1.5, sm: 2, md: 3 },
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)',
      sm: 'repeat(3, 1fr)',
      md: 'repeat(4, 1fr)',
      lg: 'repeat(5, 1fr)',
    },
  };

  const renderTrendingRow = (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        pb: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {trending.map((item, index) => (
        <Box key={item.id} sx={{ width: 150, flexShrink: 0, scrollSnapAlign: 'start' }}>
          <PostItem post={item} index={index} />
        </Box>
      ))}
    </Box>
  );

  const renderTypeFilter = (
    <Stack direction="row" spacing={1} sx={{ mt: { xs: 3, sm: 4 } }}>
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
              px: 2.5,
              py: 0.75,
              borderRadius: 999,
              cursor: 'pointer',
              fontWeight: active ? 700 : 600,
              color: active ? 'common.white' : 'text.secondary',
              bgcolor: active
                ? 'primary.main'
                : varAlpha(theme.vars.palette.background.paperChannel, 0.3),
              border: '1px solid',
              borderColor: active
                ? 'primary.main'
                : varAlpha(theme.vars.palette.grey['500Channel'], 0.2),
              transition: 'all 0.25s ease',
              '&:hover': {
                color: active ? 'common.white' : 'primary.main',
                borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.6),
                transform: 'translateY(-2px)',
              },
            }}
          >
            {type.label}
          </Box>
        );
      })}
    </Stack>
  );

  const renderQuickSearches = (
    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2.5 }}>
      {QUICK_SEARCHES.map((term) => (
        <Chip
          key={term}
          label={term}
          clickable
          onClick={() => {
            setDraft(term);
            commitQuery(term);
          }}
          sx={{
            fontWeight: 600,
            borderRadius: 999,
            border: '1px solid',
            borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.2),
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.3),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'all 0.25s ease',
            '&:hover': {
              borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.6),
              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.14),
              color: 'primary.main',
              transform: 'translateY(-2px)',
            },
          }}
        />
      ))}
    </Stack>
  );

  const renderIdle = (
    <m.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {trending.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: motionEase }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
            <Box
              sx={{
                width: 6,
                height: 22,
                borderRadius: 999,
                background: (t) =>
                  `linear-gradient(180deg, ${t.vars.palette.primary.light}, ${t.vars.palette.primary.main})`,
                boxShadow: (t) => `0 0 16px ${varAlpha(t.vars.palette.primary.mainChannel, 0.55)}`,
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Trending now
            </Typography>
          </Stack>

          {renderTrendingRow}
        </m.div>
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
      <SearchNotFound query={debouncedQuery.trim()} sx={{ py: 12 }} />
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Results
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {visibleResults.length} {visibleResults.length === 1 ? 'result' : 'results'} found
        </Typography>
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
            variant="text"
            color="primary"
            disabled={loadingMore}
            onClick={handleLoadMore}
            startIcon={loadingMore ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Iconify icon="solar:alt-arrow-down-bold" />
            )}
            sx={{
              px: 4,
              py: 1.25,
              borderRadius: 999,
              fontWeight: 700,
              border: '1px solid',
              borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.25),
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </Stack>
      )}
    </m.div>
  );

  return (
    <Container sx={{ maxWidth: 'lg', py: { xs: 4, md: 7 } }}>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: motionEase }}
      >
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Search
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Explore movies, TV shows and anime across the whole library.
        </Typography>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: motionEase }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.25, sm: 1.75 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.2),
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.45),
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: `0 24px 48px -24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.4)}`,
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            '&:focus-within': {
              borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.6),
              boxShadow: `0 24px 48px -20px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.5)}`,
            },
          }}
        >
          <Iconify icon="eva:search-fill" width={26} sx={{ color: 'text.disabled' }} />

          <InputBase
            fullWidth
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, series, anime..."
            inputProps={{ sx: { typography: { xs: 'h6', sm: 'h5' } } }}
          />

          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            draft.length > 0 && (
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={() => {
                  commitQuery('');
                  setDraft('');
                }}
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <Iconify icon="solar:close-circle-bold" width={24} />
              </IconButton>
            )
          )}
        </Box>

        {renderTypeFilter}
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