'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';

import axios from '@/utils/axios';
import { isContentDmcaBlocked } from '@/lib/dmca';
import { isPlayerAdsEnabled } from '@/components/ads/ad-config';
import { DmcaNotice } from '@/components/dmca/dmca-notice';
import { Player } from '@/components/player';
import { CLIENT_SCRAPER_CONFIG } from '@/lib/scrapers/provider-config';
import {
  getMovieOrShow,
  getPlaySources,
  getSubtitles,
  getSeasonDetails,
  getIntroTimestamps,
} from '@/actions/api';

// ----------------------------------------------------------------------

/**
 * Resolves external IMDB ID (e.g. tt1234567) to TMDB numeric ID if needed.
 */
async function resolveMediaId(rawId, mediaType = 'movie') {
  if (!rawId) return null;
  const strId = String(rawId).trim();
  if (strId.startsWith('tt')) {
    try {
      const res = await axios.get(`/find/${strId}`, {
        params: { external_source: 'imdb_id' },
      });
      const results =
        mediaType === 'tv'
          ? res.data?.tv_results
          : res.data?.movie_results;
      if (results && results.length > 0) {
        return results[0].id;
      }
      const fallback = res.data?.movie_results?.[0] || res.data?.tv_results?.[0];
      if (fallback?.id) return fallback.id;
    } catch (e) {
      console.warn('[EmbedPlayer] Could not resolve IMDB ID:', e);
    }
  }
  return strId;
}

// ----------------------------------------------------------------------

