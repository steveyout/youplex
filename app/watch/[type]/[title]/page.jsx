'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from '@/routes/paths';
import { fDate } from '@/utils/format-time';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { PostItem } from '@/sections/movies/post-item';
import { isContentDmcaBlocked } from '@/lib/dmca';
import { DmcaNotice } from '@/components/dmca/dmca-notice';
import {
  getMovieOrShow,
  getRecommendations,
  getSeasonDetails,
  getMovies,
  getTrending,
  searchMedia,
} from '@/actions/api';

// ----------------------------------------------------------------------

function cleanSlugTitle(slug) {
  if (!slug) return '';
  try {
    const decoded = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim();
    return decoded.replace(/\b\w/g, (c) => c.toUpperCase());
  } catch (e) {
    return slug;
  }
}

function formatCurrency(amount) {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatVoteCount(count) {
  if (!count) return null;
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k reviews`;
  }
  return `${count} reviews`;
}

// ----------------------------------------------------------------------

export default function WatchPage() {
  const { type, title } = useParams();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const season = searchParams.get('season') || searchParams.get('sn');
  const episode = searchParams.get('episode') || searchParams.get('ep');

  const isDirectlyBlocked = useMemo(
    () => isContentDmcaBlocked({ id, title, type, pathname: `/watch/${type}/${title}` }),
    [id, title, type]
  );
  const [isBlocked, setIsBlocked] = useState(isDirectlyBlocked);

  const [movieOrShow, setMovieOrShow] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [similarTitles, setSimilarTitles] = useState([]);
  const [isLoading, setIsLoading] = useState(!isDirectlyBlocked);
  const [error, setError] = useState(null);

  // Immediately scroll to top when user navigates or route params change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [type, title, id]);

  // Ensure view stays at top once async title details finish loading
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [isLoading]);


  useEffect(() => {
    let active = true;

    if (isDirectlyBlocked) {
      setIsBlocked(true);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError(null);

    const resolveAndLoad = async () => {
      let resolvedId = id;
      if (!resolvedId && title) {
        try {
          const cleanQuery = decodeURIComponent(title).replace(/[-_]+/g, ' ').trim();
          const searchRes = await searchMedia(cleanQuery);
          const match =
            searchRes?.results?.find((item) => {
              const mType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
              return mType === type || type === 'all';
            }) || searchRes?.results?.[0];
          if (match?.id) resolvedId = match.id;
        } catch (searchErr) {
          console.warn('Auto search recovery failed:', searchErr);
        }
      }

      if (isContentDmcaBlocked({ id: resolvedId, title, type, pathname: `/watch/${type}/${title}` })) {
        if (active) {
          setIsBlocked(true);
          setIsLoading(false);
        }
        return;
      }

      if (!resolvedId) {
        throw new Error('Movie or TV show ID is missing or not found.');
      }

      const [movieData, recData] = await Promise.allSettled([
        getMovieOrShow(type, resolvedId),
        getRecommendations(type, resolvedId),
      ]);

      if (!active) return;

      if (movieData.status === 'fulfilled' && movieData.value) {
        setMovieOrShow(movieData.value);
        setSimilarTitles(movieData.value.similar || []);

        let recs = [];
        if (recData.status === 'fulfilled' && recData.value?.length) {
          recs = recData.value;
        } else if (movieData.value.recommendations?.length) {
          recs = movieData.value.recommendations;
        }

        // If recommendations are fewer than 6, backfill with similar or trending
        if (recs.length < 6) {
          try {
            const fallbackData = await (type === 'tv'
              ? getTrending('tv', 'day')
              : getTrending('movie', 'day'));
            const fallbackItems = fallbackData?.results || [];
            const merged = [...recs, ...fallbackItems].filter(
              (item, index, self) =>
                item.id !== movieData.value.id &&
                index === self.findIndex((i) => i.id === item.id)
            );
            recs = merged;
          } catch (e) {
            // Keep what we have
          }
        }
        setRecommendations(recs);
      } else {
        throw new Error(movieData.reason?.message || 'Unable to load details for this title.');
      }
    };

    resolveAndLoad()
      .catch((err) => {
        if (active) setError(err?.message || 'Something went wrong while loading this title.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [type, id, season, episode, title]);

  if (isDirectlyBlocked || isBlocked) {
    return <DmcaNotice title={title} type={type} />;
  }

  if (isLoading) return <WatchSkeleton />;

  if (error || !movieOrShow) return <WatchError error={error} title={title} />;

  const firstSeason = movieOrShow.seasons?.find((item) => item.season_number > 0);
  const selectedSeason = season || (type === 'tv' ? String(firstSeason?.season_number || 1) : '');
  const selectedEpisode = episode || (type === 'tv' ? '1' : '');
  const params = new URLSearchParams({ id: id || movieOrShow.id || '' });
  if (selectedSeason) params.set('season', selectedSeason);
  if (selectedEpisode && type === 'tv') params.set('episode', selectedEpisode);
  const playPath = `/watch/${type}/${title}/play?${params.toString()}`;

  return (
    <WatchContent
      movieOrShow={movieOrShow}
      type={type}
      id={id || movieOrShow.id}
      title={title}
      playPath={playPath}
      recommendations={recommendations}
      similarTitles={similarTitles}
    />
  );
}

// ----------------------------------------------------------------------

function WatchSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center">
          <Skeleton
            variant="rounded"
            sx={{ width: { xs: 200, sm: 260, md: 300 }, height: { xs: 300, sm: 380, md: 450 }, borderRadius: 3 }}
          />
          <Stack spacing={2} sx={{ width: 1 }}>
            <Skeleton width="20%" height={32} />
            <Skeleton width="65%" height={64} />
            <Skeleton width="40%" height={28} />
            <Skeleton width="100%" height={80} />
            <Stack direction="row" spacing={1.5}>
              <Skeleton width={140} height={48} variant="rounded" />
              <Skeleton width={120} height={48} variant="rounded" />
            </Stack>
          </Stack>
        </Stack>
        <Skeleton variant="rounded" sx={{ width: 1, height: 280, borderRadius: 3 }} />
      </Stack>
    </Container>
  );
}

// ----------------------------------------------------------------------

function WatchError({ error, title }) {
  return (
    <Container sx={{ py: 14, display: 'grid', placeItems: 'center' }}>
      <Stack
        alignItems="center"
        spacing={2.5}
        textAlign="center"
        sx={{
          maxWidth: 480,
          p: 4,
          borderRadius: 3,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
          border: (t) => `1px solid ${alpha(t.palette.divider, 0.15)}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette.error.main, 0.12),
            color: 'error.main',
          }}
        >
          <Iconify icon="solar:shield-warning-bold" width={32} />
        </Box>
        <Typography variant="h5">Could Not Load This Title</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          {error || `Unable to locate details for "${cleanSlugTitle(title)}". Please check the URL or try searching again.`}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            href={paths.movies}
            startIcon={<Iconify icon="solar:clapperboard-play-bold" width={18} />}
          >
            Browse Movies
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}

