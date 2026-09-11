'use client';

import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/captions.css';

import { Iconify } from '@/components/iconify';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Track, Captions, MediaPlayer, MediaProvider } from '@vidstack/react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import NativeControls from './native-controls';

// ----------------------------------------------------------------------

const MODE_KEY = 'youplex-playback-mode';

const BRAND_COLOR = '#FF3030';

/**
 * Disguise real extractor names in the UI with a fixed pool of neutral alias
 * words. The alias for a provider is derived from a stable hash of its id, so
 * the same provider always renders the same alias without storing anything.
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
    // storage unavailable (private mode, quota) — non-fatal
  }
}

/**
 * Map a scraper source type (hls/dash/mp4) to a Vidstack MIME type
 * so Vidstack picks the correct provider loader (HLS.js, DASH, native).
 */
function toMime(sourceType) {
  const t = String(sourceType || '').toLowerCase();
  if (t.includes('mpegurl') || t === 'hls') return 'application/x-mpegurl';
  if (t.includes('dash') || t === 'dash') return 'application/dash+xml';
  if (t.includes('mp4') || t === 'video/mp4') return 'video/mp4';
  if (t.includes('webm')) return 'video/webm';
  return 'video/mp4';
}

/**
 * Route a scraper source through the local HLS proxy. CDN hosts reject
 * cross-origin browser fetches (403/CORS), so every native source is relayed
 * server-side where Referer/Origin headers can be applied and CORS added.
 */
function toProxyUrl(source) {
  if (!source?.url) return '';
  const params = new URLSearchParams({ url: source.url });
  if (source.referer) params.set('referer', source.referer);
  if (source.origin) params.set('origin', source.origin);
  if (source.userAgent) params.set('ua', source.userAgent);
  if (source.tokenUrl) params.set('tokenUrl', source.tokenUrl);
  return `/api/hls?${params.toString()}`;
}

/**
 * Build the Vidstack `src` prop from all scraper sources. Passing every
 * quality as an array lets the layout's settings menu switch quality on the
 * fly (Netflix-style) instead of only showing one hard-coded stream.
 */
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

/**
 * Media player with Vidstack integration.
 *
 * Two playback modes:
 *  - native: Uses Vidstack <MediaPlayer> for direct HLS/MP4 sources from scrapers
 *  - embed: Uses <iframe> for provider embed URLs
 *
 * Native mode ships the full Vidstack default layout — play/pause, seek bar,
 * time display, volume, captions, settings (quality/speed/audio gain), PIP,
 * fullscreen, keyboard shortcuts and gestures — themed to match the site.
 */
