'use client';

import { Iconify } from '@/components/iconify';
import Player from '@/components/player/player';
import { CLIENT_SCRAPER_CONFIG } from '@/lib/scrapers/provider-config';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMovieOrShow, getPlaySources, getSubtitles } from '@/actions/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

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

  useEffect(() => {
    let active = true;

    if (!id) {
      setIsLoading(false);
      setSourcesLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setSourcesLoading(true);
    setSourcesError(null);
    setError(null);

    getMovieOrShow(type, id)
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
          getPlaySources(type, id, playbackOptions),
          getSubtitles(type, id, playbackOptions),
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

  const displayTitle = movieOrShow?.title || movieOrShow?.name || '';
  const seasons = movieOrShow?.seasons?.filter((item) => item.season_number > 0) || [];
  const selectedSeason = resolvedSeason;
  const selectedEpisode = resolvedEpisode;
  const currentSeason = seasons.find((item) => item.season_number === selectedSeason);
  const episodeCount = currentSeason?.episode_count || 0;

  const navigateToEpisode = (nextSeason, nextEpisode) => {
    setIsLoading(true);
    setSourcesLoading(true);
    setSourcesError(null);
    setDirectSources({ sources: [], subtitles: [] });
    const params = new URLSearchParams({ id: id || '' });
    params.set('season', String(nextSeason));
    params.set('episode', String(nextEpisode));
    router.push(`/watch/${type}/${title}/play?${params.toString()}`);
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#000000', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
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
          <Typography variant="overline" sx={{ color: 'text.disabled', lineHeight: 1.2 }}>
            {type === 'tv' ? `Season ${selectedSeason} · Episode ${selectedEpisode}` : 'Now Playing'}
          </Typography>
          <Typography variant="h6" noWrap sx={{ color: 'common.white', fontWeight: 600 }}>
            {isLoading ? 'Loading…' : displayTitle}
          </Typography>
        </Stack>
        </Stack>

        {type === 'tv' && seasons.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ ml: { sm: 'auto' }, overflowX: 'auto', pb: { xs: 0.5, sm: 0 } }}
          >
            <Select
              size="small"
              value={String(selectedSeason)}
              onChange={(event) => navigateToEpisode(event.target.value, 1)}
              sx={{ minWidth: 125, color: 'common.white', bgcolor: alpha('#ffffff', 0.08) }}
            >
              {seasons.map((item) => (
                <MenuItem key={item.id} value={String(item.season_number)}>
                  Season {item.season_number}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={String(selectedEpisode)}
              onChange={(event) => navigateToEpisode(selectedSeason, event.target.value)}
              sx={{ minWidth: 135, color: 'common.white', bgcolor: alpha('#ffffff', 0.08) }}
            >
              {Array.from({ length: episodeCount }, (_, index) => index + 1).map((number) => (
                <MenuItem key={number} value={String(number)}>
                  Episode {number}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
      </Stack>

      {/* Player */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: { xs: 1, sm: 3 }, pb: 3 }}>
        {isLoading && !movieOrShow && !error ? (
          <VideoLoadingState
            title={displayTitle}
            season={type === 'tv' ? selectedSeason : null}
            episode={type === 'tv' ? selectedEpisode : null}
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

function VideoLoadingState({ title, season, episode }) {
  return (
    <Container maxWidth="xl" sx={{ width: 1 }}>
      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: '16/9',
          minHeight: { xs: 280, sm: 420 },
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: '#050709',
          border: `1px solid ${alpha('#ffffff', 0.12)}`,
          boxShadow: `0 24px 60px -12px ${alpha('#000000', 0.9)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 42%, rgba(255,48,48,0.18), transparent 34%), linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.06) 45%, transparent 70%)',
            backgroundSize: '100% 100%, 220% 100%',
            animation: 'youplex-loading-sheen 2.4s linear infinite',
          },
        }}
      >
        <Stack
          alignItems="center"
          spacing={2}
          sx={{ position: 'relative', zIndex: 1, px: 3, textAlign: 'center', color: 'common.white' }}
        >
          <Box sx={{ position: 'relative', display: 'flex' }}>
            <CircularProgress size={72} thickness={3} sx={{ color: 'primary.main' }} />
            <Iconify
              icon="solar:play-stream-bold-duotone"
              width={30}
              sx={{
                position: 'absolute',
                inset: 0,
                m: 'auto',
                color: 'common.white',
                animation: 'youplex-glow-pulse 2s ease-in-out infinite',
              }}
            />
          </Box>
          <Stack spacing={0.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Preparing your stream
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {title || 'Loading video'}{season ? ` · Season ${season}, Episode ${episode}` : ''}
            </Typography>
          </Stack>
          <LinearProgress
            sx={{
              width: { xs: 220, sm: 320 },
              height: 4,
              borderRadius: 4,
              bgcolor: alpha('#ffffff', 0.12),
              '& .MuiLinearProgress-bar': { borderRadius: 4 },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Finding a playable source. This may take a moment.
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}
