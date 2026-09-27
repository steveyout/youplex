'use client';

import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/captions.css';

import { Iconify } from '@/components/iconify';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Track, Captions, MediaPlayer, MediaProvider } from '@vidstack/react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

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

function getStoredMode() {
  if (typeof window === 'undefined') return 'native';
  try {
    return localStorage.getItem(MODE_KEY) || 'native';
  } catch (e) {
    return 'native';
  }
}

function storeMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch (e) {
    // storage unavailable
  }
}

function toMime(sourceType) {
  const t = String(sourceType || '').toLowerCase();
  if (t.includes('mpegurl') || t === 'hls') return 'application/x-mpegurl';
  if (t.includes('dash') || t === 'dash') return 'application/dash+xml';
  if (t.includes('mp4') || t === 'video/mp4') return 'video/mp4';
  if (t.includes('webm')) return 'video/webm';
  return 'video/mp4';
}

function toProxyUrl(source) {
  if (!source?.url) return '';
  if (source.alreadyProxied) return source.url;
  const params = new URLSearchParams({ url: source.url });
  if (source.referer) params.set('referer', source.referer);
  if (source.origin) params.set('origin', source.origin);
  if (source.userAgent) params.set('ua', source.userAgent);
  if (source.tokenUrl) params.set('tokenUrl', source.tokenUrl);
  return `/api/hls?${params.toString()}`;
}

