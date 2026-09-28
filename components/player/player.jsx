'use client';

import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/captions.css';

import { Iconify } from '@/components/iconify';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Track, Captions, MediaPlayer, MediaProvider } from '@vidstack/react';
import { providers as defaultProviders, getEmbedUrl, DEFAULT_PROVIDER_ID } from '@/config/providers';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';

import { getIntroTimestamps } from '@/actions/api';
import NativeControls from './native-controls';

// ----------------------------------------------------------------------

const MODE_KEY = 'youplex-playback-mode';

const BRAND_COLOR = '#FF3030';

/**
 * Disguise real extractor names in the UI with a fixed pool of neutral alias
 * words. The alias for a provider is derived from a stable hash of its id.
 */
const EXTRACTOR_ALIASES = [
  'Aurora',
  'Nova',
  'Polaris',
  'Orbit',
  'Zenith',
  'Vega',
  'Atlas',
  'Phoenix',
  'Pulsar',
  'Meridian',
  'Quasar',
  'Titan',
  'Solstice',
  'Comet',
  'Drift',
  'Eclipse',
];

function hashId(value) {
  const text = String(value ?? '');
  return Array.from(text).reduce((hash, ch) => Math.imul(hash, 31) + ch.charCodeAt(0), 0);
}

function extractorAlias(id) {
  const hash = Math.abs(hashId(id));
  return EXTRACTOR_ALIASES[hash % EXTRACTOR_ALIASES.length];
}

/**
 * Map direct stream objects into Vidstack source format.
 * If alreadyProxied is true, the URL is used directly.
 */
function toVidstackSrcs(sources) {
  const list = Array.isArray(sources) ? sources : sources?.sources;
  if (!list || !Array.isArray(list) || list.length === 0) return [];

  return list
    .filter((s) => Boolean(s?.url))
    .map((s) => {
      const isAlreadyProxied =
        s.alreadyProxied ||
        s.url?.includes('youplex.site') ||
        s.url?.includes('/proxy') ||
        s.url?.includes('/api/hls');
      const srcUrl = isAlreadyProxied ? s.url : toProxyUrl(s);

      if (s.type === 'hls' || srcUrl.includes('.m3u8')) {
        return { src: srcUrl, type: 'application/x-mpegurl' };
      }
      return { src: srcUrl, type: 'video/mp4' };
    });
}

function toProxyUrl(source) {
  if (!source?.url) return '';
  if (
    source.alreadyProxied ||
    source.url.includes('/proxy') ||
    source.url.includes('/api/hls') ||
    source.url.includes('youplex.site')
  ) {
    return source.url;
  }

  const url = source.url;
  const isDirectHls = url.includes('.m3u8') || source.type === 'hls';

  if (isDirectHls) {
    const params = new URLSearchParams({ url });
    if (source.headers?.referer) params.set('referer', source.headers.referer);
    return `/api/hls?${params.toString()}`;
  }

  return url;
}

function getStoredMode() {
  if (typeof window === 'undefined') return 'native';
  try {
    return localStorage.getItem(MODE_KEY) || 'native';
  } catch {
    return 'native';
  }
}

function storeMode(mode) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
}

