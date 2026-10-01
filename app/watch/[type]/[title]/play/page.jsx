'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import CardActionArea from '@mui/material/CardActionArea';

import { Player } from '@/components/player';
import { Iconify } from '@/components/iconify';
import { CLIENT_SCRAPER_CONFIG } from '@/lib/scrapers/provider-config';
import { getMovieOrShow, getPlaySources, getSubtitles, getSeasonDetails, searchMedia } from '@/actions/api';

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

export default function PlayPage() {
  const theme = useTheme();
  const { type, title } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  const [movieOrShow, setMovieOrShow] = useState(null);
  const [directSources, setDirectSources] = useState({ sources: [], subtitles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);
  const [openSubtitles, setOpenSubtitles] = useState([]);
  const [error, setError] = useState(null);

  // Live scrape feedback & auto-switching progress
  const [scrapeFeedback, setScrapeFeedback] = useState({
    activeProviderId: null,
    activeProviderName: null,
    status: 'idle', // 'idle' | 'pending' | 'switching' | 'success' | 'failure'
    percentage: 0,
    message: '',
    attemptedProviders: [],
  });

  const handleScrapeProgress = useCallback((evt) => {
    if (!evt) return;

    if (evt.type === 'start') {
      setScrapeFeedback((prev) => ({
        ...prev,
        activeProviderId: evt.provider,
        activeProviderName: evt.label || evt.provider,
        status: 'pending',
        percentage: Math.max(prev.percentage, evt.percentage || 20),
        message: `Connecting to ${evt.label || evt.provider}...`,
      }));
    } else if (evt.type === 'update') {
      setScrapeFeedback((prev) => ({
        ...prev,
        activeProviderId: evt.provider || prev.activeProviderId,
        activeProviderName: evt.label || prev.activeProviderName,
        status: evt.status,
        percentage: evt.percentage ?? prev.percentage,
        message:
          evt.status === 'notfound' || evt.status === 'failure'
            ? `${evt.label || evt.provider || 'Provider'} unavailable, switching...`
            : `Resolving stream on ${evt.label || prev.activeProviderName}...`,
      }));
    } else if (evt.type === 'switching') {
      setScrapeFeedback((prev) => ({
        ...prev,
        status: 'switching',
        percentage: Math.min(prev.percentage + 15, 95),
        message: evt.message || `Switching to next provider...`,
        attemptedProviders: evt.provider
          ? [...new Set([...prev.attemptedProviders, evt.provider])]
          : prev.attemptedProviders,
      }));
    } else if (evt.type === 'success') {
      const cleanName = (evt.label || evt.providerLabel || evt.provider || '')
        .replace(/\s*\([^)]*\)/g, '')
        .trim();
      setScrapeFeedback((prev) => ({
        ...prev,
        activeProviderId: evt.provider,
        activeProviderName: cleanName,
        status: 'success',
        percentage: 100,
        message: `Ready on ${cleanName}!`,
      }));
    } else if (evt.type === 'failure') {
      setScrapeFeedback((prev) => ({
        ...prev,
        status: 'failure',
        message: evt.error || 'All providers failed to return a stream',
      }));
    }
  }, []);

  // TV Episode Drawer and Season Episodes state
  const [episodesDrawerOpen, setEpisodesDrawerOpen] = useState(false);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [seasonEpisodesLoading, setSeasonEpisodesLoading] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setSourcesLoading(true);
    setSourcesError(null);
    setError(null);
    setScrapeFeedback({
      activeProviderId: null,
      activeProviderName: null,
      status: 'pending',
      percentage: 10,
      message: 'Resolving title information...',
      attemptedProviders: [],
    });

    const resolveDetails = async () => {
      let resolvedId = id;
      if (!resolvedId && title) {
        try {
          const cleanQuery = decodeURIComponent(title).replace(/[-_]+/g, ' ').trim();
          const searchRes = await searchMedia(cleanQuery);
          const match = searchRes?.results?.find((item) => {
            const mType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            return mType === type || type === 'all';
          }) || searchRes?.results?.[0];
          if (match?.id) resolvedId = match.id;
        } catch (searchErr) {
          console.warn('Auto search recovery failed:', searchErr);
        }
      }

      if (!resolvedId) {
        throw new Error('Movie or TV show ID is missing or not found.');
      }

      const currentSeasonNum = Number(season || 1);
      const currentEpisodeNum = Number(episode || 1);
      return getMovieOrShow(type, resolvedId, { season: currentSeasonNum, episode: currentEpisodeNum });
    };

    resolveDetails()
      .then(async (data) => {
        if (!active) return;
        setMovieOrShow(data);
        setIsLoading(false);

        const firstSeason = data?.seasons?.find((item) => item.season_number > 0);
        const resolvedSeasonNum = Number(season || firstSeason?.season_number || 1);
        const resolvedEpisodeNum = Number(episode || 1);
        const releaseYear = (data?.release_date || data?.first_air_date)?.slice(0, 4);

        const initialPlaybackOptions = {
          title: data.title || data.name,
          year: releaseYear,
          imdbId: data.imdb_id,
          ...(type === 'tv'
            ? {
                season: resolvedSeasonNum,
                episode: resolvedEpisodeNum,
              }
            : {}),
        };

        const [sourceData, subtitleData] = await Promise.allSettled([
          getPlaySources(type, data.id || id, initialPlaybackOptions, handleScrapeProgress),
          getSubtitles(type, data.id || id, initialPlaybackOptions),
        ]);

        if (!active) return;

        const hasSources = (sourceData.value?.sources || []).length > 0;
        if (sourceData.status === 'fulfilled' && (sourceData.value?.success || hasSources)) {
          setDirectSources(sourceData.value);
          setSourcesError(null);
        } else {
          setDirectSources({ sources: [], subtitles: [] });
          setSourcesError(
            sourceData.status === 'rejected'
              ? sourceData.reason?.message || 'The providers are taking longer than usual to respond.'
              : 'The providers are taking longer than usual to respond.'
          );
        }

        setOpenSubtitles(
          subtitleData.status === 'fulfilled'
            ? Array.isArray(subtitleData.value)
              ? subtitleData.value
              : subtitleData.value?.subtitles || []
            : []
        );
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Something went wrong while loading this title.');
          setDirectSources({ sources: [], subtitles: [] });
          setOpenSubtitles([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setSourcesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [type, id, season, episode, handleScrapeProgress]);

  const resolvedSeason = Number(
    season || movieOrShow?.seasons?.find((item) => item.season_number > 0)?.season_number || 1
  );
  const resolvedEpisode = Number(episode || 1);
  const playbackOptions = useMemo(() => {
    const releaseYear = (movieOrShow?.release_date || movieOrShow?.first_air_date)?.slice(0, 4);
    const mediaTitle = movieOrShow?.title || movieOrShow?.name;
    const currentEpisodeObj = seasonEpisodes.find((ep) => ep.episode_number === resolvedEpisode);
    const currentSeasonObj = movieOrShow?.seasons?.find((item) => item.season_number === resolvedSeason);

    return {
      title: mediaTitle,
      year: releaseYear,
      releaseYear,
      imdbId: movieOrShow?.imdb_id,
      ...(type === 'tv'
        ? {
            season: resolvedSeason,
            episode: resolvedEpisode,
            seasonId: currentSeasonObj?.id,
            episodeId: currentEpisodeObj?.id,
          }
        : {}),
    };
  }, [movieOrShow, seasonEpisodes, resolvedSeason, resolvedEpisode, type]);

  // Fetch season episodes for TV
  useEffect(() => {
    let active = true;
    if (type !== 'tv') return undefined;

    const targetId = movieOrShow?.id || id;
    if (!targetId) return undefined;

    setSeasonEpisodesLoading(true);
    getSeasonDetails(targetId, resolvedSeason)
      .then((data) => {
        if (active && data?.episodes) {
          setSeasonEpisodes(data.episodes);
        }
      })
      .catch((err) => console.warn('Could not fetch season episode details:', err))
      .finally(() => {
        if (active) setSeasonEpisodesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [type, id, movieOrShow?.id, resolvedSeason]);

  const selectExtractor = useCallback(
    async (providerId) => {
      try {
        setSourcesLoading(true);
        setSourcesError(null);
        const opts = {
          provider: providerId,
          ...playbackOptions,
        };
        const targetId = id || movieOrShow?.id;
        const data = await getPlaySources(type, targetId, opts, handleScrapeProgress);
        if (data?.success || (data?.sources || []).length > 0) {
          setDirectSources(data);
          return true;
        }
        setSourcesError('This provider did not return a stream yet.');
        return false;
      } catch (err) {
        setSourcesError(err?.message || 'This provider is taking longer than usual to respond.');
        return false;
      } finally {
        setSourcesLoading(false);
      }
    },
    [type, id, playbackOptions, handleScrapeProgress]
  );

  const retrySources = useCallback(
    async () => {
      setSourcesLoading(true);
      setSourcesError(null);

      try {
        const opts = {
          ...playbackOptions,
        };
        const targetId = id || movieOrShow?.id;
        const data = await getPlaySources(type, targetId, opts, handleScrapeProgress);
        if (!data?.success) throw new Error('The providers did not return a stream yet.');
        setDirectSources(data);
      } catch (err) {
        setSourcesError(err?.message || 'The providers are taking longer than usual to respond.');
      } finally {
        setSourcesLoading(false);
      }
    },
    [type, id, playbackOptions, handleScrapeProgress]
  );

  const backToWatch = () => {
    const params = new URLSearchParams({ id: id || '' });
    if (type === 'tv') {
      params.set('season', String(resolvedSeason));
      params.set('episode', String(resolvedEpisode));
    }
    router.push(`/watch/${type}/${title}?${params.toString()}`);
  };

  const parsedFallbackTitle = cleanSlugTitle(title);
  const displayTitle = movieOrShow?.title || movieOrShow?.name || parsedFallbackTitle || '';
  const seasons = movieOrShow?.seasons?.filter((item) => item.season_number > 0) || [];
  const selectedSeason = resolvedSeason;
  const selectedEpisode = resolvedEpisode;
  const currentEpisodeData = seasonEpisodes.find((ep) => ep.episode_number === selectedEpisode);
  const episodeStillUrl = currentEpisodeData?.still_path
    ? `https://image.tmdb.org/t/p/w780${currentEpisodeData.still_path}`
    : null;
  const backdropUrl =
    episodeStillUrl ||
    (movieOrShow?.backdrop_path ? `https://image.tmdb.org/t/p/original${movieOrShow.backdrop_path}` : '') ||
    movieOrShow?.backdrop ||
    '';
  const currentSeason = seasons.find((item) => item.season_number === selectedSeason);
  const episodeCount = currentSeason?.episode_count || seasonEpisodes.length || 0;

  const combinedCast = useMemo(() => {
    const mainCast = movieOrShow?.cast || movieOrShow?.credits?.cast || [];
    const guestStars = currentEpisodeData?.guest_stars || [];
    const seen = new Set();
    const result = [];
    for (const person of [...guestStars, ...mainCast]) {
      if (person?.id && !seen.has(person.id)) {
        seen.add(person.id);
        result.push(person);
      }
    }
    return result;
  }, [movieOrShow?.cast, movieOrShow?.credits?.cast, currentEpisodeData?.guest_stars]);

  const navigateToEpisode = useCallback((nextSeason, nextEpisode) => {
    setIsLoading(true);
    setSourcesLoading(true);
    setSourcesError(null);
    setDirectSources({ sources: [], subtitles: [] });
    const params = new URLSearchParams({ id: id || movieOrShow?.id || '' });
    params.set('season', String(nextSeason));
    params.set('episode', String(nextEpisode));
    router.push(`/watch/${type}/${title}/play?${params.toString()}`);
  }, [id, movieOrShow?.id, type, title, router]);

  const hasNextEpisode = useMemo(() => {
    if (type !== 'tv') return false;
    const currentEpNum = Number(selectedEpisode);
    if (seasonEpisodes && seasonEpisodes.length > 0) {
      return seasonEpisodes.some((ep) => Number(ep.episode_number) === currentEpNum + 1);
    }
    return episodeCount > 0 && currentEpNum < episodeCount;
  }, [type, selectedEpisode, seasonEpisodes, episodeCount]);

  const handleNextEpisode = useCallback(() => {
    if (type !== 'tv') return;
    const currentEpNum = Number(selectedEpisode);
    const nextEpNum = currentEpNum + 1;
    navigateToEpisode(selectedSeason, nextEpNum);
  }, [type, selectedSeason, selectedEpisode, navigateToEpisode]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050709', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar with Title and Back Button */}
      <Box
        sx={{
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 4 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
          bgcolor: alpha('#050709', 0.95),
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            size="small"
            variant="text"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            onClick={backToWatch}
            sx={{
              color: 'common.white',
              fontSize: { xs: 13, sm: 14 },
              px: { xs: 1, sm: 1.5 },
              '&:hover': { bgcolor: alpha('#ffffff', 0.08) },
            }}
          >
            Back
          </Button>

          <Stack spacing={0.25}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{
                color: 'common.white',
                fontWeight: 600,
                maxWidth: { xs: 160, sm: 300, md: 500 },
                fontSize: { xs: 13, sm: 15 },
              }}
            >
              {displayTitle}
            </Typography>
            {type === 'tv' && (
              <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.6), fontSize: { xs: 11, sm: 12 } }}>
                S{selectedSeason} E{selectedEpisode}
                {currentEpisodeData?.name ? ` • ${currentEpisodeData.name}` : ''}
              </Typography>
            )}
          </Stack>
        </Stack>

        {/* TV Quick Season / Episode Controls */}
        {type === 'tv' && seasons.length > 0 && (
          <Stack direction="row" spacing={{ xs: 0.75, sm: 1.5 }} alignItems="center">
            {/* Season Selector */}
            <Select
              size="small"
              value={selectedSeason}
              onChange={(e) => navigateToEpisode(Number(e.target.value), 1)}
              sx={{
                color: 'common.white',
                fontSize: { xs: 12, sm: 13 },
                height: { xs: 32, sm: 36 },
                bgcolor: alpha('#ffffff', 0.06),
                borderRadius: 1.5,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.15),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.3),
                },
                '& .MuiSvgIcon-root': { color: 'common.white' },
              }}
            >
              {seasons.map((s) => (
                <MenuItem key={s.season_number} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`}
                </MenuItem>
              ))}
            </Select>

            {/* Episodes Drawer Button */}
            <Button
              size="small"
              variant="outlined"
              onClick={() => setEpisodesDrawerOpen(true)}
              startIcon={<Iconify icon="solar:clapperboard-play-linear" width={16} />}
              sx={{
                height: { xs: 32, sm: 36 },
                color: 'common.white',
                borderColor: alpha('#ffffff', 0.18),
                bgcolor: alpha('#ffffff', 0.04),
                borderRadius: 1.5,
                fontSize: { xs: 11, sm: 13 },
                px: { xs: 1, sm: 1.5 },
                minWidth: { xs: 80, sm: 'auto' },
                '&:hover': {
                  bgcolor: alpha('#ffffff', 0.08),
                  borderColor: alpha('#ffffff', 0.3),
                },
              }}
            >
              Episodes
            </Button>
          </Stack>
        )}
      </Box>

      {/* Episodes Drawer (Mobile-optimized responsive sidebar) */}
      <Drawer
        anchor="right"
        open={episodesDrawerOpen}
        onClose={() => setEpisodesDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '92vw', sm: 480, md: 540, lg: 580 },
            maxWidth: 620,
            bgcolor: '#0a0e14',
            color: 'common.white',
            borderLeft: `1px solid ${alpha('#ffffff', 0.1)}`,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.65)',
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2.5, flexShrink: 0 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 17, sm: 19 } }}>
                Episodes
              </Typography>
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                  color: 'primary.light',
                  px: 1,
                  py: 0.3,
                  borderRadius: 0.75,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                S{selectedSeason} &bull; E{selectedEpisode}
              </Box>
              {seasons.length > 1 && (
                <Select
                  size="small"
                  value={selectedSeason}
                  onChange={(e) => {
                    navigateToEpisode(Number(e.target.value), 1);
                  }}
                  sx={{
                    typography: 'subtitle2',
                    color: 'common.white',
                    bgcolor: alpha('#ffffff', 0.08),
                    borderRadius: 1,
                    height: 34,
                    '& .MuiSelect-select': { py: 0.5, px: 1.25 },
                    '& .MuiSelect-icon': { color: 'common.white' },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha('#ffffff', 0.16),
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha('#ffffff', 0.3),
                    },
                  }}
                >
                  {seasons.map((s) => (
                    <MenuItem key={s.id || s.season_number} value={s.season_number}>
                      Season {s.season_number}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </Stack>
            <IconButton onClick={() => setEpisodesDrawerOpen(false)} sx={{ color: 'common.white' }}>
              <Iconify icon="eva:close-fill" width={22} />
            </IconButton>
          </Stack>

          {/* List Content */}
          {seasonEpisodesLoading ? (
            <Box
              sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.75,
                py: 1,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={116}
                  sx={{ bgcolor: alpha('#ffffff', 0.05), borderRadius: 2, flexShrink: 0 }}
                />
              ))}
            </Box>
          ) : seasonEpisodes.length > 0 ? (
            <Box
              sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.75,
                pr: 0.5,
              }}
            >
              {seasonEpisodes.map((ep) => {
                const isSelected = Number(ep.episode_number) === Number(selectedEpisode);
                const thumbSrc = ep.still_path
                  ? (`https://image.tmdb.org/t/p/w300${ep.still_path}`)
                  : movieOrShow?.backdrop_path
                  ? (`https://image.tmdb.org/t/p/w300${movieOrShow.backdrop_path}`)
                  : movieOrShow?.poster_path
                  ? (`https://image.tmdb.org/t/p/w300${movieOrShow.poster_path}`)
                  : null;

                return (
                  <Box
                    key={ep.id || ep.episode_number}
                    onClick={() => {
                      setEpisodesDrawerOpen(false);
                      navigateToEpisode(selectedSeason, ep.episode_number);
                    }}
                    sx={{
                      flexShrink: 0,
                      minHeight: { xs: 104, sm: 116 },
                      width: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: { xs: 1.5, sm: 2 },
                      p: { xs: 1.5, sm: 1.75 },
                      boxSizing: 'border-box',
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.16) : alpha('#ffffff', 0.04),
                      background: isSelected
                        ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.22)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                        : alpha('#ffffff', 0.03),
                      border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha('#ffffff', 0.08)}`,
                      borderLeft: isSelected ? `6px solid ${theme.palette.primary.main}` : '6px solid transparent',
                      borderRadius: 2,
                      boxShadow: isSelected
                        ? `0 6px 24px ${alpha(theme.palette.primary.main, 0.35)}`
                        : '0 2px 10px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.22) : alpha('#ffffff', 0.08),
                        borderColor: isSelected ? theme.palette.primary.main : alpha('#ffffff', 0.22),
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {/* Generous 16:9 Thumbnail Preview */}
                    <Box
                      sx={{
                        width: { xs: 130, sm: 156 },
                        height: { xs: 74, sm: 88 },
                        minWidth: { xs: 130, sm: 156 },
                        minHeight: { xs: 74, sm: 88 },
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        position: 'relative',
                        flexShrink: 0,
                        bgcolor: alpha('#ffffff', 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
                      }}
                    >
                      {/* Gradient Fallback Backdrop */}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #1e2638 0%, #0d131f 100%)',
                          color: alpha('#ffffff', 0.6),
                          gap: 0.5,
                          zIndex: 0,
                        }}
                      >
                        <Iconify icon="solar:clapperboard-play-linear" width={26} />
                        <Typography variant="caption" sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>
                          EP {ep.episode_number}
                        </Typography>
                      </Box>

                      {thumbSrc && (
                        <Box
                          component="img"
                          src={thumbSrc}
                          alt={ep.name || `Episode ${ep.episode_number}`}
                          loading="lazy"
                          onError={(ev) => {
                            ev.currentTarget.style.display = 'none';
                          }}
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: isSelected ? 'none' : 'brightness(0.92)',
                          }}
                        />
                      )}

                      {/* Center Play Icon Overlay */}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: isSelected
                            ? alpha('#000000', 0.35)
                            : ep.still_path
                            ? alpha('#000000', 0.2)
                            : 'transparent',
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: isSelected ? 'primary.main' : alpha('#000000', 0.7),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isSelected ? '0 0 14px rgba(255, 48, 48, 0.75)' : '0 2px 6px rgba(0,0,0,0.5)',
                          }}
                        >
                          <Iconify
                            icon="solar:play-bold"
                            width={16}
                            sx={{
                              color: 'common.white',
                              ml: 0.2,
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Top-Left NOW PLAYING Tag on Thumbnail */}
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 5,
                            left: 5,
                            zIndex: 3,
                            bgcolor: 'primary.main',
                            color: 'common.white',
                            px: 0.7,
                            py: 0.2,
                            borderRadius: 0.6,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
                            lineHeight: 1.2,
                          }}
                        >
                          Playing
                        </Box>
                      )}
                    </Box>

                    {/* Episode Info - Expanded to fit all content */}
                    <Stack spacing={0.6} sx={{ minWidth: 0, flexGrow: 1, overflow: 'hidden' }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: isSelected ? 'primary.light' : alpha('#ffffff', 0.65),
                            fontWeight: 800,
                            fontSize: 11.5,
                            letterSpacing: 0.6,
                            textTransform: 'uppercase',
                            flexShrink: 0,
                          }}
                        >
                          EPISODE {ep.episode_number}
                        </Typography>

                        {ep.runtime ? (
                          <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.45), fontSize: 11 }}>
                            &bull; {ep.runtime} min
                          </Typography>
                        ) : null}

                        {ep.air_date ? (
                          <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.4), fontSize: 11 }}>
                            &bull; {ep.air_date.slice(0, 4)}
                          </Typography>
                        ) : null}

                        {isSelected && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.4,
                              bgcolor: alpha(theme.palette.primary.main, 0.22),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                              color: 'primary.light',
                              px: 0.75,
                              py: 0.15,
                              borderRadius: 0.6,
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: 0.4,
                              lineHeight: 1.2,
                              ml: 'auto',
                            }}
                          >
                            <Iconify icon="solar:soundwave-bold" width={12} />
                            NOW PLAYING
                          </Box>
                        )}
                      </Stack>

                      {/* Full Title (unclipped / up to 2 wrapped lines) */}
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: 'common.white',
                          fontWeight: isSelected ? 700 : 600,
                          fontSize: { xs: 14, sm: 15 },
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {ep.name || `Episode ${ep.episode_number}`}
                      </Typography>

                      {/* Overview (Expanded to up to 3 lines) */}
                      {ep.overview ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: alpha('#ffffff', 0.6),
                            display: '-webkit-box',
                            WebkitLineClamp: { xs: 2, sm: 3 },
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.45,
                            fontSize: 12,
                            wordBreak: 'break-word',
                          }}
                        >
                          {ep.overview}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.38), fontSize: 12 }}>
                          Season {selectedSeason} &bull; Episode {ep.episode_number}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.75,
                pr: 0.5,
              }}
            >
              {Array.from({ length: Math.max(1, episodeCount) }, (_, index) => index + 1).map((number) => {
                const isSelected = Number(number) === Number(selectedEpisode);
                return (
                  <Box
                    key={`fallback-ep-${number}`}
                    onClick={() => {
                      setEpisodesDrawerOpen(false);
                      navigateToEpisode(selectedSeason, number);
                    }}
                    sx={{
                      flexShrink: 0,
                      minHeight: { xs: 96, sm: 108 },
                      width: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1.5, sm: 2 },
                      p: { xs: 1.5, sm: 1.75 },
                      boxSizing: 'border-box',
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.16) : alpha('#ffffff', 0.04),
                      background: isSelected
                        ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.22)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                        : alpha('#ffffff', 0.03),
                      border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha('#ffffff', 0.08)}`,
                      borderLeft: isSelected ? `6px solid ${theme.palette.primary.main}` : '6px solid transparent',
                      borderRadius: 2,
                      boxShadow: isSelected
                        ? `0 6px 24px ${alpha(theme.palette.primary.main, 0.35)}`
                        : '0 2px 10px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.22) : alpha('#ffffff', 0.08),
                        borderColor: isSelected ? theme.palette.primary.main : alpha('#ffffff', 0.22),
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 120, sm: 144 },
                        height: { xs: 70, sm: 82 },
                        minWidth: { xs: 120, sm: 144 },
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        bgcolor: alpha('#ffffff', 0.06),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
                      }}
                    >
                      <Iconify
                        icon="solar:clapperboard-play-linear"
                        width={26}
                        sx={{ color: isSelected ? 'primary.light' : alpha('#ffffff', 0.5) }}
                      />
                      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: 'common.white' }}>
                        EP {number}
                      </Typography>
                    </Box>

                    <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: isSelected ? 'primary.light' : alpha('#ffffff', 0.65),
                            fontWeight: 800,
                            fontSize: 11.5,
                            textTransform: 'uppercase',
                          }}
                        >
                          EPISODE {number}
                        </Typography>
                        {isSelected && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.4,
                              bgcolor: alpha(theme.palette.primary.main, 0.22),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                              color: 'primary.light',
                              px: 0.75,
                              py: 0.15,
                              borderRadius: 0.6,
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            <Iconify icon="solar:soundwave-bold" width={12} />
                            NOW PLAYING
                          </Box>
                        )}
                      </Stack>
                      <Typography variant="subtitle2" sx={{ color: 'common.white', fontWeight: 600, fontSize: 15 }}>
                        Episode {number}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.45), fontSize: 12 }}>
                        Season {selectedSeason} &bull; Episode {number}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Player */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: { xs: 0, sm: 3 }, pb: { xs: 1.5, sm: 3 } }}>
        {isLoading && !movieOrShow && !error ? (
          <VideoLoadingState
            title={displayTitle}
            season={type === 'tv' ? selectedSeason : null}
            episode={type === 'tv' ? selectedEpisode : null}
            backdrop={backdropUrl}
              cast={combinedCast}
            feedback={scrapeFeedback}
          />
        ) : error || !movieOrShow ? (
          <Container maxWidth="md">
            <Stack alignItems="center" spacing={2} textAlign="center" sx={{ color: 'common.white' }}>
              <Iconify icon="solar:shield-warning-bold" width={56} sx={{ color: 'text.disabled' }} />
              <Typography variant="h5">We couldn&apos;t load this title</Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                {error || 'This title could not be found.'}
              </Typography>
              <Typography
                component="span"
                role="button"
                onClick={backToWatch}
                sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
              >
                Back to title page
              </Typography>
            </Stack>
          </Container>
        ) : (
          <Container maxWidth="xl" disableGutters sx={{ width: 1, px: { xs: 0.5, sm: 2 } }}>
            <Player
              title={displayTitle}
              type={type}
              id={id || movieOrShow?.id}
              tmdbId={id || movieOrShow?.id}
              season={season}
              episode={episode}
              backdrop={backdropUrl}
              onBack={backToWatch}
              src={movieOrShow.videoUrl}
              servers={movieOrShow.servers || []}
              directSources={directSources?.sources || []}
              subtitles={[...(directSources?.subtitles || []), ...openSubtitles]}
              extractorProviders={CLIENT_SCRAPER_CONFIG}
              activeExtractorId={directSources?.provider || null}
              sourcesLoading={sourcesLoading}
              loading={isLoading}
              sourcesError={sourcesError}
              scrapeFeedback={scrapeFeedback}
              onSelectExtractor={selectExtractor}
              onRetrySources={retrySources}
              hasNextEpisode={hasNextEpisode}
              onNextEpisode={handleNextEpisode}
            />
          </Container>
        )}
      </Box>
    </Box>
  );
}