// ----------------------------------------------------------------------

function WatchContent({
  movieOrShow,
  type,
  id,
  title,
  playPath,
  recommendations = [],
  similarTitles = [],
}) {
  const router = useRouter();
  const theme = useTheme();
  const isTv = type === 'tv';
  const displayTitle = movieOrShow.title || movieOrShow.name || '';
  const releaseDate = movieOrShow.release_date || movieOrShow.first_air_date;
  const rating = movieOrShow.vote_average || 0;
  const voteCount = movieOrShow.vote_count || 0;
  const { runtime } = movieOrShow;
  const runtimeLabel = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : null;
  const genres = movieOrShow.genres || [];
  const cast = movieOrShow.credits?.cast?.slice(0, 12) || movieOrShow.cast?.slice(0, 12) || [];
  const crew = movieOrShow.credits?.crew || movieOrShow.crew || [];
  const hasCredits = cast.length > 0;

  // Key crew members
  const director = crew.find((c) => c.job === 'Director')?.name;
  const writers = crew
    .filter((c) => c.job === 'Screenplay' || c.job === 'Writer')
    .slice(0, 2)
    .map((c) => c.name)
    .join(', ');
  const creators = movieOrShow.created_by?.map((c) => c.name).join(', ');

  // Images
  const backdrop = movieOrShow.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movieOrShow.backdrop_path}`
    : movieOrShow.backdrop || '';
  const poster = movieOrShow.poster_path
    ? `https://image.tmdb.org/t/p/w500${movieOrShow.poster_path}`
    : movieOrShow.poster || '';

  // Trailer
  const [trailerOpen, setTrailerOpen] = useState(false);
  const trailer = useMemo(() => {
    const vids = movieOrShow.videos?.results || [];
    return (
      vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
      vids.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
      vids.find((v) => v.site === 'YouTube') ||
      null
    );
  }, [movieOrShow]);

  // TV Seasons & Episodes state
  const seasons = useMemo(
    () => movieOrShow.seasons?.filter((s) => s.season_number > 0) || [],
    [movieOrShow]
  );
  const [activeSeasonNum, setActiveSeasonNum] = useState(
    seasons[0]?.season_number || 1
  );
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (!isTv || !id) return;
    let active = true;
    setLoadingEpisodes(true);

    getSeasonDetails(id, activeSeasonNum)
      .then((data) => {
        if (active && data?.episodes) {
          setSeasonEpisodes(data.episodes);
        }
      })
      .catch((err) => console.warn('Failed to load season episodes:', err))
      .finally(() => {
        if (active) setLoadingEpisodes(false);
      });

    return () => {
      active = false;
    };
  }, [isTv, id, activeSeasonNum]);

  // Recommendations tab
  const [recTab, setRecTab] = useState('recommended');
  const [isNavigating, setIsNavigating] = useState(false);

  const handleWatchClick = useCallback(
    (targetPath) => {
      setIsNavigating(true);
      router.push(targetPath || playPath);
    },
    [router, playPath]
  );

  const displayedRecs = useMemo(() => {
    if (recTab === 'similar' && similarTitles.length > 0) {
      return similarTitles.slice(0, 18);
    }
    return recommendations.slice(0, 18);
  }, [recTab, recommendations, similarTitles]);

  const handleShare = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  }, []);

  // Ensure details page always starts from top when mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [id, title]);



  const safeSlug = title || cleanSlugTitle(displayTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'show';

  return (
    <>
      {/* Cinematic Ambient Hero Header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'common.black',
          minHeight: { xs: 520, md: 620 },
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        {/* Background Backdrop Image */}
        {backdrop && (
          <Box
            component="img"
            src={backdrop}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
              objectPosition: 'center 20%',
              opacity: 0.38,
              filter: 'saturate(1.2)',
              transform: 'scale(1.02)',
              transition: 'transform 8s ease-out',
            }}
          />
        )}

        {/* Ambient Gradient Overlays for Cinematic Readability */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(5, 5, 5, 0.45) 0%, rgba(5, 5, 5, 0.85) 60%, #080808 100%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 40%, rgba(20, 20, 30, 0.4) 0%, rgba(5, 5, 5, 0.95) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(8, 8, 8, 0.95) 0%, rgba(8, 8, 8, 0.6) 45%, rgba(8, 8, 8, 0.2) 100%)',
          }}
        />

        <Container
          maxWidth="xl"
          sx={{
            position: 'relative',
            zIndex: 1,
            pt: { xs: 6, md: 10 },
            pb: { xs: 5, md: 7 },
          }}
        >
          {/* Breadcrumb Navigation */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: { xs: 2.5, md: 3.5 }, color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.85rem' }}
          >
            <Button
              size="small"
              component={RouterLink}
              href="/"
              startIcon={<Iconify icon="solar:home-2-bold" width={15} sx={{ color: '#ffffff !important' }} />}
              sx={{ color: '#ffffff', px: 1, minWidth: 0, textTransform: 'none', fontWeight: 600 }}
            >
              Home
            </Button>
            <Iconify icon="solar:alt-arrow-right-line-duotone" width={14} sx={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <Button
              size="small"
              component={RouterLink}
              href={isTv ? paths.tv : paths.movies}
              sx={{ color: '#ffffff', px: 1, minWidth: 0, textTransform: 'none', fontWeight: 600 }}
            >
              {isTv ? 'TV Series' : 'Movies'}
            </Button>
            <Iconify icon="solar:alt-arrow-right-line-duotone" width={14} sx={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <Typography
              variant="caption"
              sx={{
                color: 'primary.light',
                fontWeight: 700,
                maxWidth: 280,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayTitle}
            </Typography>
          </Stack>

          {/* Hero Main Content */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 3, md: 5 }}
            alignItems={{ xs: 'center', md: 'flex-end' }}
          >
            {/* Poster Card */}
            {poster && (
              <Box
                sx={{
                  width: { xs: 180, sm: 220, md: 280 },
                  flexShrink: 0,
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: 'grey.950',
                  boxShadow: `0 30px 60px -15px ${alpha('#000000', 0.9)}`,
                  border: `1px solid rgba(255, 255, 255, 0.22)`,
                  transform: 'translateY(0)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 36px 70px -15px ${alpha(theme.palette.primary.main, 0.35)}`,
                  },
                }}
              >
                <Box
                  component="img"
                  src={poster}
                  alt={displayTitle}
                  sx={{ width: 1, height: 'auto', display: 'block', aspectRatio: '2/3', objectFit: 'cover' }}
                />
                {/* High Contrast 4K / HD Quality Pill */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    px: 1.2,
                    py: 0.4,
                    borderRadius: 1,
                    bgcolor: 'rgba(5, 7, 10, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0, 229, 255, 0.75)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    color: '#00E5FF',
                  }}
                >
                  4K ULTRA HD
                </Box>
              </Box>
            )}

            {/* Title, Badges, & Primary Controls */}
            <Stack spacing={2.5} sx={{ width: 1, color: 'common.white' }}>
              {/* Media Badges - High Contrast & Clearly Readable */}
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap alignItems="center">
                {/* Type Badge */}
                <Chip
                  size="small"
                  label={isTv ? 'TV Series' : 'Movie'}
                  icon={
                    <Iconify
                      icon={isTv ? 'solar:tv-bold' : 'solar:clapperboard-play-bold'}
                      width={15}
                      sx={{ color: '#ffffff !important' }}
                    />
                  }
                  sx={{
                    height: 28,
                    borderRadius: 1,
                    bgcolor: theme.palette.primary.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.45)}`,
                    '& .MuiChip-label': {
                      color: '#ffffff !important',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      px: 1,
                    },
                  }}
                />

                {/* Status Badge */}
                {movieOrShow.status && (
                  <Chip
                    size="small"
                    label={movieOrShow.status}
                    sx={{
                      height: 28,
                      borderRadius: 1,
                      bgcolor: 'rgba(16, 185, 129, 0.22)',
                      border: '1px solid rgba(52, 211, 153, 0.6)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                      '& .MuiChip-label': {
                        color: '#34D399 !important',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        px: 1,
                      },
                    }}
                  />
                )}

                {/* Age Certificate Badge */}
                <Chip
                  size="small"
                  label={movieOrShow.adult ? '18+' : 'PG-13'}
                  sx={{
                    height: 28,
                    borderRadius: 1,
                    bgcolor: 'rgba(245, 158, 11, 0.22)',
                    border: '1px solid rgba(251, 191, 36, 0.6)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                    '& .MuiChip-label': {
                      color: '#FBBF24 !important',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      px: 1,
                    },
                  }}
                />

                {/* Audio Badge */}
                <Chip
                  size="small"
                  label="5.1 Surround"
                  icon={
                    <Iconify
                      icon="solar:volume-loud-bold"
                      width={15}
                      sx={{ color: '#A5B4FC !important' }}
                    />
                  }
                  sx={{
                    height: 28,
                    borderRadius: 1,
                    bgcolor: 'rgba(99, 102, 241, 0.22)',
                    border: '1px solid rgba(165, 180, 252, 0.6)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                    '& .MuiChip-label': {
                      color: '#C7D2FE !important',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      px: 1,
                    },
                  }}
                />
              </Stack>

              {/* Title & Tagline */}
              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 32, sm: 46, md: 58 },
                    fontWeight: 900,
                    lineHeight: 1.12,
                    letterSpacing: '-0.02em',
                    textShadow: '0 4px 24px rgba(0,0,0,0.8)',
                  }}
                >
                  {displayTitle}
                </Typography>
                {movieOrShow.tagline && (
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontStyle: 'italic',
                      mt: 0.8,
                      fontWeight: 400,
                      maxWidth: 680,
                    }}
                  >
                    &ldquo;{movieOrShow.tagline}&rdquo;
                  </Typography>
                )}
              </Box>

              {/* Key Stats Row */}
              <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={{ xs: 2, sm: 3 }} useFlexGap>
                {rating > 0 && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 1.2,
                        bgcolor: 'rgba(245, 158, 11, 0.25)',
                        border: '1px solid rgba(245, 158, 11, 0.6)',
                        color: '#FBBF24',
                      }}
                    >
                      <Iconify icon="eva:star-fill" width={20} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1, color: '#FFFFFF' }}>
                        {rating.toFixed(1)}{' '}
                        <Box component="span" sx={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                          / 10
                        </Box>
                      </Typography>
                      {voteCount > 0 && (
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', fontWeight: 600 }}>
                          {formatVoteCount(voteCount)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                )}

                {releaseDate && (
                  <MetaItem
                    icon="solar:calendar-date-bold"
                    label={new Date(releaseDate).getFullYear() || fDate(releaseDate)}
                    sublabel={fDate(releaseDate)}
                  />
                )}

                {runtimeLabel && (
                  <MetaItem icon="solar:clock-circle-bold" label={runtimeLabel} sublabel="Runtime" />
                )}

                {isTv && movieOrShow.number_of_seasons > 0 && (
                  <MetaItem
                    icon="solar:layers-bold"
                    label={`${movieOrShow.number_of_seasons} Season${movieOrShow.number_of_seasons > 1 ? 's' : ''}`}
                    sublabel={
                      movieOrShow.number_of_episodes
                        ? `${movieOrShow.number_of_episodes} Episodes`
                        : undefined
                    }
                  />
                )}
              </Stack>

              {/* Genres Pills - High Contrast & Clearly Readable */}
              {genres.length > 0 && (
                <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
                  {genres.map((genre) => (
                    <Chip
                      key={genre.id}
                      size="small"
                      label={genre.name}
                      sx={{
                        height: 30,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(20, 24, 34, 0.88)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
                        transition: 'all 0.2s ease',
                        '& .MuiChip-label': {
                          color: '#FFFFFF !important',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          px: 1.2,
                        },
                        '&:hover': {
                          bgcolor: 'rgba(255, 48, 48, 0.3)',
                          borderColor: theme.palette.primary.main,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    />
                  ))}
                </Stack>
              )}

              {/* Overview snippet */}
              {movieOrShow.overview && (
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    lineHeight: 1.75,
                    maxWidth: 760,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {movieOrShow.overview}
                </Typography>
              )}

              {/* Action Buttons Row */}
              <Stack direction="row" flexWrap="wrap" spacing={1.5} alignItems="center" sx={{ pt: 1 }}>
                <Button
                  size="large"
                  variant="contained"
                  disabled={isNavigating}
                  startIcon={
                    isNavigating ? (
                      <CircularProgress size={18} thickness={4} sx={{ color: 'primary.contrastText' }} />
                    ) : (
                      <Iconify icon="solar:play-bold" width={20} />
                    )
                  }
                  onClick={() => handleWatchClick(playPath)}
                  sx={{
                    borderRadius: 2,
                    px: { xs: 3, sm: 4 },
                    py: 1.35,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    letterSpacing: 0.2,
                    textTransform: 'none',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: 'none',
                      bgcolor: 'primary.dark',
                      transform: 'translateY(-1px)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      opacity: 0.85,
                    },
                  }}
                >
                  {isNavigating ? 'Loading Stream...' : 'Watch Now'}
                </Button>

                {trailer && (
                  <Button
                    size="large"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:videocamera-record-bold" width={20} />}
                    onClick={() => setTrailerOpen(true)}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.35,
                      color: 'common.white',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      boxShadow: 'none',
                      backdropFilter: 'blur(8px)',
                      fontWeight: 700,
                      textTransform: 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.16)',
                        borderColor: 'rgba(255, 255, 255, 0.45)',
                        boxShadow: 'none',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Watch Trailer
                  </Button>
                )}

                <Tooltip title="Share this title">
                  <IconButton
                    onClick={handleShare}
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      color: 'common.white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(8px)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.22)' },
                    }}
                  >
                    <Iconify icon="solar:share-bold" width={20} />
                  </IconButton>
                </Tooltip>

                {isTv && seasons.length > 0 && (
                  <Button
                    size="medium"
                    onClick={() => {
                      const el = document.getElementById('tv-episodes-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    startIcon={<Iconify icon="solar:layers-bold" width={18} />}
                    sx={{
                      color: '#FFFFFF',
                      textTransform: 'none',
                      fontWeight: 700,
                      ml: { xs: 0, sm: 1 },
                      '&:hover': { color: 'primary.light' },
                    }}
                  >
                    Episodes ({seasons.length} Seasons)
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Official Trailer Modal */}
      {trailer && (
        <Dialog
          open={trailerOpen}
          onClose={() => setTrailerOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: '#0d0d0d',
              borderRadius: 3,
              border: `1px solid ${alpha('#ffffff', 0.15)}`,
              overflow: 'hidden',
            },
          }}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:videocamera-record-bold" width={20} sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ color: 'common.white', fontWeight: 700 }}>
                {trailer.name || `${displayTitle} Trailer`}
              </Typography>
            </Stack>
            <IconButton onClick={() => setTrailerOpen(false)} sx={{ color: 'text.secondary' }}>
              <Iconify icon="solar:close-circle-bold" width={24} />
            </IconButton>
          </Box>
          <Box sx={{ position: 'relative', width: 1, aspectRatio: '16/9', bgcolor: 'black' }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1`}
              title="Official Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </Box>
        </Dialog>
      )}

      {/* Main Details, TV Episodes & Cast Section */}
      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
        <Stack spacing={6}>
          {/* TV Seasons & Episode Explorer */}
          {isTv && seasons.length > 0 && (
            <Box id="tv-episodes-section">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                sx={{ mb: 3 }}
              >
                <SectionHeading title="Episodes" icon="solar:layers-bold" />

                {/* Season Selector Tabs */}
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', maxWidth: 1, pb: 0.5 }}>
                  {seasons.map((s) => {
                    const active = activeSeasonNum === s.season_number;
                    return (
                      <Chip
                        key={s.id || s.season_number}
                        label={`Season ${s.season_number}`}
                        clickable
                        onClick={() => setActiveSeasonNum(s.season_number)}
                        sx={{
                          height: 34,
                          borderRadius: 1.5,
                          bgcolor: active
                            ? theme.palette.primary.main
                            : alpha(theme.palette.background.paper, 0.8),
                          border: `1px solid ${
                            active ? theme.palette.primary.main : alpha(theme.palette.divider, 0.25)
                          }`,
                          boxShadow: active
                            ? `0 4px 14px ${alpha(theme.palette.primary.main, 0.45)}`
                            : '0 2px 6px rgba(0, 0, 0, 0.2)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.2s ease',
                          '& .MuiChip-label': {
                            color: active ? '#FFFFFF !important' : `${theme.palette.text.primary} !important`,
                            fontWeight: active ? 800 : 700,
                            fontSize: '0.85rem',
                            px: 1.5,
                          },
                          '&:hover': {
                            bgcolor: active
                              ? theme.palette.primary.dark
                              : alpha(theme.palette.background.paper, 1),
                            borderColor: active ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.4),
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Stack>

              {/* Episodes Grid */}
              {loadingEpisodes ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" sx={{ height: 180, borderRadius: 2 }} />
                  ))}
                </Box>
              ) : seasonEpisodes.length > 0 ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)',
                    },
                    gap: 2.5,
                  }}
                >
                  {seasonEpisodes.map((ep) => {
                    const epPlayPath = `/watch/tv/${safeSlug}/play?id=${id}&season=${activeSeasonNum}&episode=${ep.episode_number}`;
                    const stillImg = ep.still_path
                      ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
                      : backdrop || poster;

                    return (
                      <Card
                        key={ep.id || ep.episode_number}
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: alpha(theme.palette.background.paper, 0.6),
                          border: `1px solid ${alpha(theme.palette.divider, 0.16)}`,
                          backdropFilter: 'blur(10px)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.25s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                            boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.4)}`,
                          },
                        }}
                      >
                        <CardActionArea onClick={() => handleWatchClick(epPlayPath)}>
                          <Box sx={{ position: 'relative', width: 1, aspectRatio: '16/9', bgcolor: 'grey.900' }}>
                            {stillImg && (
                              <CardMedia
                                component="img"
                                image={stillImg}
                                alt={ep.name}
                                sx={{ width: 1, height: 1, objectFit: 'cover' }}
                              />
                            )}
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                background:
                                  'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)',
                              }}
                            />
                            {/* High-contrast Episode number badge */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                px: 1.2,
                                py: 0.3,
                                borderRadius: 1,
                                bgcolor: 'rgba(0, 0, 0, 0.88)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(8px)',
                                color: '#FFFFFF',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                              }}
                            >
                              EP {ep.episode_number}
                            </Box>
                            {ep.runtime && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 8,
                                  right: 8,
                                  px: 1,
                                  py: 0.3,
                                  borderRadius: 0.8,
                                  bgcolor: 'rgba(0, 0, 0, 0.88)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#FFFFFF',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                {ep.runtime}m
                              </Box>
                            )}
                            {/* Hover Play Icon */}
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                bgcolor: alpha('#000000', 0.4),
                                transition: 'opacity 0.2s ease',
                                '&:hover': { opacity: 1 },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: '50%',
                                  bgcolor: 'primary.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'common.white',
                                  boxShadow: `0 0 20px ${theme.palette.primary.main}`,
                                }}
                              >
                                <Iconify icon="solar:play-bold" width={22} />
                              </Box>
                            </Box>
                          </Box>

                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, mb: 0.5 }}>
                              {ep.name || `Episode ${ep.episode_number}`}
                            </Typography>
                            {ep.air_date && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 600 }}>
                                {fDate(ep.air_date)}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                lineHeight: 1.6,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {ep.overview || 'No overview available for this episode.'}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No episode information found for Season {activeSeasonNum}.
                </Typography>
              )}
            </Box>
          )}

          {/* Overview & Key Specs */}
          <Box>
            <SectionHeading title="Storyline & Details" icon="solar:document-text-bold" />
            <Stack spacing={3}>
              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.9, maxWidth: 900, fontSize: '1.05rem' }}>
                {movieOrShow.overview || 'No detailed synopsis available.'}
              </Typography>

              {/* Creators & Directors badges - High Contrast Spec Cards */}
              <Stack direction="row" flexWrap="wrap" spacing={2} useFlexGap>
                {director && (
                  <SpecCard label="Director" value={director} theme={theme} />
                )}
                {creators && (
                  <SpecCard label="Creator" value={creators} theme={theme} />
                )}
                {writers && (
                  <SpecCard label="Writers" value={writers} theme={theme} />
                )}
                {movieOrShow.original_language && (
                  <SpecCard label="Language" value={movieOrShow.original_language.toUpperCase()} theme={theme} />
                )}
                {formatCurrency(movieOrShow.budget) && (
                  <SpecCard label="Budget" value={formatCurrency(movieOrShow.budget)} theme={theme} />
                )}
                {formatCurrency(movieOrShow.revenue) && (
                  <SpecCard label="Box Office" value={formatCurrency(movieOrShow.revenue)} theme={theme} />
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Top Cast Section - Mobile Optimized Touch Scroll */}
          {hasCredits && (
            <Box sx={{ width: 1, overflow: 'hidden' }}>
              <SectionHeading title="Top Cast" icon="solar:users-group-two-rounded-bold" />
              <Box
                sx={{
                  display: { xs: 'flex', md: 'grid' },
                  overflowX: { xs: 'auto', md: 'visible' },
                  overflowY: 'hidden',
                  scrollSnapType: { xs: 'x mandatory', md: 'none' },
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  pb: { xs: 1.5, md: 0 },
                  pt: 0.5,
                  gridTemplateColumns: {
                    md: 'repeat(6, 1fr)',
                    lg: 'repeat(8, 1fr)',
                  },
                  gap: { xs: 1.5, sm: 2 },
                  '& > *': {
                    flexShrink: { xs: 0, md: 1 },
                    scrollSnapAlign: { xs: 'start', md: 'none' },
                    width: { xs: 105, sm: 120, md: 'auto' },
                  },
                }}
              >
                {cast.map((actor) => (
                  <Stack
                    key={actor.id}
                    alignItems="center"
                    spacing={1}
                    sx={{
                      p: { xs: 1.25, md: 1.5 },
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
                      border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                      backdropFilter: 'blur(8px)',
                      textAlign: 'center',
                      transition: 'all 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={
                        actor.profile_path
                          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                          : '/assets/placeholder.jpg'
                      }
                      alt={actor.name}
                      sx={{
                        width: { xs: 60, sm: 70, md: 80 },
                        height: { xs: 60, sm: 70, md: 80 },
                        borderRadius: '50%',
                        objectFit: 'cover',
                        bgcolor: 'background.neutral',
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                      }}
                    />
                    <Box sx={{ width: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{ fontWeight: 700, fontSize: { xs: '0.78rem', sm: '0.82rem' } }}
                      >
                        {actor.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          display: 'block',
                          fontWeight: 500,
                        }}
                      >
                        {actor.character || 'Cast'}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
            </Box>
          )}

          {/* Recommended Movies / Shows Section */}
          {displayedRecs.length > 0 && (
            <Box sx={{ pt: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                sx={{ mb: 3 }}
              >
                <SectionHeading
                  title={isTv ? 'Recommended TV Series' : 'Recommended Movies'}
                  icon="solar:magic-stick-3-bold"
                />

                {similarTitles.length > 0 && (
                  <Tabs
                    value={recTab}
                    onChange={(e, val) => setRecTab(val)}
                    sx={{
                      minHeight: 36,
                      '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: 1 },
                    }}
                  >
                    <Tab
                      value="recommended"
                      label="Recommended"
                      sx={{ minHeight: 36, px: 2, fontSize: '0.85rem', fontWeight: 700 }}
                    />
                    <Tab
                      value="similar"
                      label="More Like This"
                      sx={{ minHeight: 36, px: 2, fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </Tabs>
                )}
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(4, 1fr)',
                    lg: 'repeat(6, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {displayedRecs.map((post, index) => (
                  <PostItem key={post.id} post={post} index={index} />
                ))}
              </Box>
            </Box>
          )}
        </Stack>
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

function SpecCard({ label, value, theme }) {
  return (
    <Box
      sx={{
        p: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.65),
        border: `1px solid ${alpha(theme.palette.divider, 0.16)}`,
        backdropFilter: 'blur(8px)',
        minWidth: 120,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.primary.main,
          display: 'block',
          fontWeight: 800,
          fontSize: '0.68rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mb: 0.3,
        }}
      >
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

function MetaItem({ icon, label, sublabel }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 1.2,
          bgcolor: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Iconify icon={icon} width={18} sx={{ color: '#FFFFFF' }} />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1, color: '#FFFFFF' }}>
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.75)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>
            {sublabel}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

function SectionHeading({ title, icon }) {
  const theme = useTheme();

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
      {icon && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
          }}
        >
          <Iconify icon={icon} width={18} />
        </Box>
      )}
      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
    </Stack>
  );
}