export function EmbedPlayerView({
  type = 'movie',
  id: initialId,
  season: initialSeason = 1,
  episode: initialEpisode = 1,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters for developer customization
  const autoplayParam = searchParams.get('autoplay');
  const autoPlay = autoplayParam == null ? true : autoplayParam === 'true' || autoplayParam === '1';
  const startAtParam = searchParams.get('startAt');
  const customThemeColor = searchParams.get('theme') || searchParams.get('color');
  const nextEpisodeParam = searchParams.get('nextEpisode');
  const autoNextEpisode = nextEpisodeParam === 'true' || nextEpisodeParam === '1';

  // Read season/episode from URL query if not passed via path params
  const seasonQuery = searchParams.get('season');
  const episodeQuery = searchParams.get('episode');

  const resolvedSeasonNum = Number(initialSeason || seasonQuery || 1);
  const resolvedEpisodeNum = Number(initialEpisode || episodeQuery || 1);

  const [resolvedId, setResolvedId] = useState(initialId);
  const [movieOrShow, setMovieOrShow] = useState(null);
  const [directSources, setDirectSources] = useState({ sources: [], subtitles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);
  const [openSubtitles, setOpenSubtitles] = useState([]);
  const [timelineSegments, setTimelineSegments] = useState([]);
  const [loadError, setLoadError] = useState(null);

  // TV Episode & Seasons
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [seasonEpisodesLoading, setSeasonEpisodesLoading] = useState(false);

  // Scrape feedback & auto-switching
  const failedProvidersRef = useRef(new Set());
  const [scrapeFeedback, setScrapeFeedback] = useState({
    activeProviderId: null,
    activeProviderName: null,
    status: 'idle',
    percentage: 0,
    message: '',
    attemptedProviders: [],
  });

  const isBlocked = useMemo(
    () => isContentDmcaBlocked({ id: resolvedId || initialId, type }),
    [resolvedId, initialId, type]
  );

  // Inject popunder monetization script if not already present in the iframe
  useEffect(() => {
    if (!isPlayerAdsEnabled()) return;
    const scriptSrc = '//gs.retimeliquory.com/rTYx8bqCMIiKM/141204';
    if (typeof document !== 'undefined' && !document.querySelector('script[src*="141204"]')) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = scriptSrc;
      document.head.appendChild(script);
    }
  }, []);

  // PostMessage helper to broadcast player events to parent window
  const broadcastEvent = useCallback(
    (eventName, payload = {}) => {
      if (typeof window === 'undefined') return;
      try {
        const message = {
          source: 'youplex',
          event: eventName,
          type,
          id: resolvedId || initialId,
          season: type === 'tv' ? resolvedSeasonNum : undefined,
          episode: type === 'tv' ? resolvedEpisodeNum : undefined,
          ...payload,
        };
        // Post to parent frame if iframed
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, '*');
        }
      } catch (err) {
        // ignore cross-origin postMessage errors
      }
    },
    [type, resolvedId, initialId, resolvedSeasonNum, resolvedEpisodeNum]
  );

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
        .replace(/\\s*\\([^)]*\\)/g, '')
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

  // Resolve ID & fetch metadata and streams
  useEffect(() => {
    let active = true;

    if (isBlocked) {
      setIsLoading(false);
      setSourcesLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setSourcesLoading(true);
    setSourcesError(null);
    setLoadError(null);
    failedProvidersRef.current.clear();
    setScrapeFeedback({
      activeProviderId: null,
      activeProviderName: null,
      status: 'pending',
      percentage: 10,
      message: 'Resolving media information...',
      attemptedProviders: [],
    });

    const init = async () => {
      try {
        const numericId = await resolveMediaId(initialId, type);
        if (!active) return;
        setResolvedId(numericId);

        if (!numericId) {
          throw new Error('Media ID is missing or invalid.');
        }

        if (isContentDmcaBlocked({ id: numericId, type })) {
          return;
        }

        const data = await getMovieOrShow(type, numericId, {
          season: resolvedSeasonNum,
          episode: resolvedEpisodeNum,
        });

        if (!active) return;
        if (!data) {
          throw new Error('Failed to load media details from database.');
        }

        setMovieOrShow(data);
        setIsLoading(false);

        const releaseYear = (data.release_date || data.first_air_date)?.slice(0, 4);
        const currentSeasonObj = data.seasons?.find(
          (item) => item.season_number === resolvedSeasonNum
        );

        const playbackOptions = {
          title: data.title || data.name,
          year: releaseYear,
          releaseYear,
          imdbId: data.imdb_id,
          ...(type === 'tv'
            ? {
                season: resolvedSeasonNum,
                episode: resolvedEpisodeNum,
                seasonId: currentSeasonObj?.id,
              }
            : {}),
        };

        const [sourceData, subtitleData, timestampsData] = await Promise.allSettled([
          getPlaySources(type, numericId, playbackOptions, handleScrapeProgress),
          getSubtitles(type, numericId, playbackOptions),
          getIntroTimestamps({
            tmdbId: numericId,
            imdbId: data.imdb_id,
            type,
            season: resolvedSeasonNum,
            episode: resolvedEpisodeNum,
          }),
        ]);

        if (!active) return;

        if (timestampsData.status === 'fulfilled' && Array.isArray(timestampsData.value?.segments)) {
          setTimelineSegments(timestampsData.value.segments);
        }

        const hasSources = (sourceData.value?.sources || []).length > 0;
        if (sourceData.status === 'fulfilled' && (sourceData.value?.success || hasSources)) {
          setDirectSources(sourceData.value);
          setSourcesError(null);
        } else {
          setDirectSources({ sources: [], subtitles: [] });
          setSourcesError(
            sourceData.status === 'rejected'
              ? sourceData.reason?.message || 'Providers are taking longer than usual.'
              : 'Direct streams temporarily unavailable.'
          );
        }

        setOpenSubtitles(
          subtitleData.status === 'fulfilled'
            ? Array.isArray(subtitleData.value)
              ? subtitleData.value
              : subtitleData.value?.subtitles || []
            : []
        );
      } catch (err) {
        if (active) {
          console.error('[EmbedPlayer] Error initializing embed stream:', err);
          setLoadError(err?.message || 'Unable to load title.');
          setDirectSources({ sources: [], subtitles: [] });
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setSourcesLoading(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [type, initialId, resolvedSeasonNum, resolvedEpisodeNum, isBlocked, handleScrapeProgress]);

  // Fetch season episode list for TV
  useEffect(() => {
    let active = true;
    if (type !== 'tv' || !resolvedId) return undefined;

    setSeasonEpisodesLoading(true);
    getSeasonDetails(resolvedId, resolvedSeasonNum)
      .then((data) => {
        if (active && data?.episodes) {
          setSeasonEpisodes(data.episodes);
        }
      })
      .catch((err) => console.warn('[EmbedPlayer] Could not fetch season episodes:', err))
      .finally(() => {
        if (active) setSeasonEpisodesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [type, resolvedId, resolvedSeasonNum]);

  // Playback options memo
  const playbackOptions = useMemo(() => {
    const releaseYear = (movieOrShow?.release_date || movieOrShow?.first_air_date)?.slice(0, 4);
    const mediaTitle = movieOrShow?.title || movieOrShow?.name;
    const currentEpisodeObj = seasonEpisodes.find((ep) => ep.episode_number === resolvedEpisodeNum);
    const currentSeasonObj = movieOrShow?.seasons?.find(
      (item) => item.season_number === resolvedSeasonNum
    );

    return {
      title: mediaTitle,
      year: releaseYear,
      releaseYear,
      imdbId: movieOrShow?.imdb_id,
      ...(type === 'tv'
        ? {
            season: resolvedSeasonNum,
            episode: resolvedEpisodeNum,
            seasonId: currentSeasonObj?.id,
            episodeId: currentEpisodeObj?.id,
          }
        : {}),
    };
  }, [movieOrShow, seasonEpisodes, resolvedSeasonNum, resolvedEpisodeNum, type]);

  // Auto-switch sources callback
  const autoSwitchSources = useCallback(
    async (failedProviderId) => {
      if (failedProviderId) {
        failedProvidersRef.current.add(failedProviderId);
      }
      setSourcesLoading(true);
      setSourcesError(null);

      try {
        const targetId = resolvedId || initialId;
        const opts = {
          startFrom: failedProviderId,
          exclude: Array.from(failedProvidersRef.current),
          ...playbackOptions,
        };
        const data = await getPlaySources(type, targetId, opts, handleScrapeProgress);
        const hasSources = (data?.sources || []).length > 0;
        if (data?.success || hasSources) {
          setDirectSources(data);
          setSourcesError(null);
          return true;
        }
        setSourcesError('No more stream sources available.');
        return false;
      } catch (err) {
        console.warn('[EmbedPlayer] autoSwitchSources error:', err);
        setSourcesError(err?.message || 'Error auto-switching providers.');
        return false;
      } finally {
        setSourcesLoading(false);
      }
    },
    [type, resolvedId, initialId, playbackOptions, handleScrapeProgress]
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
        const targetId = resolvedId || initialId;
        const data = await getPlaySources(type, targetId, opts, handleScrapeProgress);
        if (data?.success || (data?.sources || []).length > 0) {
          setDirectSources(data);
          setSourcesError(null);
          return true;
        }
        return false;
      } catch (err) {
        console.warn(`[EmbedPlayer] Extractor ${providerId} failed:`, err);
        return false;
      } finally {
        setSourcesLoading(false);
      }
    },
    [type, resolvedId, initialId, playbackOptions, handleScrapeProgress]
  );

  const retrySources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(null);
    failedProvidersRef.current.clear();

    try {
      const opts = { ...playbackOptions };
      const targetId = resolvedId || initialId;
      const data = await getPlaySources(type, targetId, opts, handleScrapeProgress);
      const hasSources = (data?.sources || []).length > 0;
      if (data?.success || hasSources) {
        setDirectSources(data);
        setSourcesError(null);
        return true;
      }
      throw new Error('Providers did not return a stream.');
    } catch (err) {
      setSourcesError(err?.message || 'Providers are taking longer than usual.');
      return false;
    } finally {
      setSourcesLoading(false);
    }
  }, [type, resolvedId, initialId, playbackOptions, handleScrapeProgress]);

  // Navigate to next episode
  const seasons = movieOrShow?.seasons?.filter((item) => item.season_number > 0) || [];
  const currentSeason = seasons.find((item) => item.season_number === resolvedSeasonNum);
  const episodeCount = currentSeason?.episode_count || seasonEpisodes.length || 0;

  const hasNextEpisode = useMemo(() => {
    if (type !== 'tv') return false;
    if (seasonEpisodes && seasonEpisodes.length > 0) {
      if (seasonEpisodes.some((ep) => Number(ep.episode_number) === resolvedEpisodeNum + 1)) {
        return true;
      }
    } else if (episodeCount > 0 && resolvedEpisodeNum < episodeCount) {
      return true;
    }
    const nextSeason = seasons.find((s) => Number(s.season_number) === resolvedSeasonNum + 1);
    if (nextSeason && (nextSeason.episode_count == null || nextSeason.episode_count > 0)) {
      return true;
    }
    return false;
  }, [type, resolvedEpisodeNum, seasonEpisodes, episodeCount, resolvedSeasonNum, seasons]);

  const navigateToEpisode = useCallback(
    (nextSeason, nextEpisode) => {
      const base = `/embed/tv/${resolvedId || initialId}/${nextSeason}/${nextEpisode}`;
      const search = searchParams.toString();
      router.push(search ? `${base}?${search}` : base);
    },
    [router, resolvedId, initialId, searchParams]
  );

  const handleNextEpisode = useCallback(() => {
    if (type !== 'tv') return;
    const nextEpNum = resolvedEpisodeNum + 1;
    if (seasonEpisodes.some((ep) => Number(ep.episode_number) === nextEpNum)) {
      navigateToEpisode(resolvedSeasonNum, nextEpNum);
      return;
    }
    if (episodeCount > 0 && nextEpNum <= episodeCount) {
      navigateToEpisode(resolvedSeasonNum, nextEpNum);
      return;
    }
    const nextSeason = seasons.find((s) => Number(s.season_number) === resolvedSeasonNum + 1);
    if (nextSeason) {
      navigateToEpisode(nextSeason.season_number, 1);
      return;
    }
    navigateToEpisode(resolvedSeasonNum, nextEpNum);
  }, [type, resolvedSeasonNum, resolvedEpisodeNum, seasonEpisodes, episodeCount, seasons, navigateToEpisode]);

  const displayTitle = movieOrShow?.title || movieOrShow?.name || '';
  const currentEpisodeData = seasonEpisodes.find((ep) => ep.episode_number === resolvedEpisodeNum);
  const episodeStillUrl = currentEpisodeData?.still_path
    ? `https://image.tmdb.org/t/p/w780${currentEpisodeData.still_path}`
    : null;
  const backdropUrl =
    episodeStillUrl ||
    (movieOrShow?.backdrop_path ? `https://image.tmdb.org/t/p/original${movieOrShow.backdrop_path}` : '') ||
    movieOrShow?.backdrop ||
    '';

  // Handle DMCA notice
  if (isBlocked) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          bgcolor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'common.white',
          p: 2,
        }}
      >
        <DmcaNotice title={displayTitle} type={type} />
      </Box>
    );
  }

  // Handle fatal error (ID not found, etc.)
  if (loadError && !isLoading && !sourcesLoading && (!directSources?.sources || directSources.sources.length === 0)) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          bgcolor: '#0a0a0a',
          color: 'common.white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          textAlign: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'error.main' }}>
          Stream Unavailable
        </Typography>
        <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.65), maxWidth: 420 }}>
          {loadError || 'The requested video could not be found or loaded.'}
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={() => retrySources()}
          sx={{ borderColor: alpha('#ffffff', 0.2), mt: 1 }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        maxWidth: '100%',
        maxHeight: '100%',
        position: 'fixed',
        inset: 0,
        bgcolor: '#000000',
        overflow: 'hidden',
        zIndex: 1,
        // Optional accent color override if provided via ?color= or ?theme=
        ...(customThemeColor && {
          '--player-brand-color': `#${customThemeColor.replace(/^#/, '')}`,
        }),
      }}
    >
      <Player
        title={displayTitle}
        type={type}
        id={resolvedId || initialId}
        tmdbId={resolvedId || initialId}
        season={resolvedSeasonNum}
        episode={resolvedEpisodeNum}
        backdrop={backdropUrl}
        poster={
          movieOrShow?.poster_path
            ? `https://image.tmdb.org/t/p/w500${movieOrShow.poster_path}`
            : movieOrShow?.poster || null
        }
        cast={movieOrShow?.cast || movieOrShow?.credits?.cast || []}
        seasons={seasons}
        seasonEpisodes={seasonEpisodes}
        seasonEpisodesLoading={seasonEpisodesLoading}
        onSelectEpisode={(s, ep) => navigateToEpisode(s, ep)}
        src={movieOrShow?.videoUrl}
        servers={movieOrShow?.servers || []}
        directSources={directSources}
        subtitles={[...(directSources?.subtitles || []), ...openSubtitles]}
        timelineSegments={timelineSegments}
        extractorProviders={CLIENT_SCRAPER_CONFIG}
        activeExtractorId={directSources?.provider || null}
        sourcesLoading={sourcesLoading}
        loading={isLoading}
        sourcesError={sourcesError}
        scrapeFeedback={scrapeFeedback}
        onSelectExtractor={selectExtractor}
        onAutoSwitch={autoSwitchSources}
        onPlaybackSuccess={() => {
          failedProvidersRef.current.clear();
          broadcastEvent('play');
        }}
        onRetrySources={retrySources}
        hasNextEpisode={hasNextEpisode}
        onNextEpisode={autoNextEpisode ? handleNextEpisode : null}
        allowEmbedMode={true}
        onBack={null} // Embed player has no back button
        height="100%"
        aspectRatio="unset"
        containerSx={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
        }}
      />
    </Box>
  );
}

export default EmbedPlayerView;