export default function Player({
  src,
  servers = [],
  directSources = [],
  subtitles = [],
  extractorProviders = [],
  activeExtractorId = null,
  sourcesLoading = false,
  onSelectExtractor,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [playbackMode, setPlaybackMode] = useState('native');
  const [selectedEmbedId, setSelectedEmbedId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedExtractorId, setSelectedExtractorId] = useState(null);
  const [failedExtractorId, setFailedExtractorId] = useState(null);

  // Initialize mode from localStorage on mount
  useEffect(() => {
    const stored = getStoredMode();
    // If native has no direct sources and scraping is finished, use embed.
    if (stored === 'native' && directSources.length === 0 && !sourcesLoading) {
      setPlaybackMode('embed');
    } else {
      setPlaybackMode(stored);
    }
  }, [directSources.length, sourcesLoading]);

  const menuOpen = Boolean(anchorEl);

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

  // The extractor currently in use: whatever the user picked manually, else
  // the one the last scrape actually succeeded with.
  const effectiveSelectedExtractor = selectedExtractorId ?? activeExtractorId;

  // Effective mode: if Native is selected but no direct sources arrived and
  // scraping has finished, fall back to embed instead of showing an empty player.
  const embedAvailable = Boolean(src) || servers.length > 0;
  const nativeReady = nativeSrc.length > 0;
  const resolvedMode =
    playbackMode === 'native' && !effectiveSelectedExtractor && !nativeReady && !sourcesLoading && embedAvailable
      ? 'embed'
      : playbackMode;

  // Build server list based on mode
  const serverList = useMemo(() => {
    if (resolvedMode === 'native') {
      // Extractors are shown under obfuscated alias names so the real
      // provider is not exposed in the UI.
      return extractorProviders.map((ep) => ({
        id: ep.id,
        name: extractorAlias(ep.id),
        kind: 'extractor',
      }));
    }

    // Embed mode: show embed providers
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
    return embedServer?.name || 'Embed Server';
  }, [resolvedMode, servers, selectedEmbedId, extractorProviders, effectiveSelectedExtractor]);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleModeChange = useCallback((_, newMode) => {
    if (newMode !== null) {
      setPlaybackMode(newMode);
      storeMode(newMode);
      setIsLoading(true);
    }
  }, []);

  const handleSelectServer = useCallback(
    async (server) => {
      if (resolvedMode === 'native') {
        // Re-scrape with the chosen extractor provider
        setFailedExtractorId(null);
        setSelectedExtractorId(server.id);
        if (onSelectExtractor) {
          const ok = await onSelectExtractor(server.id);
          setIsLoading(false);
          setFailedExtractorId(ok ? null : server.id);
        } else {
          setIsLoading(false);
        }
      } else {
        setSelectedEmbedId(server.id);
        setIsLoading(true);
      }

      handleCloseMenu();
    },
    [resolvedMode, onSelectExtractor]
  );

  // While the scrapers are still working (or the first frame hasn't fired),
  // show a themed circular spinner instead of a blank/black frame.
  const scrapingNative = resolvedMode === 'native' && !nativeReady && sourcesLoading;
  const showSpinner = scrapingNative || isLoading;
  const spinnerLabel = scrapingNative ? 'Finding native sources…' : 'Loading player…';

  // ----- Mode toggle toolbar -----

  const modeToggle = (
    <ToggleButtonGroup
      value={resolvedMode}
      exclusive
      onChange={handleModeChange}
      size="small"
      sx={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 3,
        '& .MuiToggleButton-root': {
          px: 1.5,
          py: 0.5,
          color: 'common.white',
          textTransform: 'none',
          fontSize: 12,
          fontWeight: 600,
          bgcolor: alpha('#000000', 0.45),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: 'solid 1px',
          borderColor: alpha('#ffffff', 0.16),
          '&:hover': { bgcolor: alpha('#000000', 0.65) },
          '&.Mui-selected': {
            bgcolor: alpha('#ffffff', 0.18),
            color: 'common.white',
            '&:hover': { bgcolor: alpha('#ffffff', 0.25) },
          },
        },
      }}
    >
      <Tooltip title="Native playback" placement="bottom" arrow>
        <ToggleButton value="native">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="solar:play-bold" width={14} />
            <span>Native</span>
          </Stack>
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Embedded player" placement="bottom" arrow>
        <ToggleButton value="embed">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="solar:code-bold" width={14} />
            <span>Embed</span>
          </Stack>
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );

  // ----- Server selector toolbar -----

  const toolbar = (
    <>
      {serverList.length > 0 && (
        <Tooltip title="Change source / extractor" placement="left" arrow>
          <Button
            size="small"
            startIcon={sourcesLoading ? <CircularProgress size={18} sx={{ color: 'primary.main' }} /> : <Iconify icon="solar:server-square-bold" width={18} />}
            endIcon={!sourcesLoading && <Iconify icon="solar:alt-arrow-down-bold" width={14} />}
            onClick={handleOpenMenu}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 3,
              px: { xs: 1.5, sm: 2 },
              py: 0.75,
              color: 'common.white',
              textTransform: 'none',
              borderRadius: 2,
              bgcolor: alpha('#000000', 0.5),
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: 'solid 1px',
              borderColor: alpha('#ffffff', 0.16),
              boxShadow: `0 8px 24px -8px ${alpha('#000000', 0.8)}`,
              '&:hover': { bgcolor: alpha('#000000', 0.72) },
            }}
          >
            {sourcesLoading ? 'Extracting…' : currentServerLabel}
          </Button>
        </Tooltip>
      )}

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, p: 1 } } }}
      >
        <Typography variant="caption" sx={{ px: 1, py: 0.5, display: 'block', color: 'text.disabled' }}>
          {resolvedMode === 'native' ? 'Select Extractor' : 'Select Embed Server'}
        </Typography>
        <Divider sx={{ my: 0.5 }} />

        {serverList.map((server) => {
          const isSelected =
            resolvedMode === 'native'
              ? effectiveSelectedExtractor === server.id
              : selectedEmbedId === server.id;
          const isFailed = failedExtractorId === server.id;
          const isExtracting =
            resolvedMode === 'native' && sourcesLoading && selectedExtractorId === server.id;

          return (
            <MenuItem
              key={server.id}
              onClick={() => handleSelectServer(server)}
              selected={isSelected}
              disabled={sourcesLoading}
              sx={{ borderRadius: 1, justifyContent: 'space-between', gap: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <Iconify
                  icon={server.kind === 'extractor' ? 'solar:link-bold' : 'solar:cloud-bold'}
                  width={18}
                  sx={{
                    flexShrink: 0,
                    color: isFailed ? 'error.main' : isSelected ? 'primary.main' : 'text.secondary',
                  }}
                />
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ ...(isFailed && { color: 'error.main' }) }}>
                    {server.name}
                  </Typography>
                  {isFailed && (
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="solar:refresh-bold" width={12} />
                      Failed — tap to retry
                    </Typography>
                  )}
                </Stack>
              </Stack>
              {isExtracting ? (
                <CircularProgress size={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
              ) : isSelected ? (
                <Iconify
                  icon={isFailed ? 'solar:close-circle-bold' : 'solar:check-circle-bold'}
                  width={20}
                  sx={{ color: isFailed ? 'error.main' : 'primary.main', flexShrink: 0 }}
                />
              ) : null}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );

  // ----- Player renderer -----

  const renderPlayer = () => {
    // NATIVE MODE: Use Vidstack MediaPlayer with the full default layout
    if (resolvedMode === 'native') {
      if (nativeReady) {
        return (
          <Box
            key={`native-${nativeSrc[0].src}`}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
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
              onCanPlay={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            >
              <MediaProvider>
                {subtitles
                  .filter((t) => t?.url)
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
              <NativeControls />
            </MediaPlayer>
          </Box>
        );
      }

      // No sources yet → the CircularProgress overlay is shown instead.
      if (sourcesLoading) return null;
    }

    // EMBED MODE: iframe
    if (resolvedMode === 'embed' && activeEmbedUrl) {
      return (
        <iframe
          key={activeEmbedUrl}
          src={activeEmbedUrl}
          width="100%"
          height="100%"
          allowFullScreen
          title="Media player"
          onLoad={() => setIsLoading(false)}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, border: 0, overflow: 'hidden' }}
        />
      );
    }

    // Empty state
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ position: 'relative', zIndex: 1, height: 1, color: 'text.disabled' }}
      >
        <Iconify icon="solar:server-square-bold" width={48} />
        <Typography variant="h6">No streaming source available</Typography>
      </Stack>
    );
  };

  return (
    <Box className="youplex-player">
      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: '16/9',
          overflow: 'hidden',
          bgcolor: 'common.black',
          borderRadius: 3,
          border: (theme) => `solid 1px ${alpha(theme.palette.divider, 0.6)}`,
          boxShadow: (theme) => `0 24px 48px -16px ${alpha(theme.palette.common.black, 0.6)}`,
          // Theme the Vidstack default layout to match the site.
          '--media-brand': BRAND_COLOR,
          '--media-font-family': '"Public Sans", sans-serif',
          '& media-player': {
            '--media-brand': BRAND_COLOR,
          },
        }}
      >
        {renderPlayer()}

        {showSpinner && (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              bgcolor: alpha('#000000', 0.55),
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              color: 'primary.main',
            }}
          >
            <CircularProgress size={64} thickness={3.5} color="primary" />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {spinnerLabel}
            </Typography>
          </Stack>
        )}

        {modeToggle}
        {toolbar}
      </Box>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
        <Iconify icon="solar:info-circle-bold" width={16} sx={{ color: 'text.disabled', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {resolvedMode === 'native'
            ? 'Playing via native extractor. Switch to Embed if playback fails.'
            : playbackMode === 'native'
            ? 'Native sources were unavailable — showing embed fallback.'
            : 'Playing via embed server. Switch to Native for direct streams.'}
        </Typography>
      </Stack>
    </Box>
  );
}