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
  sourcesError = null,
  onSelectExtractor,
  onRetrySources,
  allowEmbedMode = true,
  title,
  season,
  episode,
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

  // Initialize mode from localStorage on mount
  useEffect(() => {
    const stored = getStoredMode();
    if (allowEmbedMode && stored === 'native' && directSources.length === 0 && !sourcesLoading) {
      setPlaybackMode('embed');
    } else {
      setPlaybackMode(stored);
    }
  }, [directSources.length, sourcesLoading]);

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
  }, [nativeSrc[0]?.src, effectiveSelectedExtractor]);

  const resolvedMode =
    allowEmbedMode &&
    playbackMode === 'native' &&
    !effectiveSelectedExtractor &&
    !nativeReady &&
    !sourcesLoading &&
    !sourcesError &&
    embedAvailable
      ? 'embed'
      : playbackMode;

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
          if (!ok) setPlaybackError('This direct stream could not be loaded.');
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
    [resolvedMode, onSelectExtractor]
  );

  const scrapingNative = resolvedMode === 'native' && !nativeReady && sourcesLoading;
  const showSpinner = !playbackError && (scrapingNative || isLoading);
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
      if (!ok) setPlaybackError('This direct stream could not be loaded.');
    } else if (onRetrySources) {
      await onRetrySources();
      setIsLoading(false);
    }
  }, [effectiveSelectedExtractor, onRetrySources, onSelectExtractor, resolvedMode]);

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
                if (autoRetryCountRef.current < 2) {
                  autoRetryCountRef.current += 1;
                  setIsAutoRetrying(true);
                  setIsLoading(true);
                  setPlaybackError(null);
                  retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null;
                    setPlaybackAttempt((attempt) => attempt + 1);
                  }, 900);
                  return;
                }

                setIsAutoRetrying(false);
                setIsLoading(false);
                setPlaybackError(
                  allowEmbedMode
                    ? 'The direct stream failed after automatic retries. Try another provider or switch to Embed.'
                    : 'The direct stream failed after automatic retries. Try another provider.'
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

    // Empty state
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ position: 'relative', zIndex: 1, height: 1, color: 'text.disabled', p: 3 }}
      >
        <Iconify icon="solar:videocamera-broken" width={56} sx={{ color: alpha('#ffffff', 0.3) }} />
        <Typography variant="h6" sx={{ color: 'common.white' }}>
          {sourcesError ? 'Still searching for a stream' : 'No streaming source available'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', maxWidth: 400 }}>
          {sourcesError
            ? 'Some providers can take a little longer to wake up. Keep this page open and try again without leaving playback.'
            : 'Direct streams could not be resolved for this title. Try selecting an alternative provider or switch to embed.'}
        </Typography>
        {sourcesError && onRetrySources && (
          <Button
            variant="contained"
            onClick={handleRetry}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            Search again
          </Button>
        )}
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
            spacing={2}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              bgcolor: alpha('#050709', 0.75),
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={68} thickness={3} sx={{ color: 'primary.main' }} />
              <Iconify
                icon="solar:play-stream-bold-duotone"
                width={28}
                sx={{
                  position: 'absolute',
                  color: 'common.white',
                  animation: 'youplex-glow-pulse 2s ease-in-out infinite',
                }}
              />
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'common.white',
                fontWeight: 600,
                letterSpacing: 0.3,
                minWidth: { xs: 210, sm: 280 },
                textAlign: 'center',
              }}
            >
              {spinnerLabel}
              <Box component="span" sx={{ color: 'primary.light', ml: 0.25 }}>
                …
              </Box>
            </Typography>
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

      {/* Subtle Player Info & Hint Bar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{
          mt: 1.5,
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          bgcolor: alpha('#ffffff', 0.03),
          border: `1px solid ${alpha('#ffffff', 0.06)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Iconify
            icon={resolvedMode === 'native' ? 'solar:verified-check-bold' : 'solar:code-circle-bold'}
            width={16}
            sx={{
              color: resolvedMode === 'native' ? 'primary.light' : 'warning.light',
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: 12 }}>
            {resolvedMode === 'native'
              ? allowEmbedMode
                ? 'Playing high quality direct stream. Switch to Embed if you experience buffering.'
                : 'Playing high quality direct stream.'
              : 'Playing via embed server. Switch to Native for direct streams with subtitles.'}
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: 11,
            display: { xs: 'none', sm: 'block' },
            flexShrink: 0,
          }}
        >
          Press <Box component="span" sx={{ color: 'common.white', fontWeight: 600 }}>F</Box> for Fullscreen •{' '}
          <Box component="span" sx={{ color: 'common.white', fontWeight: 600 }}>Space</Box> to Play/Pause
        </Typography>
      </Stack>
    </Box>
  );
}