function toVidstackSrcs(sources) {
  const seen = new Set();
  return (sources || [])
    .filter((s) => s?.url)
    .filter((s) => {
      const key = s.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({
      src: toProxyUrl(s),
      type: toMime(s.type),
      ...(s.quality ? { quality: String(s.quality) } : {}),
    }));
}

// ----------------------------------------------------------------------

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
  onSelectExtractor,
  onRetrySources,
  allowEmbedMode = true,
  title,
  season,
  episode,
  backdrop,
  type,
  onBack,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [playbackMode, setPlaybackMode] = useState('native');
  const [selectedEmbedId, setSelectedEmbedId] = useState(null);
  const [selectedExtractorId, setSelectedExtractorId] = useState(null);
  const [failedExtractorId, setFailedExtractorId] = useState(null);
  const [playbackError, setPlaybackError] = useState(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const autoRetryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const [embedSrvAnchor, setEmbedSrvAnchor] = useState(null);
  const [embedHeaderVisible, setEmbedHeaderVisible] = useState(true);

  // Initialize mode: ALWAYS start with 'native' unless user previously chose otherwise
  useEffect(() => {
    const stored = getStoredMode();
    if (stored === 'embed') {
      setPlaybackMode('embed');
    } else {
      setPlaybackMode('native');
    }
  }, []);

  // All native sources mapped to the Vidstack src array
  const nativeSrc = useMemo(() => toVidstackSrcs(directSources), [directSources]);

  // Determine active embed URL
  const activeEmbedUrl = useMemo(() => {
    if (playbackMode === 'embed') {
      const embedServer = servers.find((s) => s.id === selectedEmbedId);
      return embedServer?.url || src;
    }
    return src;
  }, [playbackMode, servers, selectedEmbedId, src]);

  const effectiveSelectedExtractor = selectedExtractorId ?? activeExtractorId;
  const embedAvailable = allowEmbedMode && (Boolean(src) || servers.length > 0);
  const nativeReady = nativeSrc.length > 0;
  const activeNativeSrc = nativeSrc[0]?.src;

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

  const resolvedMode = playbackMode;

  // Build server list based on mode
  const serverList = useMemo(() => {
    if (resolvedMode === 'native') {
      return extractorProviders.map((ep) => ({
        id: ep.id,
        name: extractorAlias(ep.id),
        kind: 'extractor',
      }));
    }
    return servers.map((s) => ({
      id: s.id,
      name: s.name,
      kind: 'embed',
      url: s.url,
    }));
  }, [resolvedMode, extractorProviders, servers]);

  // Current server label
  const currentServerLabel = useMemo(() => {
    if (resolvedMode === 'native') {
      const active = extractorProviders.find((e) => e.id === effectiveSelectedExtractor);
      return active ? extractorAlias(active.id) : 'Native Player';
    }
    const embedServer = servers.find((s) => s.id === selectedEmbedId);
    return embedServer?.name || (servers[0]?.name ?? 'Embed Server');
  }, [resolvedMode, servers, selectedEmbedId, extractorProviders, effectiveSelectedExtractor]);

  const handleModeChange = useCallback((newMode) => {
    if (newMode && newMode !== playbackMode) {
      setPlaybackMode(newMode);
      storeMode(newMode);
      setIsLoading(true);
      setPlaybackError(null);
      setPlaybackAttempt((attempt) => attempt + 1);
    }
  }, [playbackMode]);

  const handleSelectServer = useCallback(
    async (server) => {
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
            if (allowEmbedMode && embedAvailable) {
              setPlaybackMode('embed');
            } else {
              setPlaybackError('This direct stream could not be loaded.');
            }
          }
        } else {
          setIsLoading(false);
        }
      } else {
        setSelectedEmbedId(server.id);
        setIsLoading(true);
        setPlaybackError(null);
        setPlaybackAttempt((attempt) => attempt + 1);
      }
    },
    [resolvedMode, onSelectExtractor, allowEmbedMode, embedAvailable]
  );

  const scrapingNative = resolvedMode === 'native' && !nativeReady && sourcesLoading;
  const showSpinner = !playbackError && (loading || scrapingNative || isLoading);
  const activeProviderName = useMemo(() => {
    if (effectiveSelectedExtractor === 'dlhd') return 'DLHD';

    const provider = extractorProviders.find((item) => item.id === effectiveSelectedExtractor);
    if (provider?.label) return provider.label;

    return effectiveSelectedExtractor
      ? String(effectiveSelectedExtractor)
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
      : 'stream';
  }, [effectiveSelectedExtractor, extractorProviders]);

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

  const spinnerLabel = typedLoadingLabel || loadingPhrases[0];

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
              // Keep native controls above the error layer so the provider
              // selector remains usable after a stream fails.
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
              onError={() => {
                if (autoRetryCountRef.current < 1) {
                  autoRetryCountRef.current += 1;
                  setIsAutoRetrying(true);
                  setIsLoading(true);
                  setPlaybackError(null);
                  retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null;
                    setPlaybackAttempt((attempt) => attempt + 1);
                  }, 800);
                  return;
                }

                setIsAutoRetrying(false);
                setIsLoading(false);
                // Auto fallback to embed if native stream fails
                if (allowEmbedMode && embedAvailable) {
                  setPlaybackMode('embed');
                  setPlaybackError(null);
                  setIsLoading(true);
                } else {
                  setPlaybackError(
                    allowEmbedMode
                      ? 'The direct stream failed after automatic retries. Try another provider or switch to Embed.'
                      : 'The direct stream failed after automatic retries. Try another provider.'
                  );
                }
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
                sourcesLoading={sourcesLoading}
                onModeChange={handleModeChange}
                handleSelectServer={handleSelectServer}
                currentServerLabel={currentServerLabel}
              />
            </MediaPlayer>
          </Box>
        );
      }

      if (sourcesLoading) return null;
    }

    // EMBED MODE: iframe with glass header overlay
    if (allowEmbedMode && resolvedMode === 'embed' && activeEmbedUrl) {
      return (
        <Box
          onMouseEnter={() => setEmbedHeaderVisible(true)}
          onMouseLeave={() => setEmbedHeaderVisible(false)}
          sx={{ position: 'absolute', inset: 0, zIndex: 1 }}
        >
          {/* Embed Header Overlay */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              p: 1.5,
              zIndex: 3,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
              opacity: embedHeaderVisible ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            <Typography variant="subtitle2" sx={{ color: 'common.white', fontWeight: 600 }}>
              {title || 'Embed Playback'}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1}>
              {/* Mode Toggle */}
              <Box
                sx={{
                  bgcolor: alpha('#0d1117', 0.8),
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${alpha('#ffffff', 0.12)}`,
                  p: 0.5,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  onClick={() => handleModeChange('native')}
                  sx={{
                    cursor: 'pointer',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 2.5,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: alpha('#ffffff', 0.7),
                    '&:hover': { color: 'common.white', bgcolor: alpha('#ffffff', 0.1) },
                  }}
                >
                  <Iconify icon="solar:play-bold" width={13} />
                  <span>Native</span>
                </Box>
                <Box
                  sx={{
                    cursor: 'default',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 2.5,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'common.white',
                    bgcolor: 'primary.main',
                    boxShadow: `0 2px 10px ${alpha('#FF3030', 0.45)}`,
                  }}
                >
                  <Iconify icon="solar:code-bold" width={13} />
                  <span>Embed</span>
                </Box>
              </Box>

              {/* Server selector */}
              {serverList.length > 0 && (
                <>
                  <Box
                    onClick={(e) => setEmbedSrvAnchor(e.currentTarget)}
                    sx={{
                      bgcolor: alpha('#0d1117', 0.8),
                      backdropFilter: 'blur(16px)',
                      border: `1px solid ${alpha('#ffffff', 0.12)}`,
                      cursor: 'pointer',
                      px: 1.75,
                      py: 0.6,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: 'common.white',
                      '&:hover': { bgcolor: alpha('#ffffff', 0.18) },
                    }}
                  >
                    <Iconify icon="solar:server-square-bold" width={14} sx={{ color: 'primary.light' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12 }}>
                      {currentServerLabel}
                    </Typography>
                    <Iconify icon="solar:alt-arrow-down-bold" width={12} sx={{ opacity: 0.7 }} />
                  </Box>

                  <Menu
                    anchorEl={embedSrvAnchor}
                    open={Boolean(embedSrvAnchor)}
                    onClose={() => setEmbedSrvAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                      paper: {
                        sx: {
                          bgcolor: alpha('#0d1117', 0.95),
                          backdropFilter: 'blur(20px)',
                          border: `1px solid ${alpha('#ffffff', 0.12)}`,
                          p: 1.25,
                          borderRadius: 2.5,
                          width: 280,
                        },
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ px: 1.5, py: 0.5, display: 'block', color: 'text.disabled', fontWeight: 700 }}
                    >
                      Select Embed Server
                    </Typography>
                    <Divider sx={{ my: 0.75, borderColor: alpha('#ffffff', 0.12) }} />
                    {serverList.map((server) => (
                      <MenuItem
                        key={server.id}
                        onClick={() => {
                          handleSelectServer(server);
                          setEmbedSrvAnchor(null);
                        }}
                        selected={selectedEmbedId === server.id}
                        sx={{
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 1,
                          justifyContent: 'space-between',
                          '&.Mui-selected': { bgcolor: alpha('#FF3030', 0.18) },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Iconify icon="solar:server-square-bold" width={18} sx={{ color: 'primary.light' }} />
                          <Typography variant="subtitle2">{server.name}</Typography>
                        </Stack>
                        {selectedEmbedId === server.id && (
                          <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'primary.light' }} />
                        )}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Stack>
          </Stack>

          <iframe
            key={`${activeEmbedUrl}-${playbackAttempt}`}
            src={activeEmbedUrl}
            width="100%"
            height="100%"
            allowFullScreen
            title="Media player"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
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

        {/* Loading / Buffering Overlay */}
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
                  bgcolor: alpha('#FF3030', 0.2),
                  filter: 'blur(16px)',
                  animation: 'youplex-radar-pulse 2.2s ease-in-out infinite',
                }}
              />
              <CircularProgress
                size={72}
                thickness={2.8}
                sx={{
                  color: 'primary.main',
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

            {allowEmbedMode && resolvedMode === 'native' && (
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
                  px: 1.8,
                  '&:hover': {
                    color: 'common.white',
                    borderColor: 'primary.main',
                    bgcolor: alpha('#FF3030', 0.15),
                  },
                }}
              >
                Switch to Instant Embed Player
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
