'use client';

import { Iconify } from '@/components/iconify';
import Player from '@/components/player/player';
import { CLIENT_SCRAPER_CONFIG } from '@/lib/scrapers/provider-config';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMovieOrShow, getPlaySources, getSubtitles, searchMedia, getSeasonDetails } from '@/actions/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

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

      return getMovieOrShow(type, resolvedId);
    };

    resolveDetails()
      .then(async (data) => {
        if (!active) return;
        setMovieOrShow(data);

        const firstSeason = data?.seasons?.find((item) => item.season_number > 0);
        const playbackOptions =
          type === 'tv'
            ? {
                season: Number(season || firstSeason?.season_number || 1),
                episode: Number(episode || 1),
              }
            : {};

        const [sourceData, subtitleData] = await Promise.allSettled([
          getPlaySources(type, data.id || id, playbackOptions),
          getSubtitles(type, data.id || id, playbackOptions),
        ]);

        if (!active) return;

        if (sourceData.status === 'fulfilled' && sourceData.value?.success) {
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
          subtitleData.status === 'fulfilled' ? subtitleData.value?.subtitles || [] : []
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
  }, [type, id, season, episode]);

  const resolvedSeason = Number(
    season || movieOrShow?.seasons?.find((item) => item.season_number > 0)?.season_number || 1
  );
  const resolvedEpisode = Number(episode || 1);
  const playbackOptions = useMemo(
    () => (type === 'tv' ? { season: resolvedSeason, episode: resolvedEpisode } : {}),
    [type, resolvedSeason, resolvedEpisode]
  );

  // Fetch season episodes whenever TV show ID or current season changes
  useEffect(() => {
    let active = true;
    if (type !== 'tv' || (!id && !movieOrShow?.id)) return;

    setSeasonEpisodesLoading(true);
    const mediaId = movieOrShow?.id || id;
    getSeasonDetails(mediaId, resolvedSeason)
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
        const data = await getPlaySources(type, id, opts);
        if (data?.success) {
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
    [type, id, playbackOptions]
  );

  const retrySources = useCallback(
    async () => {
      setSourcesLoading(true);
      setSourcesError(null);

      try {
        const opts = {
          ...playbackOptions,
        };
        const data = await getPlaySources(type, id, opts);
        if (!data?.success) throw new Error('The providers did not return a stream yet.');
        setDirectSources(data);
      } catch (err) {
        setSourcesError(err?.message || 'The providers are taking longer than usual to respond.');
      } finally {
        setSourcesLoading(false);
      }
    },
    [type, id, playbackOptions]
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

  // Next / Prev Episode Quick Jump
  const hasPrev = selectedEpisode > 1;
  const hasNext = episodeCount > 0 ? selectedEpisode < episodeCount : false;

  const handlePrevEpisode = () => {
    if (hasPrev) {
      navigateToEpisode(selectedSeason, selectedEpisode - 1);
    }
  };

  const handleNextEpisode = () => {
    if (hasNext) {
      navigateToEpisode(selectedSeason, selectedEpisode + 1);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#000000', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
          bgcolor: alpha('#050709', 0.8),
          backdropFilter: 'blur(16px)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          <IconButton
            onClick={backToWatch}
            sx={{
              color: 'common.white',
              bgcolor: alpha('#ffffff', 0.08),
              border: `solid 1px ${alpha('#ffffff', 0.14)}`,
              '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
            }}
          >
            <Iconify icon="solar:alt-arrow-left-bold" width={20} />
          </IconButton>

          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'primary.light', lineHeight: 1.2, fontWeight: 700 }}>
              {type === 'tv'
                ? `Season ${selectedSeason} • Episode ${selectedEpisode}${currentEpisodeData?.name ? ` — ${currentEpisodeData.name}` : ''}`
                : 'Now Playing'}
            </Typography>
            <Typography variant="h6" noWrap sx={{ color: 'common.white', fontWeight: 600 }}>
              {isLoading ? 'Loading…' : displayTitle}
            </Typography>
          </Stack>
        </Stack>

        {/* TV Episode & Season Controls */}
        {type === 'tv' && seasons.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              overflowX: 'auto',
              flexShrink: 0,
              pb: { xs: 0.5, md: 0 },
            }}
          >
            {/* Quick Prev / Next Episode Buttons */}
            <Tooltip title="Previous Episode" arrow>
              <span>
                <IconButton
                  size="small"
                  disabled={!hasPrev}
                  onClick={handlePrevEpisode}
                  sx={{
                    color: 'common.white',
                    bgcolor: alpha('#ffffff', 0.08),
                    border: `1px solid ${alpha('#ffffff', 0.12)}`,
                    '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                    '&.Mui-disabled': { opacity: 0.35, color: 'text.disabled' },
                  }}
                >
                  <Iconify icon="solar:skip-previous-bold" width={18} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Quick Episodes Drawer Opener Pill */}
            <Button
              size="small"
              onClick={() => setEpisodesDrawerOpen(true)}
              startIcon={<Iconify icon="solar:clapperboard-play-bold" width={16} />}
              sx={{
                color: 'common.white',
                bgcolor: alpha('#ffffff', 0.1),
                border: `1px solid ${alpha('#ffffff', 0.16)}`,
                borderRadius: 2,
                px: 1.5,
                fontWeight: 600,
                fontSize: 13,
                textTransform: 'none',
                '&:hover': { bgcolor: alpha('#ffffff', 0.18) },
              }}
            >
              Episodes ({selectedEpisode}/{episodeCount || '?'})
            </Button>

            <Tooltip title="Next Episode" arrow>
              <span>
                <IconButton
                  size="small"
                  disabled={!hasNext}
                  onClick={handleNextEpisode}
                  sx={{
                    color: 'common.white',
                    bgcolor: alpha('#ffffff', 0.08),
                    border: `1px solid ${alpha('#ffffff', 0.12)}`,
                    '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                    '&.Mui-disabled': { opacity: 0.35, color: 'text.disabled' },
                  }}
                >
                  <Iconify icon="solar:skip-next-bold" width={18} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Season Selector Dropdown */}
            <Select
              size="small"
              value={String(selectedSeason)}
              onChange={(event) => navigateToEpisode(event.target.value, 1)}
              sx={{
                minWidth: 110,
                color: 'common.white',
                bgcolor: alpha('#ffffff', 0.08),
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.14),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.28),
                },
              }}
            >
              {seasons.map((item) => (
                <MenuItem key={item.id} value={String(item.season_number)}>
                  Season {item.season_number}
                </MenuItem>
              ))}
            </Select>

            {/* Episode Selector Dropdown */}
            <Select
              size="small"
              value={String(selectedEpisode)}
              onChange={(event) => navigateToEpisode(selectedSeason, event.target.value)}
              sx={{
                minWidth: 115,
                color: 'common.white',
                bgcolor: alpha('#ffffff', 0.08),
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.14),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha('#ffffff', 0.28),
                },
              }}
            >
              {Array.from({ length: episodeCount || 1 }, (_, index) => index + 1).map((number) => (
                <MenuItem key={number} value={String(number)}>
                  Ep {number}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
      </Stack>

      {/* Episodes Drawer Sidebar for Modern TV Experience */}
      <Drawer
        anchor="right"
        open={episodesDrawerOpen}
        onClose={() => setEpisodesDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            bgcolor: '#0d1117',
            borderLeft: `1px solid ${alpha('#ffffff', 0.12)}`,
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pb: 2, borderBottom: `1px solid ${alpha('#ffffff', 0.1)}` }}>
          <Stack spacing={0.2}>
            <Typography variant="h6" sx={{ color: 'common.white', fontWeight: 700 }}>
              Episodes
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {displayTitle}
            </Typography>
          </Stack>
          <IconButton onClick={() => setEpisodesDrawerOpen(false)} sx={{ color: 'text.secondary', '&:hover': { color: 'common.white' } }}>
            <Iconify icon="solar:close-circle-bold" width={24} />
          </IconButton>
        </Stack>

        {/* Season Selector Tabs / Pills in Drawer */}
        {seasons.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ my: 2, overflowX: 'auto', pb: 1 }}>
            {seasons.map((item) => {
              const isCurr = item.season_number === selectedSeason;
              return (
                <Box
                  key={item.id}
                  onClick={() => navigateToEpisode(item.season_number, 1)}
                  sx={{
                    px: 1.8,
                    py: 0.6,
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    bgcolor: isCurr ? 'primary.main' : alpha('#ffffff', 0.08),
                    color: isCurr ? 'common.white' : alpha('#ffffff', 0.7),
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: isCurr ? 'primary.main' : alpha('#ffffff', 0.16),
                      color: 'common.white',
                    },
                  }}
                >
                  Season {item.season_number}
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Rich Episode Cards List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', mt: seasons.length > 1 ? 0 : 2, pr: 0.5 }}>
          {seasonEpisodesLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={32} sx={{ color: 'primary.main', mb: 1.5 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Loading season {selectedSeason} episodes...
              </Typography>
            </Stack>
          ) : seasonEpisodes.length > 0 ? (
            <Stack spacing={1.5}>
              {seasonEpisodes.map((ep) => {
                const isSelected = ep.episode_number === selectedEpisode;
                return (
                  <Box
                    key={ep.id || ep.episode_number}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${isSelected ? alpha('#FF3030', 0.5) : alpha('#ffffff', 0.08)}`,
                      bgcolor: isSelected ? alpha('#FF3030', 0.1) : alpha('#ffffff', 0.03),
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isSelected ? alpha('#FF3030', 0.15) : alpha('#ffffff', 0.08),
                        borderColor: isSelected ? 'primary.main' : alpha('#ffffff', 0.2),
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        setEpisodesDrawerOpen(false);
                        navigateToEpisode(selectedSeason, ep.episode_number);
                      }}
                      sx={{ p: 1.5 }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        {/* Episode Still / Thumbnail */}
                        <Box
                          sx={{
                            width: 100,
                            aspectRatio: '16/9',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            position: 'relative',
                            bgcolor: '#000000',
                            flexShrink: 0,
                          }}
                        >
                          {ep.still_path ? (
                            <Box
                              component="img"
                              src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                              alt={ep.name}
                              sx={{ width: 1, height: 1, objectFit: 'cover' }}
                            />
                          ) : (
                            <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1 }}>
                              <Iconify icon="solar:play-stream-bold" width={24} sx={{ color: 'text.disabled' }} />
                            </Stack>
                          )}
                          {isSelected && (
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: alpha('#FF3030', 0.4),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Iconify icon="solar:play-bold" width={22} sx={{ color: 'common.white' }} />
                            </Box>
                          )}
                        </Box>

                        {/* Title and details */}
                        <Stack spacing={0.3} sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Typography variant="caption" sx={{ color: isSelected ? 'primary.light' : 'text.disabled', fontWeight: 700 }}>
                              EPISODE {ep.episode_number}
                            </Typography>
                            {ep.runtime && (
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>
                                {ep.runtime} min
                              </Typography>
                            )}
                          </Stack>
                          <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{
                              color: isSelected ? 'primary.light' : 'common.white',
                              fontWeight: isSelected ? 700 : 600,
                              fontSize: 13.5,
                            }}
                          >
                            {ep.name || `Episode ${ep.episode_number}`}
                          </Typography>
                          {ep.overview && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: 11.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.4,
                              }}
                            >
                              {ep.overview}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </CardActionArea>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            /* Fallback simple grid if TMDB season details unavailable */
            <Box
              display="grid"
              gap={1}
              gridTemplateColumns="repeat(4, 1fr)"
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
              onSelectExtractor={selectExtractor}
              onRetrySources={retrySources}
            />
          </Container>
        )}
      </Box>
    </Box>
  );
}

function VideoLoadingState({ title, season, episode, backdrop }) {
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
                bgcolor: alpha('#FF3030', 0.25),
                filter: 'blur(20px)',
                animation: 'youplex-radar-pulse 2s ease-in-out infinite',
              }}
            />
            <CircularProgress
              size={76}
              thickness={2.5}
              sx={{
                color: 'primary.main',
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

          <Box sx={{ width: 1, maxWidth: 360, my: 1 }}>
            <LinearProgress
              variant="indeterminate"
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha('#ffffff', 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #FF3030 0%, #FF6060 100%)',
                },
              }}
            />
          </Box>

          <Stack spacing={0.5} alignItems="center">
            <Typography variant="subtitle2" sx={{ color: 'primary.light', fontWeight: 600 }}>
              {steps[activeStep].label}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {steps[activeStep].desc}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