export default function Player({
  src,
  servers = [],
  directSources = [],
  subtitles = [],
  extractorProviders = [],
  activeExtractorId = null,
  sourcesLoading = false,
  loading = false,
  sourcesError = null,
  scrapeFeedback = null,
  onSelectExtractor,
  onRetrySources,
  allowEmbedMode = true,
  title,
  season,
  episode,
  backdrop,
  type,
  id,
  tmdbId,
  onBack,
  timelineSegments: initialTimelineSegments = [],
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [playbackMode, setPlaybackMode] = useState('native');
  const [selectedEmbedId, setSelectedEmbedId] = useState(null);
  const [selectedExtractorId, setSelectedExtractorId] = useState(null);
  const [failedExtractorId, setFailedExtractorId] = useState(null);
  const [playbackError, setPlaybackError] = useState(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState(null);
  const autoRetryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const [embedSrvAnchor, setEmbedSrvAnchor] = useState(null);
  const [embedHeaderVisible, setEmbedHeaderVisible] = useState(true);

  // Initialize mode: ALWAYS start with 'native' unless user previously chose otherwise
  useEffect(() => {
    const stored = getStoredMode();
    if (stored === 'embed') {
      setPlaybackMode('embed');
      setIsLoading(false);
    } else {
      setPlaybackMode('native');
    }
  }, []);

  const resolvedTmdbId = tmdbId || id;
  const resolvedSeasonNum = Number(season || 1);
  const resolvedEpisodeNum = Number(episode || 1);

  const [timelineSegments, setTimelineSegments] = useState(initialTimelineSegments || []);
  const [videoDurationMs, setVideoDurationMs] = useState(null);
  const lastTimestampsKeyRef = useRef('');

  useEffect(() => {
    if (initialTimelineSegments && initialTimelineSegments.length > 0) {
      setTimelineSegments(initialTimelineSegments);
      return;
    }

    if (!resolvedTmdbId) {
      setTimelineSegments([]);
      return;
    }

    const isTv = type === 'tv';
    const requestKey = `${resolvedTmdbId}:${type || 'movie'}:${isTv ? resolvedSeasonNum : 'm'}:${isTv ? resolvedEpisodeNum : 'm'}:${videoDurationMs || 'none'}`;
    if (lastTimestampsKeyRef.current === requestKey) {
      return;
    }
    lastTimestampsKeyRef.current = requestKey;

    let active = true;

    getIntroTimestamps({
      tmdbId: resolvedTmdbId,
      type: type || 'movie',
      ...(isTv ? { season: resolvedSeasonNum, episode: resolvedEpisodeNum } : {}),
      ...(videoDurationMs ? { durationMs: videoDurationMs } : {}),
    })
      .then((res) => {
        if (active && res?.success && Array.isArray(res.segments)) {
          setTimelineSegments(res.segments);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum, videoDurationMs]);

  // All native sources mapped to the Vidstack src array
  const nativeSrc = useMemo(() => toVidstackSrcs(directSources), [directSources]);
  const nativeReady = nativeSrc.length > 0;

  // Once native stream is mapped and ready, dismiss loading
  useEffect(() => {
    if (nativeReady) {
      setIsLoading(false);
    }
  }, [nativeReady]);
  const activeNativeSrc = nativeSrc[0]?.src;
  const resolvedMode = playbackMode;

  // Build server list based on mode
  const serverList = useMemo(() => {
    if (resolvedMode === 'native') {
      return extractorProviders.map((ep) => ({
        id: ep.id,
        name: (ep.label || extractorAlias(ep.id)).replace(/\s*\([^)]*\)/g, '').trim(),
        kind: 'extractor',
      }));
    }
    const baseProviders = servers && servers.length > 0 ? servers : defaultProviders.filter((p) => p.enabled);
    return baseProviders.map((s) => ({
      id: s.id,
      name: (s.name || '').replace(/\s*\([^)]*\)/g, '').trim(),
      kind: 'embed',
      url: resolvedTmdbId
        ? getEmbedUrl(s.id, type, resolvedTmdbId, resolvedSeasonNum, resolvedEpisodeNum)
        : s.url || src,
    }));
  }, [resolvedMode, extractorProviders, servers, resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum, src]);

  // Determine active embed URL
  const activeEmbedUrl = useMemo(() => {
    if (playbackMode === 'embed') {
      const targetId = selectedEmbedId || servers[0]?.id || DEFAULT_PROVIDER_ID;
      const matched = serverList.find((s) => s.id === targetId);
      if (matched?.url) return matched.url;

      if (resolvedTmdbId) {
        return getEmbedUrl(DEFAULT_PROVIDER_ID, type, resolvedTmdbId, resolvedSeasonNum, resolvedEpisodeNum);
      }
      return src;
    }
    return src;
  }, [playbackMode, selectedEmbedId, servers, serverList, resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum, src]);

  const effectiveSelectedExtractor = selectedExtractorId ?? activeExtractorId;
  const embedAvailable = allowEmbedMode && (Boolean(activeEmbedUrl) || Boolean(src) || servers.length > 0);

  // Auto-clear embed loading indicator after 1500ms max so player is never stuck behind a loader
  useEffect(() => {
    if (resolvedMode === 'embed') {
      setIsLoading(false);
      const timer = setTimeout(() => {
        setEmbedLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [resolvedMode, activeEmbedUrl]);

  // Auto-fallback to Embed when native providers fail or return no streams
  useEffect(() => {
    if (
      allowEmbedMode &&
      embedAvailable &&
      resolvedMode === 'native' &&
      !sourcesLoading &&
      !nativeReady
    ) {
      setAutoSwitchNotice('Native streams unavailable. Switched to Embed Player.');
      setTimeout(() => setAutoSwitchNotice(null), 4500);
      setPlaybackMode('embed');
      setIsLoading(false);
      setPlaybackError(null);
    }
  }, [
    allowEmbedMode,
    embedAvailable,
    resolvedMode,
    sourcesLoading,
    nativeReady,
  ]);

  useEffect(() => {
    autoRetryCountRef.current = 0;
    setIsAutoRetrying(false);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [activeNativeSrc, effectiveSelectedExtractor]);

  // Current server label
  const currentServerLabel = useMemo(() => {
    if (resolvedMode === 'native') {
      const active = extractorProviders.find((e) => e.id === effectiveSelectedExtractor);
      return active ? (active.label || extractorAlias(active.id)) : 'Native Player';
    }
    const embedServer = serverList.find((s) => s.id === selectedEmbedId);
    return embedServer?.name || serverList[0]?.name || (servers[0]?.name ?? 'Embed Server');
  }, [resolvedMode, serverList, selectedEmbedId, extractorProviders, effectiveSelectedExtractor, servers]);

  const handleModeChange = useCallback((newMode) => {
    if (newMode && newMode !== playbackMode) {
      setPlaybackMode(newMode);
      storeMode(newMode);
      setPlaybackError(null);
      setAutoSwitchNotice(null);
      if (newMode === 'native') {
        setIsLoading(true);
      } else {
        setIsLoading(false);
        setEmbedLoading(true);
      }
      setPlaybackAttempt((attempt) => attempt + 1);
    }
  }, [playbackMode]);

  const handleSelectServer = useCallback(
    async (server, skipAutoNext = false) => {
      if (resolvedMode === 'native') {
        setFailedExtractorId(null);
        setSelectedExtractorId(server.id);
        setPlaybackError(null);
        autoRetryCountRef.current = 0;
        setIsAutoRetrying(false);
        setIsLoading(true);
        if (onSelectExtractor) {
          const ok = await onSelectExtractor(server.id);
          setIsLoading(false);
          setFailedExtractorId(ok ? null : server.id);
          if (!ok) {
            // Auto switch to next extractor if available
            if (!skipAutoNext && extractorProviders.length > 1) {
              const curIdx = extractorProviders.findIndex((ep) => ep.id === server.id);
              const nextEp = extractorProviders[curIdx + 1];
              if (nextEp && nextEp.id !== server.id) {
                const noticeMsg = `${server.name || server.id} unavailable. Auto-trying ${nextEp.label || nextEp.id}...`;
                setAutoSwitchNotice(noticeMsg);
                setTimeout(() => setAutoSwitchNotice(null), 4000);
                await handleSelectServer({ id: nextEp.id, name: nextEp.label, kind: 'extractor' });
                return;
              }
            }

            if (allowEmbedMode && embedAvailable) {
              setAutoSwitchNotice('Native streams unavailable. Switched to Embed Player.');
              setTimeout(() => setAutoSwitchNotice(null), 4000);
              setPlaybackMode('embed');
              setIsLoading(false);
            } else {
              setPlaybackError('This direct stream could not be loaded.');
            }
          }
        } else {
          setIsLoading(false);
        }
      } else {
        setSelectedEmbedId(server.id);
        setEmbedLoading(true);
        setIsLoading(false);
        setPlaybackError(null);
        setPlaybackAttempt((attempt) => attempt + 1);
      }
    },
    [resolvedMode, onSelectExtractor, extractorProviders, allowEmbedMode, embedAvailable]
  );

  // In native mode: show spinner while scraping or buffering
  // In embed mode: NEVER block the iframe with a full-screen opaque spinner!
  const scrapingNative = resolvedMode === 'native' && !nativeReady && sourcesLoading;
  const showSpinner =
    resolvedMode === 'native' &&
    !playbackError &&
    (scrapingNative || (isLoading && !nativeReady) || isAutoRetrying);

  const activeProviderName = useMemo(() => {
    let raw = scrapeFeedback?.activeProviderName;
    if (!raw) {
      if (effectiveSelectedExtractor === 'dlhd') raw = 'DLHD';
      else {
        const provider = extractorProviders.find((item) => item.id === effectiveSelectedExtractor);
        if (provider?.label) raw = provider.label;
        else if (effectiveSelectedExtractor) {
          raw = String(effectiveSelectedExtractor)
            .replace(/^yp-/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
        } else {
          raw = 'stream';
        }
      }
    }
    return String(raw || '').replace(/\s*\([^)]*\)/g, '').trim();
  }, [scrapeFeedback?.activeProviderName, effectiveSelectedExtractor, extractorProviders]);

  const loadingPhrases = useMemo(
    () =>
      isAutoRetrying
        ? [`Retrying ${activeProviderName}`, `Reconnecting to ${activeProviderName}`, 'Recovering stream']
        : scrapingNative
        ? [`Loading ${activeProviderName}`, `Connecting to ${activeProviderName}`, 'Preparing stream']
        : ['Preparing player', 'Loading video', 'Buffering stream'],
    [activeProviderName, isAutoRetrying, scrapingNative]
  );
  const [typedLoadingLabel, setTypedLoadingLabel] = useState('');

  useEffect(() => {
    if (!showSpinner) {
      setTypedLoadingLabel('');
      return undefined;
    }

    let phraseIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer;

    const tick = () => {
      const phrase = loadingPhrases[phraseIndex];

      if (!deleting) {
        characterIndex += 1;
        setTypedLoadingLabel(phrase.slice(0, characterIndex));
        if (characterIndex >= phrase.length) {
          deleting = true;
          timer = setTimeout(tick, 900);
          return;
        }
      } else {
        characterIndex -= 1;
        setTypedLoadingLabel(phrase.slice(0, characterIndex));
        if (characterIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
        }
      }

      timer = setTimeout(tick, deleting ? 35 : 55);
    };

    tick();
    return () => clearTimeout(timer);
  }, [loadingPhrases, showSpinner]);

  const rawSpinnerLabel =
    autoSwitchNotice ||
    (scrapeFeedback?.status === 'switching' ? 'Switching provider...' : scrapeFeedback?.message) ||
    typedLoadingLabel ||
    loadingPhrases[0];

  const spinnerLabel = String(rawSpinnerLabel || '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

  const handleRetry = useCallback(async () => {
    setPlaybackError(null);
    autoRetryCountRef.current = 0;
    setIsAutoRetrying(false);
    setIsLoading(true);
    setPlaybackAttempt((attempt) => attempt + 1);

    if (resolvedMode === 'native' && effectiveSelectedExtractor && onSelectExtractor) {
      const ok = await onSelectExtractor(effectiveSelectedExtractor);
      setIsLoading(false);
      if (!ok) {
        if (allowEmbedMode && embedAvailable) {
          setPlaybackMode('embed');
          setIsLoading(false);
        } else {
          setPlaybackError('This direct stream could not be loaded.');
        }
      }
    } else if (onRetrySources) {
      await onRetrySources();
      setIsLoading(false);
    }
  }, [effectiveSelectedExtractor, onRetrySources, onSelectExtractor, resolvedMode, allowEmbedMode, embedAvailable]);

  // Render Video / Iframe
  const renderPlayer = () => {
    if (resolvedMode === 'native') {
      if (nativeReady) {
        return (
          <Box
            key={`native-${nativeSrc[0].src}-${playbackAttempt}`}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: playbackError ? 12 : 1,
              '& media-player': {
                width: '100%',
                height: '100%',
                '--video-aspect-ratio': '16/9',
              },
            }}
          >
            <MediaPlayer
              src={nativeSrc}
              crossOrigin="anonymous"
              autoPlay
              playsInline
              onCanPlay={() => {
                setIsLoading(false);
                autoRetryCountRef.current = 0;
                setIsAutoRetrying(false);
                setPlaybackError(null);
              }}
              onLoadedData={() => {
                setIsLoading(false);
              }}
              onLoadedMetadata={() => {
                setIsLoading(false);
              }}
              onPlaying={() => {
                setIsLoading(false);
              }}
              onPlay={() => {
                setIsLoading(false);
              }}
              onDurationChange={(detail) => {
                const dur = typeof detail === 'number' ? detail : detail?.detail;
                if (typeof dur === 'number' && Number.isFinite(dur) && dur > 60) {
                  setVideoDurationMs(Math.round(dur * 1000));
                }
              }}
              onError={() => {
                setIsAutoRetrying(false);
                setIsLoading(false);

                // Auto fallback to embed immediately when native stream fails (CORS, 502, dead stream)
                if (allowEmbedMode && embedAvailable) {
                  setAutoSwitchNotice('Native stream unavailable. Switched to Embed Player.');
                  setTimeout(() => setAutoSwitchNotice(null), 4500);
                  setPlaybackMode('embed');
                  setPlaybackError(null);
                  return;
                }

                setPlaybackError(
                  'The direct stream failed across available providers. Try another server.'
                );
              }}
            >
              <MediaProvider>
                {subtitles
                  .filter((t) => t?.url)
                  .filter((track, index, tracks) => tracks.findIndex((item) => item.url === track.url) === index)
                  .map((track, index) => (
                    <Track
                      key={`${track.url}-${index}`}
                      src={toProxyUrl({ url: track.url })}
                      kind="subtitles"
                      label={track.label || track.language || `Track ${index + 1}`}
                      lang={track.language || 'en'}
                      default={index === 0}
                    />
                  ))}
              </MediaProvider>
              <Captions className="youplex-vds-captions vds-captions" />
              <NativeControls
                title={title}
                season={season}
                episode={episode}
                onBack={onBack}
                resolvedMode={resolvedMode}
                allowModeChange={allowEmbedMode}
                serverList={serverList}
                effectiveSelectedExtractor={effectiveSelectedExtractor}
                selectedEmbedId={selectedEmbedId}
                failedExtractorId={failedExtractorId}
                onSelectServer={handleSelectServer}
                onModeChange={handleModeChange}
                timelineSegments={timelineSegments}
              />
            </MediaPlayer>
          </Box>
        );
      }
    }

    if (resolvedMode === 'embed') {
      return (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#000' }}>
          {/* Subtle Embed Controls overlay (top bar) */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              p: { xs: 1, sm: 1.5 },
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: embedHeaderVisible ? 1 : 0,
              pointerEvents: embedHeaderVisible ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {onBack && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={onBack}
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
                  sx={{
                    bgcolor: alpha('#ffffff', 0.15),
                    color: 'common.white',
                    fontSize: 12,
                    px: 1.25,
                    backdropFilter: 'blur(8px)',
                    '&:hover': { bgcolor: alpha('#ffffff', 0.25) },
                  }}
                >
                  Back
                </Button>
              )}
              {title && (
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{
                    color: 'common.white',
                    fontWeight: 600,
                    fontSize: { xs: 12, sm: 14 },
                    maxWidth: { xs: 140, sm: 260 },
                  }}
                >
                  {title} {season ? `• S${season} E${episode}` : ''}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* Embed Server Switcher button */}
              <Button
                size="small"
                variant="contained"
                onClick={(e) => setEmbedSrvAnchor(e.currentTarget)}
                startIcon={<Iconify icon="solar:server-square-bold" width={16} />}
                sx={{
                  bgcolor: alpha('#ffffff', 0.15),
                  color: 'common.white',
                  fontSize: 12,
                  px: 1.25,
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: alpha('#ffffff', 0.25) },
                }}
              >
                {currentServerLabel}
              </Button>

              <Menu
                anchorEl={embedSrvAnchor}
                open={Boolean(embedSrvAnchor)}
                onClose={() => setEmbedSrvAnchor(null)}
                slotProps={{
                  paper: {
                    sx: {
                      bgcolor: '#0d1117',
                      color: 'common.white',
                      border: `1px solid ${alpha('#ffffff', 0.15)}`,
                      minWidth: 160,
                    },
                  },
                }}
              >
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Select Embed Server
                </Typography>
                <Divider sx={{ borderColor: alpha('#ffffff', 0.1) }} />
                {serverList.map((srv) => {
                  const isSelected = (selectedEmbedId || serverList[0]?.id) === srv.id;
                  return (
                    <MenuItem
                      key={srv.id}
                      selected={isSelected}
                      onClick={() => {
                        setEmbedSrvAnchor(null);
                        handleSelectServer(srv);
                      }}
                      sx={{
                        fontSize: 13,
                        color: isSelected ? 'primary.main' : 'common.white',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {srv.name}
                    </MenuItem>
                  );
                })}
              </Menu>

              {/* Mode Toggle Button: Switch back to Native */}
              {allowEmbedMode && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleModeChange('native')}
                  startIcon={<Iconify icon="solar:play-stream-bold-duotone" width={16} />}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    fontSize: 12,
                    px: 1.25,
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  Native Player
                </Button>
              )}
            </Stack>
          </Box>

          {/* Embed Loading indicator (fade out quickly so iframe is never stuck) */}
          {embedLoading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#000',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <CircularProgress size={48} sx={{ color: 'primary.main' }} />
            </Box>
          )}

          <iframe
            key={`embed-${activeEmbedUrl}-${playbackAttempt}`}
            src={activeEmbedUrl}
            width="100%"
            height="100%"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Media player"
            onLoad={() => {
              setIsLoading(false);
              setEmbedLoading(false);
            }}
            onError={() => {
              setIsLoading(false);
              setEmbedLoading(false);
              setPlaybackError('The embed player failed to load. Try another server or switch to Native.');
            }}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, border: 0, overflow: 'hidden' }}
          />
        </Box>
      );
    }

    // Empty state - if native returned empty or error, offer instant embed switch or retry
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ position: 'relative', zIndex: 1, height: 1, color: 'text.disabled', p: 3 }}
      >
        <Iconify icon="solar:videocamera-broken" width={56} sx={{ color: alpha('#ffffff', 0.3) }} />
        <Typography variant="h6" sx={{ color: 'common.white' }}>
          {sourcesError ? 'Native stream unavailable' : 'No direct stream found'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', maxWidth: 420 }}>
          {sourcesError
            ? 'Native scraper could not resolve a stream immediately. You can switch to our fast Embed server or search again.'
            : 'Direct stream could not be loaded. You can switch to embed servers instantly to watch now.'}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {allowEmbedMode && embedAvailable && (
            <Button
              variant="contained"
              onClick={() => handleModeChange('embed')}
              startIcon={<Iconify icon="solar:code-bold" />}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              Switch to Embed Player
            </Button>
          )}
          {onRetrySources && (
            <Button
              variant="outlined"
              onClick={handleRetry}
              startIcon={<Iconify icon="solar:refresh-bold" />}
              sx={{ color: 'common.white', borderColor: alpha('#ffffff', 0.2) }}
            >
              Retry Native
            </Button>
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <Box className="youplex-player" sx={{ width: 1 }}>
      {/* Player Canvas Box */}
      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: '16/9',
          overflow: 'hidden',
          bgcolor: '#050709',
          borderRadius: { xs: 2, sm: 3 },
          border: `1px solid ${alpha('#ffffff', 0.12)}`,
          boxShadow: `0 24px 60px -12px ${alpha('#000000', 0.9)}`,
          '--media-brand': BRAND_COLOR,
          '--media-font-family': '"Public Sans", sans-serif',
          '& media-player': {
            '--media-brand': BRAND_COLOR,
          },
        }}
      >
        {renderPlayer()}

        {/* Floating Auto-Switch Banner Notice */}
        {autoSwitchNotice && (
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 16, sm: 24 },
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              px: 2,
              py: 0.9,
              borderRadius: 3,
              bgcolor: alpha('#050709', 0.92),
              border: `1px solid ${alpha('#FF9800', 0.4)}`,
              boxShadow: `0 8px 32px -4px ${alpha('#000000', 0.8)}`,
              backdropFilter: 'blur(12px)',
              pointerEvents: 'none',
              maxWidth: '90%',
            }}
          >
            <CircularProgress size={16} thickness={4} sx={{ color: 'warning.main' }} />
            <Typography
              variant="caption"
              sx={{ color: 'common.white', fontWeight: 600, fontSize: { xs: 12, sm: 13 } }}
            >
              {autoSwitchNotice}
            </Typography>
          </Box>
        )}

        {/* Loading / Buffering Overlay (ONLY shown in Native mode when scraping or buffering) */}
        {showSpinner && (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2.5}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              bgcolor: alpha('#050709', 0.8),
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              px: 2,
              textAlign: 'center',
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
                  opacity: 0.15,
                  filter: 'blur(20px) brightness(0.6)',
                  transform: 'scale(1.1)',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />
            )}

            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <Box
                sx={{
                  position: 'absolute',
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  bgcolor: alpha(autoSwitchNotice ? '#FF9800' : '#FF3030', 0.2),
                  filter: 'blur(16px)',
                  animation: 'youplex-radar-pulse 2.2s ease-in-out infinite',
                }}
              />
              <CircularProgress
                size={72}
                thickness={2.8}
                sx={{
                  color: autoSwitchNotice ? 'warning.main' : 'primary.main',
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }}
              />
              <Iconify
                icon="solar:play-stream-bold-duotone"
                width={30}
                sx={{
                  position: 'absolute',
                  color: 'common.white',
                  animation: 'youplex-glow-pulse 2s ease-in-out infinite',
                }}
              />
            </Box>

            {/* Live Provider & Scrape Status Badge */}
            {(scrapeFeedback?.activeProviderName || activeProviderName) && (
              <Box
                sx={{
                  zIndex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.75,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: autoSwitchNotice ? alpha('#FF9800', 0.15) : alpha('#FF3030', 0.15),
                  border: `1px solid ${autoSwitchNotice ? alpha('#FF9800', 0.35) : alpha('#FF3030', 0.35)}`,
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: autoSwitchNotice ? 'warning.main' : 'primary.main',
                    animation: 'youplex-glow-pulse 1.2s ease-in-out infinite',
                  }}
                />
                <Typography variant="caption" sx={{ color: 'common.white', fontWeight: 600 }}>
                  {autoSwitchNotice
                    ? autoSwitchNotice
                    : scrapeFeedback?.status === 'switching'
                    ? `Switching provider...`
                    : `Provider: ${scrapeFeedback?.activeProviderName || activeProviderName}`}
                </Typography>
              </Box>
            )}

            {/* Progress Bar with Real-time percentage */}
            <Box sx={{ width: 1, maxWidth: 280, zIndex: 1, my: 0.5 }}>
              <LinearProgress
                variant={scrapeFeedback?.percentage ? 'determinate' : 'indeterminate'}
                value={scrapeFeedback?.percentage || 0}
                sx={{
                  height: 5,
                  borderRadius: 2.5,
                  bgcolor: alpha('#ffffff', 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2.5,
                    background: autoSwitchNotice
                      ? 'linear-gradient(90deg, #FF9800 0%, #FF5722 100%)'
                      : 'linear-gradient(90deg, #FF3030 0%, #FF6060 100%)',
                    transition: 'transform 0.3s ease',
                  },
                }}
              />
            </Box>

            <Stack spacing={0.75} alignItems="center" sx={{ zIndex: 1, maxWidth: 420 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'common.white',
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  fontSize: { xs: 15, sm: 17 },
                }}
              >
                {spinnerLabel}
              </Typography>
              {title && (
                <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.6), fontSize: 12 }}>
                  {title}{season ? ` • S${season} E${episode}` : ''}
                </Typography>
              )}
            </Stack>

            {allowEmbedMode && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleModeChange('embed')}
                startIcon={<Iconify icon="solar:code-bold" width={16} />}
                sx={{
                  zIndex: 1,
                  fontSize: 12,
                  color: 'common.white',
                  borderColor: alpha('#ffffff', 0.25),
                  bgcolor: alpha('#ffffff', 0.06),
                  borderRadius: 2,
                  py: 0.6,
                  px: 1.75,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha('#FF3030', 0.15),
                  },
                }}
              >
                Instant Embed Player
              </Button>
            )}
          </Stack>
        )}

        {playbackError && (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1.5}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 11,
              bgcolor: alpha('#050709', 0.9),
              p: 3,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Stack
              alignItems="center"
              spacing={1.5}
              sx={{ pointerEvents: 'auto' }}
            >
              <Iconify icon="solar:danger-triangle-bold" width={48} sx={{ color: 'error.light' }} />
              <Typography variant="h6" sx={{ color: 'common.white' }}>
                Playback failed
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
                {playbackError}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button variant="contained" onClick={handleRetry} startIcon={<Iconify icon="solar:refresh-bold" />}>
                  Try again
                </Button>
                {allowEmbedMode && (
                  <Button
                    variant="outlined"
                    onClick={() => handleModeChange(resolvedMode === 'native' ? 'embed' : 'native')}
                    startIcon={<Iconify icon={resolvedMode === 'native' ? 'solar:code-bold' : 'solar:play-bold'} />}
                  >
                    Switch to {resolvedMode === 'native' ? 'Embed' : 'Native'}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        )}
      </Box>

      {/* Subtle Player Info & Mode Switcher Bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          mt: 1.5,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderRadius: 2.5,
          bgcolor: alpha('#0d1117', 0.7),
          backdropFilter: 'blur(12px)',
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: resolvedMode === 'native' ? alpha('#FF3030', 0.15) : alpha('#00B8D9', 0.15),
              color: resolvedMode === 'native' ? 'primary.light' : 'info.light',
              flexShrink: 0,
            }}
          >
            <Iconify
              icon={resolvedMode === 'native' ? 'solar:play-stream-bold' : 'solar:code-circle-bold'}
              width={18}
            />
          </Box>
          <Stack spacing={0.2} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ color: 'common.white', fontSize: 13, fontWeight: 600 }}>
              {resolvedMode === 'native' ? 'Native Direct Stream' : `Embed Stream (${currentServerLabel})`}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: 11.5 }}>
              {resolvedMode === 'native'
                ? 'High quality stream with custom subtitles and audio tracks.'
                : 'Zero-buffer fallback embed stream provided by fast mirrors.'}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
          {allowEmbedMode && (
            <Box
              sx={{
                bgcolor: alpha('#ffffff', 0.06),
                border: `1px solid ${alpha('#ffffff', 0.12)}`,
                p: 0.4,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Button
                size="small"
                onClick={() => handleModeChange('native')}
                startIcon={<Iconify icon="solar:play-bold" width={13} />}
                sx={{
                  px: 1.5,
                  py: 0.4,
                  minHeight: 28,
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'none',
                  color: resolvedMode === 'native' ? 'common.white' : alpha('#ffffff', 0.65),
                  bgcolor: resolvedMode === 'native' ? 'primary.main' : 'transparent',
                  boxShadow: resolvedMode === 'native' ? `0 2px 8px ${alpha('#FF3030', 0.4)}` : 'none',
                  '&:hover': {
                    bgcolor: resolvedMode === 'native' ? 'primary.main' : alpha('#ffffff', 0.1),
                    color: 'common.white',
                  },
                }}
              >
                Native
              </Button>
              <Button
                size="small"
                onClick={() => handleModeChange('embed')}
                startIcon={<Iconify icon="solar:code-bold" width={13} />}
                sx={{
                  px: 1.5,
                  py: 0.4,
                  minHeight: 28,
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'none',
                  color: resolvedMode === 'embed' ? 'common.white' : alpha('#ffffff', 0.65),
                  bgcolor: resolvedMode === 'embed' ? 'primary.main' : 'transparent',
                  boxShadow: resolvedMode === 'embed' ? `0 2px 8px ${alpha('#FF3030', 0.4)}` : 'none',
                  '&:hover': {
                    bgcolor: resolvedMode === 'embed' ? 'primary.main' : alpha('#ffffff', 0.1),
                    color: 'common.white',
                  },
                }}
              >
                Embed
              </Button>
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontSize: 11,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box component="span" sx={{ color: 'common.white', fontWeight: 600 }}>F</Box> Fullscreen •{' '}
            <Box component="span" sx={{ color: 'common.white', fontWeight: 600 }}>Space</Box> Pause
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export { Player };
