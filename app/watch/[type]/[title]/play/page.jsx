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
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
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
        const data = await getPlaySources(type, id, opts, handleScrapeProgress);
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
        const data = await getPlaySources(type, id, opts, handleScrapeProgress);
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
  const backdropUrl = movieOrShow?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movieOrShow.backdrop_path}`
    : '';
  const seasons = movieOrShow?.seasons?.filter((item) => item.season_number > 0) || [];
  const selectedSeason = resolvedSeason;
  const selectedEpisode = resolvedEpisode;
  const currentSeason = seasons.find((item) => item.season_number === selectedSeason);
  const episodeCount = currentSeason?.episode_count || seasonEpisodes.length || 0;

  const currentEpisodeData = seasonEpisodes.find((ep) => ep.episode_number === selectedEpisode);

  const navigateToEpisode = (nextSeason, nextEpisode) => {
    setIsLoading(true);
    setSourcesLoading(true);
    setSourcesError(null);
    setDirectSources({ sources: [], subtitles: [] });
    const params = new URLSearchParams({ id: id || movieOrShow?.id || '' });
    params.set('season', String(nextSeason));
    params.set('episode', String(nextEpisode));
    router.push(`/watch/${type}/${title}/play?${params.toString()}`);
  };

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
            width: { xs: '88vw', sm: 400, md: 460 },
            bgcolor: '#0d1117',
            color: 'common.white',
            borderLeft: `1px solid ${alpha('#ffffff', 0.1)}`,
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Season {selectedSeason} Episodes
            </Typography>
            <IconButton onClick={() => setEpisodesDrawerOpen(false)} sx={{ color: 'common.white' }}>
              <Iconify icon="eva:close-fill" />
            </IconButton>
          </Stack>

          {seasonEpisodesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={36} sx={{ color: 'primary.main' }} />
            </Box>
          ) : seasonEpisodes.length > 0 ? (
            <Stack spacing={1.5} sx={{ overflowY: 'auto', flexGrow: 1, pr: 0.5 }}>
              {seasonEpisodes.map((ep) => {
                const isSelected = ep.episode_number === selectedEpisode;
                return (
                  <Card
                    key={ep.id || ep.episode_number}
                    sx={{
                      bgcolor: isSelected ? alpha('#FF3030', 0.12) : alpha('#ffffff', 0.04),
                      border: `1px solid ${isSelected ? alpha('#FF3030', 0.5) : alpha('#ffffff', 0.08)}`,
                      borderRadius: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: isSelected ? alpha('#FF3030', 0.18) : alpha('#ffffff', 0.08),
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        setEpisodesDrawerOpen(false);
                        navigateToEpisode(selectedSeason, ep.episode_number);
                      }}
                      sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
                    >
                      {ep.still_path ? (
                        <CardMedia
                          component="img"
                          image={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                          alt={ep.name}
                          sx={{
                            width: 88,
                            height: 52,
                            borderRadius: 1,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 88,
                            height: 52,
                            borderRadius: 1,
                            bgcolor: alpha('#ffffff', 0.08),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Iconify icon="solar:play-stream-bold-duotone" width={24} sx={{ color: 'text.disabled' }} />
                        </Box>
                      )}

                      <Stack spacing={0.25} sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{
                            color: isSelected ? 'primary.light' : 'common.white',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: 13,
                          }}
                        >
                          {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                        </Typography>
                        {ep.overview && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: alpha('#ffffff', 0.5),
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3,
                            }}
                          >
                            {ep.overview}
                          </Typography>
                        )}
                      </Stack>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fill, minmax(64px, 1fr))"
              gap={1}
              sx={{ py: 2 }}
            >
              {Array.from({ length: episodeCount || 1 }, (_, index) => index + 1).map((number) => {
                const isSelected = number === selectedEpisode;
                return (
                  <Button
                    key={number}
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => {
                      setEpisodesDrawerOpen(false);
                      navigateToEpisode(selectedSeason, number);
                    }}
                    sx={{
                      height: 44,
                      borderRadius: 1.5,
                      borderColor: alpha('#ffffff', 0.15),
                      color: isSelected ? 'common.white' : alpha('#ffffff', 0.8),
                      bgcolor: isSelected ? 'primary.main' : alpha('#ffffff', 0.04),
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.main' : alpha('#ffffff', 0.1),
                      },
                    }}
                  >
                    Ep {number}
                  </Button>
                );
              })}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Player */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: { xs: 1, sm: 3 }, pb: 3 }}>
        {isLoading && !movieOrShow && !error ? (
          <VideoLoadingState
            title={displayTitle}
            season={type === 'tv' ? selectedSeason : null}
            episode={type === 'tv' ? selectedEpisode : null}
            backdrop={backdropUrl}
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
          <Container maxWidth="xl" sx={{ width: 1 }}>
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
            />
          </Container>
        )}
      </Box>
    </Box>
  );
}

function VideoLoadingState({ title, season, episode, backdrop, feedback }) {
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
                bgcolor: alpha(isSwitching ? '#FF9800' : '#FF3030', 0.25),
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
                bgcolor: alpha(isSwitching ? '#FF9800' : '#FF3030', 0.12),
                border: `1px solid ${alpha(isSwitching ? '#FF9800' : '#FF3030', 0.3)}`
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
                    : 'linear-gradient(90deg, #FF3030 0%, #FF6060 100%)',
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