function VideoLoadingState({ title, season, episode, backdrop, feedback }) {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Resolving streaming links...', desc: 'Checking high-speed mirrors and extractors' },
    { label: 'Fetching audio & subtitles...', desc: 'Synchronizing multi-language caption tracks' },
    { label: 'Preparing video stream...', desc: 'Starting instant playback engine' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  const rawProviderLabel = feedback?.activeProviderName || null;
  const providerLabel = rawProviderLabel ? rawProviderLabel.replace(/\s*\([^)]*\)/g, '').trim() : null;
  const progressPercent = feedback?.percentage || 0;
  const isSwitching = feedback?.status === 'switching';
  const customMessage = feedback?.message ? feedback.message.replace(/\s*\([^)]*\)/g, '') : null;

  return (
    <Container maxWidth="md" sx={{ my: 'auto', py: 6 }}>
      <Box
        sx={{
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          p: { xs: 3, sm: 6 },
          textAlign: 'center',
          border: `1px solid ${alpha('#ffffff', 0.1)}`,
          bgcolor: alpha('#050709', 0.85),
          boxShadow: `0 24px 60px -12px ${alpha('#000000', 0.9)}`,
          backdropFilter: 'blur(20px)',
        }}
      >
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
              opacity: 0.12,
              filter: 'blur(25px) brightness(0.5)',
              transform: 'scale(1.15)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        <Stack spacing={3} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box
              sx={{
                position: 'absolute',
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: alpha(isSwitching ? '#FF9800' : theme.palette.primary.main, 0.25),
                filter: 'blur(20px)',
                animation: 'youplex-radar-pulse 2s ease-in-out infinite',
              }}
            />
            <CircularProgress
              size={76}
              thickness={2.5}
              sx={{
                color: isSwitching ? 'warning.main' : 'primary.main',
                '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
              }}
            />
            <Iconify
              icon="solar:play-stream-bold-duotone"
              width={34}
              sx={{
                position: 'absolute',
                color: 'common.white',
                animation: 'youplex-glow-pulse 2s ease-in-out infinite',
              }}
            />
          </Box>

          <Stack spacing={0.75} alignItems="center">
            <Typography variant="h5" sx={{ color: 'common.white', fontWeight: 700 }}>
              {title || 'Loading Media'}
            </Typography>
            {season && (
              <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.6) }}>
                Season {season} • Episode {episode || 1}
              </Typography>
            )}
          </Stack>

          {/* Provider Badge */}
          {providerLabel && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.6,
                borderRadius: 2,
                bgcolor: alpha(isSwitching ? '#FF9800' : theme.palette.primary.main, 0.12),
                border: `1px solid ${alpha(isSwitching ? '#FF9800' : theme.palette.primary.main, 0.3)}`
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: isSwitching ? 'warning.main' : 'primary.main',
                  animation: 'youplex-glow-pulse 1.2s ease-in-out infinite',
                }}
              />
              <Typography variant="caption" sx={{ color: 'common.white', fontWeight: 600 }}>
                {isSwitching ? `Auto-switching from ${providerLabel}` : `Provider: ${providerLabel}`}
              </Typography>
            </Box>
          )}

          {/* Progress Bar */}
          <Box sx={{ width: 1, maxWidth: 360, my: 1 }}>
            <LinearProgress
              variant={progressPercent > 0 ? 'determinate' : 'indeterminate'}
              value={progressPercent}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha('#ffffff', 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: isSwitching
                    ? 'linear-gradient(90deg, #FF9800 0%, #FF5722 100%)'
                    : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                  transition: 'transform 0.3s ease',
                },
              }}
            />
          </Box>

          <Stack spacing={0.5} alignItems="center">
            <Typography
              variant="subtitle2"
              sx={{ color: isSwitching ? 'warning.light' : 'primary.light', fontWeight: 600 }}
            >
              {customMessage || (providerLabel ? `Checking ${providerLabel}...` : steps[activeStep].label)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {isSwitching
                ? 'Testing next available extractor'
                : providerLabel && progressPercent > 0
                ? `${progressPercent}% complete`
                : steps[activeStep].desc}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
