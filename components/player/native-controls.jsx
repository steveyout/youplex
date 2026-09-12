'use client';

import { Iconify } from '@/components/iconify';
import { usePlayerControls } from '@/hooks/use-player-controls';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  formatTime,
  useMediaStore,
  useMediaRemote,
  useCaptionOptions,
  useVideoQualityOptions,
  usePlaybackRateOptions,
} from '@vidstack/react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// ----------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function durationText(seconds) {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
    ? formatTime(seconds)
    : '0:00';
}

const glassPanelSx = {
  bgcolor: alpha('#0d1117', 0.72),
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${alpha('#ffffff', 0.12)}`,
  boxShadow: `0 8px 32px 0 ${alpha('#000000', 0.5)}`,
};

const controlButtonSx = {
  color: 'common.white',
  flexShrink: 0,
  p: { xs: 0.75, sm: 1 },
  borderRadius: 1.5,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  bgcolor: 'transparent',
  '&:hover': {
    bgcolor: alpha('#ffffff', 0.15),
    transform: 'scale(1.08)',
    boxShadow: `0 4px 12px ${alpha('#000000', 0.4)}`,
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
  '&:focus-visible': {
    outline: `2px solid ${alpha('#ffffff', 0.8)}`,
  },
};

const menuPaperSx = {
  ...glassPanelSx,
  p: 1.25,
  borderRadius: 2.5,
  minWidth: 240,
  boxShadow: `0 16px 40px -4px ${alpha('#000000', 0.75)}`,
};

/**
 * Modern Netflix / Apple TV inspired UI control layer for native Vidstack playback.
 */
export default function NativeControls({
  title,
  season,
  episode,
  onBack,
  resolvedMode = 'native',
  serverList = [],
  effectiveSelectedExtractor = null,
  selectedEmbedId = null,
  failedExtractorId = null,
  sourcesLoading = false,
  onModeChange,
  allowModeChange = true,
  handleSelectServer,
  currentServerLabel = 'Native Player',
}) {
  const remote = useMediaRemote();
  const store = useMediaStore();

  const captions = useCaptionOptions({ off: 'Off' });
  const qualities = useVideoQualityOptions({ auto: 'Auto' });
  const rates = usePlaybackRateOptions();

  // Anchors for menus
  const [capAnchor, setCapAnchor] = useState(null);
  const [setAnchor, setSetAnchor] = useState(null);
  const [srvAnchor, setSrvAnchor] = useState(null);

  const isMenuOpen = Boolean(capAnchor || setAnchor || srvAnchor);
  const { visible: uiVisible, show: showUI } = usePlayerControls(store.paused, isMenuOpen);

  // Seekbar interactive state
  const [dragVal, setDragVal] = useState(null);
  const [hoverSeek, setHoverSeek] = useState(null);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isVolHovered, setIsVolHovered] = useState(false);

  // Transient double-tap / seek feedback animations
  const [seekFeedback, setSeekFeedback] = useState(null); // { type: 'rewind' | 'forward' | 'play' | 'pause', id: number }

  const progressBarRef = useRef(null);
  const lastClickRef = useRef({ time: 0, x: 0 });

  const { currentTime, duration, bufferedEnd, volume, muted } = store;
  const active = dragVal ?? currentTime;
  const maxSeek = typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
  const canSeek = maxSeek > 0;
  const bufferPct = canSeek ? Math.min(100, (bufferedEnd / maxSeek) * 100) : 0;
  const playedPct = canSeek ? Math.min(100, (active / maxSeek) * 100) : 0;

  const isMuted = muted || volume === 0;
  const volIcon = isMuted
    ? 'solar:volume-cross-bold'
    : volume < 0.4
    ? 'solar:volume-small-bold'
    : 'solar:volume-bold';

  const hasActiveCaption = captions.some((c) => c.selected && c.value !== 'off');

  // Trigger brief center feedback badge
  const triggerFeedback = useCallback((type) => {
    setSeekFeedback({ type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!seekFeedback) return undefined;
    const timer = setTimeout(() => {
      setSeekFeedback(null);
    }, 650);
    return () => clearTimeout(timer);
  }, [seekFeedback]);

  // Handle Seek commit
  const seekCommit = (_, value) => {
    setDragVal(null);
    remote.seek(value);
  };

  // Timeline mouse hover calculation for preview tooltip
  const handleSeekMouseMove = (e) => {
    if (!progressBarRef.current || !canSeek) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = clamp(e.clientX - rect.left, 0, rect.width);
    const pct = (offsetX / rect.width) * 100;
    const hoverTime = (offsetX / rect.width) * maxSeek;

    setHoverSeek({
      x: offsetX,
      pct,
      time: hoverTime,
      width: rect.width,
    });
  };

  const handleSeekMouseLeave = () => {
    setHoverSeek(null);
  };

  // Double click / Double tap handler on video canvas
  const handleVideoCanvasClick = (e) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const {width} = rect;
    const isDouble = now - lastClickRef.current.time < 300;

    lastClickRef.current = { time: now, x: clickX };

    if (isDouble) {
      if (clickX < width * 0.35) {
        // Rewind 10s
        remote.seek(Math.max(0, currentTime - 10));
        triggerFeedback('rewind');
      } else if (clickX > width * 0.65) {
        // Forward 10s
        remote.seek(Math.min(maxSeek, currentTime + 10));
        triggerFeedback('forward');
      } else {
        remote.togglePaused();
        triggerFeedback(store.paused ? 'play' : 'pause');
      }
    } else {
      // Single click toggles play/pause on a slight delay to allow double-click
      setTimeout(() => {
        if (Date.now() - lastClickRef.current.time >= 280) {
          remote.togglePaused();
        }
      }, 290);
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is focused inside input/textarea/editable
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      showUI();

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          remote.togglePaused();
          triggerFeedback(store.paused ? 'play' : 'pause');
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          remote.seek(Math.max(0, currentTime - 10));
          triggerFeedback('rewind');
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          remote.seek(Math.min(maxSeek, currentTime + 10));
          triggerFeedback('forward');
          break;
        case 'arrowup':
          e.preventDefault();
          remote.changeVolume(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          remote.changeVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
          e.preventDefault();
          remote.toggleMuted();
          break;
        case 'f':
          e.preventDefault();
          if (store.canFullscreen) remote.toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          if (captions.length > 1) {
            const next = captions.find((c) => !c.selected && c.value !== 'off') || captions[0];
            next?.select();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [remote, store.paused, store.canFullscreen, currentTime, maxSeek, volume, captions, showUI, triggerFeedback]);

  // Format time display
  const timeFormatted = showRemainingTime
    ? `-${durationText(Math.max(0, maxSeek - active))}`
    : durationText(active);

  return (
    <Box
      onPointerMove={showUI}
      onPointerDown={showUI}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        userSelect: 'none',
        overflow: 'hidden',
        cursor: uiVisible ? 'default' : 'none',
      }}
    >
      {/* Clickable video area for Play/Pause and double-tap seeking */}
      <Box
        onClick={handleVideoCanvasClick}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          cursor: 'pointer',
        }}
      />

      {/* Top Vignette Gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2,
        }}
      />

      {/* Bottom Vignette Gradient */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 150,
          pointerEvents: 'none',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2,
        }}
      />

      {/* ===================== TOP HEADER HUD ===================== */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          p: { xs: 1.5, sm: 2 },
          zIndex: 3,
          opacity: uiVisible ? 1 : 0,
          transform: uiVisible ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: uiVisible ? 'auto' : 'none',
        }}
      >
        {/* Left: Optional Back + Title Metadata */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          {onBack && (
            <Tooltip title="Back" arrow placement="bottom">
              <IconButton
                onClick={onBack}
                sx={{
                  ...controlButtonSx,
                  ...glassPanelSx,
                  p: { xs: 0.75, sm: 1 },
                }}
              >
                <Iconify icon="solar:alt-arrow-left-bold" width={20} />
              </IconButton>
            </Tooltip>
          )}

          {title && (
            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              {(season || episode) && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'primary.light',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.75,
                    fontSize: 11,
                    lineHeight: 1.1,
                  }}
                >
                  Season {season} • Episode {episode}
                </Typography>
              )}
              <Typography
                variant="subtitle1"
                noWrap
                sx={{
                  color: 'common.white',
                  fontWeight: 600,
                  fontSize: { xs: 14, sm: 16 },
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                {title}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Right: Mode Switcher & Source Selector */}
        <Stack direction="row" alignItems="center" spacing={1.25}>
          {/* Mode Pill (Native / Embed) */}
          {onModeChange && allowModeChange && (
            <Box
              sx={{
                ...glassPanelSx,
                p: 0.5,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box
                onClick={() => onModeChange('native')}
                sx={{
                  cursor: 'pointer',
                  px: { xs: 1.2, sm: 1.5 },
                  py: 0.4,
                  borderRadius: 2.5,
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: resolvedMode === 'native' ? 'common.white' : alpha('#ffffff', 0.65),
                  bgcolor: resolvedMode === 'native' ? 'primary.main' : 'transparent',
                  boxShadow:
                    resolvedMode === 'native'
                      ? `0 2px 10px ${alpha('#FF3030', 0.45)}`
                      : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'common.white',
                    bgcolor: resolvedMode === 'native' ? 'primary.main' : alpha('#ffffff', 0.1),
                  },
                }}
              >
                <Iconify icon="solar:play-bold" width={13} />
                <span>Native</span>
              </Box>

              <Box
                onClick={() => onModeChange('embed')}
                sx={{
                  cursor: 'pointer',
                  px: { xs: 1.2, sm: 1.5 },
                  py: 0.4,
                  borderRadius: 2.5,
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: resolvedMode === 'embed' ? 'common.white' : alpha('#ffffff', 0.65),
                  bgcolor: resolvedMode === 'embed' ? 'primary.main' : 'transparent',
                  boxShadow:
                    resolvedMode === 'embed'
                      ? `0 2px 10px ${alpha('#FF3030', 0.45)}`
                      : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'common.white',
                    bgcolor: resolvedMode === 'embed' ? 'primary.main' : alpha('#ffffff', 0.1),
                  },
                }}
              >
                <Iconify icon="solar:code-bold" width={13} />
                <span>Embed</span>
              </Box>
            </Box>
          )}

          {/* Server / Extractor Dropdown Button */}
          {serverList.length > 0 && handleSelectServer && (
            <>
              <Tooltip title="Switch stream provider / server" arrow placement="bottom">
                <Box
                  onClick={(e) => setSrvAnchor(e.currentTarget)}
                  sx={{
                    ...glassPanelSx,
                    cursor: 'pointer',
                    px: { xs: 1.25, sm: 1.75 },
                    py: 0.6,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'common.white',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha('#ffffff', 0.18),
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {sourcesLoading ? (
                    <CircularProgress size={15} sx={{ color: 'primary.light' }} />
                  ) : (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: failedExtractorId ? 'error.main' : 'success.main',
                        boxShadow: `0 0 8px ${failedExtractorId ? '#FF5630' : '#22C55E'}`,
                      }}
                    />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: 11, sm: 12 },
                      maxWidth: { xs: 80, sm: 120 },
                    }}
                    noWrap
                  >
                    {sourcesLoading ? 'Extracting…' : currentServerLabel}
                  </Typography>
                  <Iconify icon="solar:alt-arrow-down-bold" width={12} sx={{ opacity: 0.7 }} />
                </Box>
              </Tooltip>

              <Menu
                anchorEl={srvAnchor}
                open={Boolean(srvAnchor)}
                onClose={() => setSrvAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { ...menuPaperSx, width: 320 } } }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: 'block',
                    color: 'text.disabled',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: 11,
                  }}
                >
                  {resolvedMode === 'native' ? 'Select Direct Extractor' : 'Select Embed Server'}
                </Typography>
                <Divider sx={{ my: 0.75, borderColor: alpha('#ffffff', 0.12) }} />

                {serverList.map((server) => {
                  const isSelected =
                    resolvedMode === 'native'
                      ? effectiveSelectedExtractor === server.id
                      : selectedEmbedId === server.id;
                  const isFailed = failedExtractorId === server.id;
                  const isExtracting =
                    resolvedMode === 'native' &&
                    sourcesLoading &&
                    effectiveSelectedExtractor === server.id;

                  return (
                    <MenuItem
                      key={server.id}
                      onClick={() => {
                        handleSelectServer(server);
                        setSrvAnchor(null);
                      }}
                      selected={isSelected}
                      disabled={sourcesLoading}
                      sx={{
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1,
                        my: 0.25,
                        justifyContent: 'space-between',
                        gap: 1.5,
                        '&.Mui-selected': {
                          bgcolor: alpha('#FF3030', 0.18),
                          '&:hover': { bgcolor: alpha('#FF3030', 0.28) },
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                        <Iconify
                          icon={
                            server.kind === 'extractor'
                              ? 'solar:link-bold'
                              : 'solar:server-square-bold'
                          }
                          width={18}
                          sx={{
                            flexShrink: 0,
                            color: isFailed
                              ? 'error.main'
                              : isSelected
                              ? 'primary.light'
                              : 'text.secondary',
                          }}
                        />
                        <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{
                              fontWeight: isSelected ? 600 : 500,
                              color: isFailed ? 'error.main' : 'common.white',
                            }}
                          >
                            {server.name}
                          </Typography>
                          {isFailed && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'error.light',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                fontSize: 11,
                              }}
                            >
                              <Iconify icon="solar:refresh-bold" width={12} />
                              Failed — tap to retry
                            </Typography>
                          )}
                        </Stack>
                      </Stack>

                      {isExtracting ? (
                        <CircularProgress size={18} sx={{ color: 'primary.light', flexShrink: 0 }} />
                      ) : isSelected ? (
                        <Iconify
                          icon={isFailed ? 'solar:close-circle-bold' : 'solar:check-circle-bold'}
                          width={20}
                          sx={{
                            color: isFailed ? 'error.main' : 'primary.light',
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                    </MenuItem>
                  );
                })}
              </Menu>
            </>
          )}
        </Stack>
      </Stack>

      {/* ===================== CENTER FEEDBACK & PLAY PROMPT ===================== */}
      {/* Transient Seek / Play Feedback */}
      {seekFeedback && (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            pointerEvents: 'none',
            animation: 'youplex-fade-scale 0.5s ease-out both',
          }}
        >
          <Box
            sx={{
              ...glassPanelSx,
              p: 2.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
            }}
          >
            {seekFeedback.type === 'rewind' && <Iconify icon="ic:round-replay-10" width={48} />}
            {seekFeedback.type === 'forward' && <Iconify icon="ic:round-forward-10" width={48} />}
            {seekFeedback.type === 'play' && <Iconify icon="solar:play-bold" width={48} />}
            {seekFeedback.type === 'pause' && <Iconify icon="solar:pause-bold" width={48} />}
          </Box>
        </Stack>
      )}

      {/* Center Buffering Spinner / Big Play Button */}
      {store.waiting ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
        >
          <Box
            sx={{
              ...glassPanelSx,
              p: 2.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={56} thickness={3.5} sx={{ color: 'primary.main' }} />
          </Box>
        </Stack>
      ) : (
        store.paused &&
        !seekFeedback && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              pointerEvents: 'none',
              opacity: uiVisible ? 1 : 0,
              transform: uiVisible ? 'scale(1)' : 'scale(0.9)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <IconButton
              onClick={() => {
                remote.togglePaused();
                triggerFeedback('play');
              }}
              sx={{
                pointerEvents: 'auto',
                color: 'common.white',
                ...glassPanelSx,
                p: { xs: 2.25, sm: 3 },
                borderRadius: '50%',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: alpha('#000000', 0.8),
                  transform: 'scale(1.12)',
                  boxShadow: `0 0 30px ${alpha('#FF3030', 0.5)}`,
                },
              }}
            >
              <Iconify icon="solar:play-bold" width={48} sx={{ ml: 0.5 }} />
            </IconButton>
          </Stack>
        )
      )}

      {/* ===================== BOTTOM CONTROLS HUD ===================== */}
      <Stack
        spacing={1}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          px: { xs: 1.5, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
          pt: 3,
          zIndex: 3,
          opacity: uiVisible ? 1 : 0,
          transform: uiVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: uiVisible ? 'auto' : 'none',
        }}
      >
        {/* ================= SEEKBAR ================= */}
        <Box
          ref={progressBarRef}
          onMouseMove={handleSeekMouseMove}
          onMouseLeave={handleSeekMouseLeave}
          sx={{
            position: 'relative',
            width: 1,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            cursor: canSeek ? 'pointer' : 'default',
            '&:hover .seek-track': {
              height: 7,
            },
            '&:hover .seek-thumb': {
              transform: 'translate(-50%, -50%) scale(1.25)',
              boxShadow: `0 0 12px ${alpha('#FF3030', 0.8)}, 0 2px 6px rgba(0,0,0,0.6)`,
            },
          }}
        >
          {/* Hover Time Tooltip */}
          {hoverSeek && canSeek && (
            <Box
              sx={{
                position: 'absolute',
                left: `${hoverSeek.pct}%`,
                bottom: '100%',
                mb: 1.25,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 5,
                ...glassPanelSx,
                px: 1.25,
                py: 0.4,
                borderRadius: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'common.white',
                  fontWeight: 700,
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {durationText(hoverSeek.time)}
              </Typography>
            </Box>
          )}

          {/* Background Track */}
          <Box
            className="seek-track"
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 4,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: alpha('#ffffff', 0.2),
              transition: 'height 0.15s ease',
            }}
          >
            {/* Buffered Progress */}
            <Box
              sx={{
                width: `${bufferPct}%`,
                height: 1,
                bgcolor: alpha('#ffffff', 0.4),
                borderRadius: 2,
                transition: 'width 0.2s ease',
              }}
            />
          </Box>

          {/* Played Progress Bar */}
          <Box
            className="seek-track"
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: `${playedPct}%`,
              height: 4,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #FF3030 0%, #FF6060 100%)',
              transition: 'height 0.15s ease',
              boxShadow: `0 0 8px ${alpha('#FF3030', 0.4)}`,
            }}
          />

          {/* Scrub Thumb */}
          <Box
            className="seek-thumb"
            sx={{
              position: 'absolute',
              left: `${playedPct}%`,
              top: '50%',
              transform: 'translate(-50%, -50%) scale(1)',
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: 'common.white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
              zIndex: 2,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          />

          {/* Transparent Slider for Drag Scrubbing */}
          <Slider
            size="small"
            min={0}
            max={canSeek ? maxSeek : 1}
            step={0.1}
            value={canSeek ? clamp(active, 0, maxSeek) : 0}
            disabled={!canSeek}
            onChange={(_, value) => setDragVal(value)}
            onChangeCommitted={seekCommit}
            track={false}
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              width: 1,
              opacity: 0,
              cursor: 'pointer',
              p: 0,
              '& .MuiSlider-thumb': {
                width: 24,
                height: 24,
              },
            }}
          />
        </Box>

        {/* ================= CONTROLS ROW ================= */}
        <Stack direction="row" alignItems="center" spacing={0.75}>
          {/* Play / Pause */}
          <Tooltip title={store.playing ? 'Pause (k)' : 'Play (k)'} placement="top" arrow>
            <IconButton onClick={() => remote.togglePaused()} sx={controlButtonSx}>
              <Iconify icon={store.playing ? 'solar:pause-bold' : 'solar:play-bold'} width={26} />
            </IconButton>
          </Tooltip>

          {/* 10s Rewind */}
          <Tooltip title="Rewind 10s (j)" placement="top" arrow>
            <IconButton
              onClick={() => {
                remote.seek(Math.max(0, currentTime - 10));
                triggerFeedback('rewind');
              }}
              sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Iconify icon="ic:round-replay-10" width={25} />
            </IconButton>
          </Tooltip>

          {/* 10s Forward */}
          <Tooltip title="Forward 10s (l)" placement="top" arrow>
            <IconButton
              onClick={() => {
                remote.seek(Math.min(maxSeek, currentTime + 10));
                triggerFeedback('forward');
              }}
              sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Iconify icon="ic:round-forward-10" width={25} />
            </IconButton>
          </Tooltip>

          {/* Volume Control with Expandable Slider */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            onMouseEnter={() => setIsVolHovered(true)}
            onMouseLeave={() => setIsVolHovered(false)}
            sx={{ ml: 0.5 }}
          >
            <Tooltip title={isMuted ? 'Unmute (m)' : 'Mute (m)'} placement="top" arrow>
              <IconButton onClick={() => remote.toggleMuted()} sx={controlButtonSx}>
                <Iconify icon={volIcon} width={24} />
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                width: isVolHovered ? { xs: 60, sm: 84 } : { xs: 0, sm: 0 },
                overflow: 'hidden',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                px: isVolHovered ? 1 : 0,
              }}
            >
              <Slider
                size="small"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(_, value) => remote.changeVolume(value)}
                sx={{
                  color: 'primary.main',
                  py: 1,
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  },
                  '& .MuiSlider-rail': {
                    bgcolor: alpha('#ffffff', 0.28),
                  },
                }}
              />
            </Box>
          </Stack>

          {/* Timestamp Display */}
          <Tooltip title="Click to toggle remaining time" arrow placement="top">
            <Typography
              variant="caption"
              onClick={() => setShowRemainingTime((prev) => !prev)}
              sx={{
                color: 'common.white',
                fontVariantNumeric: 'tabular-nums',
                ml: 1,
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: { xs: 12, sm: 13 },
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 1,
                transition: 'background 0.2s',
                '&:hover': { bgcolor: alpha('#ffffff', 0.1) },
              }}
            >
              {timeFormatted}{' '}
              <Box component="span" sx={{ color: alpha('#ffffff', 0.4), mx: 0.25 }}>
                /
              </Box>{' '}
              {durationText(duration)}
            </Typography>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          {/* Captions / Subtitles Menu */}
          <Tooltip title="Subtitles & Audio (c)" placement="top" arrow>
            <IconButton
              onClick={(e) => setCapAnchor(e.currentTarget)}
              sx={{
                ...controlButtonSx,
                position: 'relative',
                color: hasActiveCaption ? 'primary.light' : 'common.white',
              }}
            >
              <Iconify icon="ph:subtitles-bold" width={23} />
              {hasActiveCaption && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                  }}
                />
              )}
            </IconButton>
          </Tooltip>

          {/* Quality & Speed Settings Menu */}
          <Tooltip title="Settings" placement="top" arrow>
            <IconButton onClick={(e) => setSetAnchor(e.currentTarget)} sx={controlButtonSx}>
              <Iconify icon="solar:settings-minimalistic-bold" width={23} />
            </IconButton>
          </Tooltip>

          {/* Picture in Picture */}
          {store.canPictureInPicture && (
            <Tooltip title="Picture in Picture" placement="top" arrow>
              <IconButton
                onClick={() => remote.togglePictureInPicture()}
                sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
              >
                <Iconify icon="ic:round-picture-in-picture" width={23} />
              </IconButton>
            </Tooltip>
          )}

          {/* Fullscreen */}
          {store.canFullscreen && (
            <Tooltip
              title={store.fullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
              placement="top"
              arrow
            >
              <IconButton onClick={() => remote.toggleFullscreen()} sx={controlButtonSx}>
                <Iconify
                  icon={store.fullscreen ? 'ic:round-fullscreen-exit' : 'ic:round-fullscreen'}
                  width={24}
                />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* ===================== CAPTIONS MENU ===================== */}
      <Menu
        anchorEl={capAnchor}
        open={Boolean(capAnchor)}
        onClose={() => setCapAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5 }}>
          <Iconify icon="ph:subtitles-bold" width={18} sx={{ color: 'primary.light' }} />
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}
          >
            Subtitles
          </Typography>
        </Stack>
        <Divider sx={{ my: 0.75, borderColor: alpha('#ffffff', 0.12) }} />

        {captions.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.selected}
            onClick={() => {
              option.select();
              setCapAnchor(null);
            }}
            sx={{
              borderRadius: 1.5,
              px: 1.5,
              py: 0.8,
              my: 0.25,
              justifyContent: 'space-between',
              gap: 2,
              '&.Mui-selected': {
                bgcolor: alpha('#FF3030', 0.18),
                '&:hover': { bgcolor: alpha('#FF3030', 0.28) },
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: option.selected ? 600 : 400 }}>
              {option.label}
            </Typography>
            {option.selected && (
              <Iconify
                icon="solar:check-circle-bold"
                width={18}
                sx={{ color: 'primary.light', flexShrink: 0 }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* ===================== SETTINGS MENU ===================== */}
      <Menu
        anchorEl={setAnchor}
        open={Boolean(setAnchor)}
        onClose={() => setSetAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { ...menuPaperSx, width: 280 } } }}
      >
        {/* Quality Section */}
        {qualities.length > 0 && (
          <Box component="div">
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5 }}>
              <Iconify icon="solar:videocamera-record-bold" width={17} sx={{ color: 'primary.light' }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: 11,
                }}
              >
                Stream Quality
              </Typography>
            </Stack>
            <Divider sx={{ my: 0.75, borderColor: alpha('#ffffff', 0.12) }} />
            {qualities.map((option) => (
              <MenuItem
                key={option.value}
                selected={option.selected}
                onClick={() => option.select()}
                sx={{
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.75,
                  my: 0.25,
                  justifyContent: 'space-between',
                  gap: 2,
                  '&.Mui-selected': {
                    bgcolor: alpha('#FF3030', 0.18),
                    '&:hover': { bgcolor: alpha('#FF3030', 0.28) },
                  },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: option.selected ? 600 : 400 }}>
                  {option.label}
                </Typography>
                {option.selected && (
                  <Iconify
                    icon="solar:check-circle-bold"
                    width={18}
                    sx={{ color: 'primary.light', flexShrink: 0 }}
                  />
                )}
              </MenuItem>
            ))}
          </Box>
        )}

        {/* Playback Speed Section */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5, mt: qualities.length ? 1 : 0 }}>
          <Iconify icon="solar:tuning-2-bold" width={17} sx={{ color: 'primary.light' }} />
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: 11,
            }}
          >
            Playback Speed
          </Typography>
        </Stack>
        <Divider sx={{ my: 0.75, borderColor: alpha('#ffffff', 0.12) }} />
        {rates.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.selected}
            onClick={() => option.select()}
            sx={{
              borderRadius: 1.5,
              px: 1.5,
              py: 0.75,
              my: 0.25,
              justifyContent: 'space-between',
              gap: 2,
              '&.Mui-selected': {
                bgcolor: alpha('#FF3030', 0.18),
                '&:hover': { bgcolor: alpha('#FF3030', 0.28) },
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: option.selected ? 600 : 400 }}>
              {option.label}
            </Typography>
            {option.selected && (
              <Iconify
                icon="solar:check-circle-bold"
                width={18}
                sx={{ color: 'primary.light', flexShrink: 0 }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
