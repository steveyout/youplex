'use client';

import { Iconify } from '@/components/iconify';
import { usePlayerControls } from '@/hooks/use-player-controls';
import { useMovieChapters } from './use-movie-chapters';
import { useVideoPreview } from './use-video-preview';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  formatTime,
  Thumbnail,
  useMediaStore,
  useMediaState,
  useMediaRemote,
  useCaptionOptions,
  useVideoQualityOptions,
  usePlaybackRateOptions,
  GoogleCastButton,
  AirPlayButton,
} from '@vidstack/react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// ----------------------------------------------------------------------


/**
 * Custom Tooltip that disables touch listeners to eliminate double-tap requirements on mobile.
 */
const SEGMENT_PALETTE = {
  intro: {
    color: '#FFB800',
    borderColor: '#FDE047',
    label: 'Intro',
    gradient: 'linear-gradient(90deg, #FF9800 0%, #FBBF24 100%)',
  },
  recap: {
    color: '#00D8F6',
    borderColor: '#67E8F9',
    label: 'Recap',
    gradient: 'linear-gradient(90deg, #0099B8 0%, #00D8F6 100%)',
  },
  credits: {
    color: '#8E33FF',
    borderColor: '#C084FC',
    label: 'Credits',
    gradient: 'linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)',
  },
  outro: {
    color: '#8E33FF',
    borderColor: '#C084FC',
    label: 'Outro',
    gradient: 'linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)',
  },
  preview: {
    color: '#22C55E',
    borderColor: '#86EFAC',
    label: 'Preview',
    gradient: 'linear-gradient(90deg, #059669 0%, #22C55E 100%)',
  },
  sponsor: {
    color: '#22C55E',
    borderColor: '#86EFAC',
    label: 'Sponsor',
    gradient: 'linear-gradient(90deg, #16A34A 0%, #4ADE80 100%)',
  },
  selfpromo: {
    color: '#EC4899',
    borderColor: '#F472B6',
    label: 'Self Promo',
    gradient: 'linear-gradient(90deg, #DB2777 0%, #F472B6 100%)',
  },
  mixed: {
    color: '#EF4444',
    borderColor: '#F87171',
    label: 'Ad/Promo',
    gradient: 'linear-gradient(90deg, #DC2626 0%, #F87171 100%)',
  },
  interaction: {
    color: '#8B5CF6',
    borderColor: '#A78BFA',
    label: 'Interaction',
    gradient: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 100%)',
  },
};

function PlayerTooltip({ children, title, ...props }) {
  if (!title) return children;
  return (
    <Tooltip
      title={title}
      disableTouchListener
      enterDelay={350}
      enterNextDelay={150}
      {...props}
    >
      {children}
    </Tooltip>
  );
}

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
  position: 'relative',
  zIndex: 3,
  '& svg, & .iconify, & span, & img': {
    pointerEvents: 'none',
  },
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
  maxHeight: 380,
  overflowY: 'auto',
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
  onSelectServer,
  currentServerLabel = 'Native Player',
  videoSrc = null,
  thumbnailsUrl = null,
  timelineSegments = [],
  hasNextEpisode = false,
  onNextEpisode = null,
  backdrop = null,
  type = 'movie',
  chapters: explicitChapters = null,
  cast = [],
}) {
  const remote = useMediaRemote();
  const store = useMediaStore();

  // Cast & AirPlay remote playback states
  const canGoogleCast = useMediaState('canGoogleCast');
  const canAirPlay = useMediaState('canAirPlay');
  const isGoogleCastConnected = useMediaState('isGoogleCastConnected');
  const isAirPlayConnected = useMediaState('isAirPlayConnected');
  const remotePlaybackType = useMediaState('remotePlaybackType');
  const remotePlaybackState = useMediaState('remotePlaybackState');
  const remotePlaybackInfo = useMediaState('remotePlaybackInfo');
  const selectServer = onSelectServer || handleSelectServer;

  // Keyboard shortcut 'r' / 'R' for Who's this? (Cast & Characters)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) ||
        e.target?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        if (cast.length > 0) {
          e.preventDefault();
          setCastOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cast.length]);

  const captions = useCaptionOptions({ off: 'Off' });
  const qualities = useVideoQualityOptions({ auto: 'Auto' });
  const rates = usePlaybackRateOptions();

  // Anchors for menus
  const [capAnchor, setCapAnchor] = useState(null);
  const [setAnchor, setSetAnchor] = useState(null);
  const [srvAnchor, setSrvAnchor] = useState(null);

  const [castOpen, setCastOpen] = useState(false);
  const isMenuOpen = Boolean(capAnchor || setAnchor || srvAnchor || castOpen);
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

  // Compute movie chapters & active chapter info
  const { chapters, getChapterAtTime } = useMovieChapters({
    duration: maxSeek,
    timelineSegments,
    explicitChapters,
    type,
  });

  const currentActiveChapter = getChapterAtTime(active);
  const hoveredChapter = hoverSeek ? getChapterAtTime(hoverSeek.time) : null;

  // Live video chunk & cached frame preview for hover scrub (like Netflix / YouTube)
  const { previewCanvasRef, hasFrame } = useVideoPreview({
    videoSrc,
    hoverTime: hoverSeek?.time,
    isHovering: Boolean(hoverSeek && canSeek),
  });

  // Clamped horizontal coordinate for preview tooltip card to prevent clipping
  const previewCardWidth = 220;
  const previewHalfWidth = previewCardWidth / 2;
  const clampedPreviewX = hoverSeek
    ? hoverSeek.width > previewCardWidth + 16
      ? clamp(hoverSeek.x, previewHalfWidth + 8, hoverSeek.width - previewHalfWidth - 8)
      : hoverSeek.x
    : 0;

  const hasActiveCaption = captions.some((c) => c.selected && c.value !== 'off');

  // Robust mute toggle that handles volume 0 and never requires double clicking
  const handleToggleMute = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (isMuted) {
        if (volume === 0) {
          remote.changeVolume(0.5);
        }
        if (typeof remote.unmute === 'function') {
          remote.unmute();
        } else {
          remote.toggleMuted();
        }
      } else if (typeof remote.mute === 'function') {
        remote.mute();
      } else {
        remote.toggleMuted();
      }
    },
    [isMuted, volume, remote]
  );


  // Active segment detection for Intro / Recap / Credits skip prompts
  const activeSegment = useMemo(() => {
    if (!timelineSegments || timelineSegments.length === 0 || !canSeek) return null;
    return (
      timelineSegments.find((seg) => {
        const segStart = Number(seg.start) || 0;
        const segEnd = seg.end != null ? Number(seg.end) : maxSeek;
        return currentTime >= segStart && currentTime < segEnd - 0.5;
      }) || null
    );
  }, [timelineSegments, currentTime, canSeek, maxSeek]);


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
        case 's':
          if (activeSegment) {
            e.preventDefault();
            if (
              (activeSegment.type === 'credits' || activeSegment.type === 'outro') &&
              hasNextEpisode &&
              onNextEpisode
            ) {
              onNextEpisode();
            } else {
              const targetTime = activeSegment.end != null ? Number(activeSegment.end) : maxSeek;
              remote.seek(targetTime);
              triggerFeedback('forward');
            }
          }
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
  }, [
    remote,
    store.paused,
    store.canFullscreen,
    currentTime,
    maxSeek,
    volume,
    captions,
    showUI,
    triggerFeedback,
    activeSegment,
    hasNextEpisode,
    onNextEpisode,
  ]);

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
            <PlayerTooltip title="Back" arrow placement="bottom">
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
            </PlayerTooltip>
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
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Native</Box>
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
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Embed</Box>
              </Box>
            </Box>
          )}

          {/* Server / Extractor Dropdown Button */}
          {serverList.length > 0 && selectServer && (
            <>
              <PlayerTooltip title="Switch stream provider / server" arrow placement="bottom">
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
                      maxWidth: { xs: 65, sm: 120 },
                    }}
                    noWrap
                  >
                    {sourcesLoading ? 'Extracting…' : currentServerLabel}
                  </Typography>
                  <Iconify icon="solar:alt-arrow-down-bold" width={12} sx={{ opacity: 0.7 }} />
                </Box>
              </PlayerTooltip>

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
                        selectServer?.(server);
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
            top: 0,
            left: 0,
            right: 0,
            bottom: { xs: 76, sm: 88 },
            zIndex: 4,
            pointerEvents: 'none',
            animation: 'youplex-fade-scale 0.5s ease-out both',
          }}
        >
          <Box
            sx={{
              ...glassPanelSx,
              p: { xs: 1.5, sm: 2.5 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
            }}
          >
            {seekFeedback.type === 'rewind' && (
              <Iconify icon="ic:round-replay-10" sx={{ width: { xs: 34, sm: 48 }, height: { xs: 34, sm: 48 } }} />
            )}
            {seekFeedback.type === 'forward' && (
              <Iconify icon="ic:round-forward-10" sx={{ width: { xs: 34, sm: 48 }, height: { xs: 34, sm: 48 } }} />
            )}
            {seekFeedback.type === 'play' && (
              <Iconify icon="solar:play-bold" sx={{ width: { xs: 34, sm: 48 }, height: { xs: 34, sm: 48 } }} />
            )}
            {seekFeedback.type === 'pause' && (
              <Iconify icon="solar:pause-bold" sx={{ width: { xs: 34, sm: 48 }, height: { xs: 34, sm: 48 } }} />
            )}
          </Box>
        </Stack>
      )}

      {/* Center Buffering Spinner / Big Play Button */}
      {store.waiting ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: { xs: 76, sm: 88 },
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              ...glassPanelSx,
              p: { xs: 1.75, sm: 2.5 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              size={48}
              thickness={3.5}
              sx={{ color: 'primary.main', width: { xs: 40, sm: 52 }, height: { xs: 40, sm: 52 } }}
            />
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
              top: 0,
              left: 0,
              right: 0,
              bottom: { xs: 76, sm: 88 },
              zIndex: 3,
              pointerEvents: 'none',
              display: { xs: 'none', sm: 'flex' },
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
                p: { xs: 2, sm: 3 },
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
          px: { xs: 1.25, sm: 3 },
          pb: { xs: 1.25, sm: 2 },
          pt: { xs: 1.5, sm: 3 },
          zIndex: 10,
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
              height: 6,
            },
            '&:hover .seek-segment': {
              height: 8,
            },
            '&:hover .seek-thumb': {
              transform: 'translate(-50%, -50%) scale(1.25)',
              boxShadow: `0 0 12px ${alpha('#FF3030', 0.8)}, 0 2px 6px rgba(0,0,0,0.6)`,
            },
          }}
        >
          {/* Hover Time & Video Frame Preview (Netflix / YouTube Style) */}
          {hoverSeek && canSeek && (
            <Box
              sx={{
                position: 'absolute',
                left: `${clampedPreviewX}px`,
                bottom: 'calc(100% + 14px)',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 30,
                width: { xs: 190, sm: 220 },
                ...glassPanelSx,
                bgcolor: alpha('#0a0d14', 0.94),
                border: `1px solid ${alpha('#ffffff', 0.16)}`,
                borderRadius: 1.75,
                boxShadow: `0 16px 40px -4px rgba(0,0,0,0.85), 0 0 20px ${alpha('#000000', 0.6)}`,
                overflow: 'hidden',
                animation: 'youplex-fade-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}
            >
              {/* 16:9 Thumbnail / Live Video Chunk Area */}
              <Box
                sx={{
                  position: 'relative',
                  width: 1,
                  aspectRatio: '16/9',
                  bgcolor: '#050709',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* 1. WebVTT Storyboard thumbnail spritesheet if provided */}
                {thumbnailsUrl && (
                  <Thumbnail.Root
                    src={thumbnailsUrl}
                    time={hoverSeek.time}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      zIndex: 1,
                    }}
                  >
                    <Thumbnail.Img
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Thumbnail.Root>
                )}

                {/* 2. Live Canvas Video Frame Preview (Always displays on played & scrubbed frames, zero CORS error) */}
                {!thumbnailsUrl && (
                  <canvas
                    ref={previewCanvasRef}
                    width={320}
                    height={180}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 2,
                    }}
                  />
                )}

                {/* 3. Dark cinematic placeholder while initial chunk decodes */}
                {!hasFrame && !thumbnailsUrl && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'radial-gradient(circle at center, #141b26 0%, #06090e 100%)',
                    }}
                  >
                    <Iconify icon="solar:clapperboard-play-bold" width={28} sx={{ color: alpha('#ffffff', 0.25) }} />
                  </Box>
                )}

                {/* Subtle vignette gradient */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 3,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Top-Left Segment / Real Chapter Badge */}
                {hoveredChapter && (hoveredChapter.isRealChapter || hoveredChapter.isSegment) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 7,
                      left: 7,
                      px: 0.85,
                      py: 0.3,
                      borderRadius: 1,
                      bgcolor: alpha('#000000', 0.8),
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${alpha(
                        hoveredChapter.type === 'intro'
                          ? '#FFB800'
                          : hoveredChapter.type === 'credits' || hoveredChapter.type === 'outro'
                          ? '#8E33FF'
                          : hoveredChapter.type === 'recap'
                          ? '#00B8D9'
                          : '#ffffff',
                        0.35
                      )}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      zIndex: 4,
                    }}
                  >
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor:
                          hoveredChapter.type === 'intro'
                            ? '#FFB800'
                            : hoveredChapter.type === 'credits' || hoveredChapter.type === 'outro'
                            ? '#8E33FF'
                            : hoveredChapter.type === 'recap'
                            ? '#00B8D9'
                            : 'primary.light',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'common.white',
                        fontWeight: 700,
                        fontSize: 9.5,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        lineHeight: 1,
                      }}
                    >
                      {hoveredChapter.badge || hoveredChapter.title}
                    </Typography>
                  </Box>
                )}

                {/* Bottom-Right Monospace Timestamp */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    px: 0.85,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: alpha('#000000', 0.85),
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${alpha('#ffffff', 0.2)}`,
                    zIndex: 4,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'common.white',
                      fontWeight: 700,
                      fontSize: 11.5,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {durationText(hoverSeek.time)}
                  </Typography>
                </Box>
              </Box>

              {/* Video Preview Metadata Footer */}
              <Box sx={{ p: 1.25, pt: 1 }}>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    display: 'block',
                    color: 'common.white',
                    fontWeight: 700,
                    fontSize: { xs: 11.5, sm: 12.5 },
                    letterSpacing: 0.2,
                  }}
                >
                  {hoveredChapter?.title || (title ? `${title}${season ? ` • S${season} E${episode}` : ''}` : 'Preview')}
                </Typography>

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mt: 0.35 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: alpha('#ffffff', 0.6),
                      fontSize: 10.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {hoveredChapter && hoveredChapter.isRealChapter
                      ? `${durationText(hoveredChapter.start)} - ${durationText(hoveredChapter.end)}`
                      : durationText(hoverSeek.time)}
                  </Typography>

                  {/* Matched intro/recap/credits badge */}
                  {(() => {
                    const seg = timelineSegments.find((s) => {
                      const sStart = Number(s.start) || 0;
                      const sEnd = s.end != null ? Number(s.end) : maxSeek;
                      return hoverSeek.time >= sStart && hoverSeek.time <= sEnd;
                    });
                    if (!seg) return null;
                    const palette = SEGMENT_PALETTE[seg.type] || {
                      color: seg.color || '#FFB800',
                      label: seg.label || 'Segment',
                    };
                    return (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.4,
                          px: 0.6,
                          py: 0.1,
                          borderRadius: 0.75,
                          bgcolor: alpha(palette.color, 0.22),
                          border: `1px solid ${alpha(palette.color, 0.55)}`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            bgcolor: palette.color,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: palette.color,
                            fontWeight: 700,
                            fontSize: 9.5,
                            lineHeight: 1,
                          }}
                        >
                          {palette.label}
                        </Typography>
                      </Box>
                    );
                  })()}
                </Stack>
              </Box>
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
              zIndex: 1,
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
              zIndex: 2,
              pointerEvents: 'none',
              opacity: 0.88,
            }}
          />

          {/* Colored Segments on Timeline (Intro: Amber, Recap: Cyan, Credits: Purple, Preview: Green) */}
          {canSeek &&
            timelineSegments.map((seg, idx) => {
              const startSec = clamp(Number(seg.start) || 0, 0, maxSeek);
              const endSec = clamp(seg.end != null ? Number(seg.end) : maxSeek, startSec, maxSeek);
              if (endSec <= startSec) return null;

              const leftPct = (startSec / maxSeek) * 100;
              const widthPct = Math.max(0.5, ((endSec - startSec) / maxSeek) * 100);
              const palette = SEGMENT_PALETTE[seg.type] || {
                color: seg.color || '#FFB800',
                borderColor: seg.borderColor || '#FDE047',
                label: seg.label || 'Segment',
              };

              return (
                <Box
                  key={seg.id || `${seg.type}-${idx}-${startSec}`}
                  className="seek-segment"
                  sx={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 5,
                    borderRadius: 1,
                    background:
                      palette.gradient ||
                      `linear-gradient(90deg, ${palette.color} 0%, ${palette.borderColor || palette.color} 100%)`,
                    boxShadow: `0 0 10px ${alpha(palette.color, 0.85)}`,
                    border: `1px solid ${alpha(palette.borderColor || palette.color, 0.8)}`,
                    zIndex: 3,
                    pointerEvents: 'none',
                    transition: 'height 0.15s ease',
                  }}
                />
              );
            })}

          {/* Segment Tick Markers (Start & End points for clear boundaries) */}
          {canSeek &&
            timelineSegments.map((seg, idx) => {
              const startSec = clamp(Number(seg.start) || 0, 0, maxSeek);
              const endSec = clamp(seg.end != null ? Number(seg.end) : maxSeek, startSec, maxSeek);
              const palette = SEGMENT_PALETTE[seg.type] || {
                color: seg.color || '#FFB800',
              };

              return (
                <Box
                  key={`tick-${seg.id || idx}`}
                  sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}
                >
                  {/* Start Tick Notch */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${(startSec / maxSeek) * 100}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 2,
                      height: 10,
                      borderRadius: 1,
                      bgcolor: '#ffffff',
                      boxShadow: `0 0 4px ${palette.color}`,
                    }}
                  />
                  {/* End Tick Notch */}
                  {seg.end != null && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${(endSec / maxSeek) * 100}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 2,
                        height: 10,
                        borderRadius: 1,
                        bgcolor: palette.color,
                        boxShadow: `0 0 4px ${palette.color}`,
                      }}
                    />
                  )}
                </Box>
              );
            })}

          {/* Chapter Dividers on Timeline (Only for real chapter markers) */}
          {canSeek &&
            chapters
              .filter((ch) => ch.isRealChapter && ch.start > 0)
              .map((ch, idx) => {
                const leftPct = (ch.start / maxSeek) * 100;
                return (
                  <Box
                    key={`ch-div-${ch.id || idx}`}
                    sx={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 2,
                      height: 8,
                      bgcolor: '#050709',
                      borderRadius: 0.5,
                      zIndex: 4,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}

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
              zIndex: 5,
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
              zIndex: 6,
              '& .MuiSlider-thumb': {
                width: 24,
                height: 24,
              },
            }}
          />
        </Box>

        {/* ================= CONTROLS ROW ================= */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 0.25, sm: 0.75 }}>
          {/* Play / Pause */}
          <PlayerTooltip title={store.playing ? 'Pause (k)' : 'Play (k)'} placement="top" arrow>
            <IconButton onClick={(e) => { e.stopPropagation(); remote.togglePaused(); }} sx={controlButtonSx}>
              <Iconify icon={store.playing ? 'solar:pause-bold' : 'solar:play-bold'} width={26} />
            </IconButton>
          </PlayerTooltip>

          {/* 10s Rewind */}
          <PlayerTooltip title="Rewind 10s (j)" placement="top" arrow>
            <IconButton
              onClick={() => {
                remote.seek(Math.max(0, currentTime - 10));
                triggerFeedback('rewind');
              }}
              sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Iconify icon="ic:round-replay-10" width={25} />
            </IconButton>
          </PlayerTooltip>

          {/* 10s Forward */}
          <PlayerTooltip title="Forward 10s (l)" placement="top" arrow>
            <IconButton
              onClick={() => {
                remote.seek(Math.min(maxSeek, currentTime + 10));
                triggerFeedback('forward');
              }}
              sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Iconify icon="ic:round-forward-10" width={25} />
            </IconButton>
          </PlayerTooltip>

          {/* Volume Control with Expandable Slider */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            onMouseEnter={() => setIsVolHovered(true)}
            onMouseLeave={() => setIsVolHovered(false)}
            sx={{ ml: 0.5 }}
          >
            <PlayerTooltip title={isMuted ? 'Unmute (m)' : 'Mute (m)'} placement="top" arrow>
              <IconButton onClick={handleToggleMute} sx={controlButtonSx}>
                <Iconify icon={volIcon} width={24} />
              </IconButton>
            </PlayerTooltip>

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
                    '&:before, &:after': {
                      display: 'none',
                    },
                  },
                  '& .MuiSlider-rail': {
                    bgcolor: alpha('#ffffff', 0.28),
                  },
                }}
              />
            </Box>
          </Stack>

          {/* Timestamp Display */}
          <PlayerTooltip title="Click to toggle remaining time" arrow placement="top">
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
          </PlayerTooltip>

          {/* Active Chapter / Segment Label (Only for real chapters/segments) */}
          {currentActiveChapter && (currentActiveChapter.isRealChapter || currentActiveChapter.isSegment) && (
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 0.75,
                px: 1,
                py: 0.3,
                borderRadius: 1,
                bgcolor: alpha('#ffffff', 0.08),
                border: `1px solid ${alpha('#ffffff', 0.12)}`,
                maxWidth: 220,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor:
                    currentActiveChapter.type === 'intro'
                      ? '#FFB800'
                      : currentActiveChapter.type === 'credits' || currentActiveChapter.type === 'outro'
                      ? '#8E33FF'
                      : currentActiveChapter.type === 'recap'
                      ? '#00B8D9'
                      : 'primary.light',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: alpha('#ffffff', 0.9),
                  fontWeight: 600,
                  fontSize: 11.5,
                }}
              >
                {currentActiveChapter.title}
              </Typography>
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Who's this? / Cast Button */}
          {cast.length > 0 && (
            <PlayerTooltip title="Who's this? / Actors (r)" placement="top" arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setCastOpen((prev) => !prev);
                }}
                sx={{
                  ...controlButtonSx,
                  position: 'relative',
                  color: castOpen ? 'primary.main' : 'common.white',
                  bgcolor: castOpen ? alpha('#FF3030', 0.16) : 'transparent',
                }}
              >
                <Iconify icon="solar:users-group-rounded-bold" width={22} />
              </IconButton>
            </PlayerTooltip>
          )}

          {/* Server Switcher Button (Next to Subtitles) */}
          {serverList.length > 0 && selectServer && (
            <PlayerTooltip title={`Servers (${currentServerLabel})`} placement="top" arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSrvAnchor(e.currentTarget);
                }}
                sx={{
                  ...controlButtonSx,
                  position: 'relative',
                  color: 'common.white',
                }}
              >
                <Iconify icon="solar:server-2-bold" width={22} />
              </IconButton>
            </PlayerTooltip>
          )}

          {/* Captions / Subtitles Menu */}
          <PlayerTooltip title="Subtitles & Audio (c)" placement="top" arrow>
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
          </PlayerTooltip>

          {/* Quality & Speed Settings Menu */}
          <PlayerTooltip title="Settings" placement="top" arrow>
            <IconButton onClick={(e) => { e.stopPropagation(); setSetAnchor(e.currentTarget); }} sx={controlButtonSx}>
              <Iconify icon="solar:settings-minimalistic-bold" width={23} />
            </IconButton>
          </PlayerTooltip>

          {/* Picture in Picture */}
          {store.canPictureInPicture && (
            <PlayerTooltip title="Picture in Picture" placement="top" arrow>
              <IconButton
                onClick={(e) => { e.stopPropagation(); remote.togglePictureInPicture(); }}
                sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
              >
                <Iconify icon="ic:round-picture-in-picture" width={23} />
              </IconButton>
            </PlayerTooltip>
          )}

          {/* Apple AirPlay */}
          {canAirPlay && (
            <PlayerTooltip
              title={isAirPlayConnected ? 'AirPlay Connected (Tap to Disconnect)' : 'Apple AirPlay'}
              placement="top"
              arrow
            >
              <AirPlayButton asChild>
                <IconButton
                  sx={{
                    ...controlButtonSx,
                    color: isAirPlayConnected ? 'primary.light' : 'common.white',
                    bgcolor: isAirPlayConnected ? alpha('#FF3030', 0.16) : 'transparent',
                  }}
                >
                  <Iconify
                    icon={isAirPlayConnected ? 'material-symbols:airplay' : 'material-symbols:airplay-rounded'}
                    width={22}
                  />
                </IconButton>
              </AirPlayButton>
            </PlayerTooltip>
          )}

          {/* Google Cast / Chromecast */}
          {(canGoogleCast || (!canAirPlay && typeof window !== 'undefined' && !!window.chrome)) && (
            <PlayerTooltip
              title={isGoogleCastConnected ? 'Chromecast Connected (Tap to Disconnect)' : 'Cast to TV (Chromecast)'}
              placement="top"
              arrow
            >
              <GoogleCastButton asChild>
                <IconButton
                  sx={{
                    ...controlButtonSx,
                    color: isGoogleCastConnected ? 'primary.light' : 'common.white',
                    bgcolor: isGoogleCastConnected ? alpha('#FF3030', 0.16) : 'transparent',
                  }}
                >
                  <Iconify
                    icon={isGoogleCastConnected ? 'solar:screencast-bold' : 'solar:screencast-2-bold'}
                    width={22}
                  />
                </IconButton>
              </GoogleCastButton>
            </PlayerTooltip>
          )}

          {/* Fullscreen */}
          {store.canFullscreen && (
            <PlayerTooltip
              title={store.fullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
              placement="top"
              arrow
            >
              <IconButton onClick={(e) => { e.stopPropagation(); remote.toggleFullscreen(); }} sx={controlButtonSx}>
                <Iconify
                  icon={store.fullscreen ? 'ic:round-fullscreen-exit' : 'ic:round-fullscreen'}
                  width={24}
                />
              </IconButton>
            </PlayerTooltip>
          )}
        </Stack>
      </Stack>

      
      {/* Center Mobile Play / Pause & 10s Seek Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: '44%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 4,
          display: { xs: 'flex', sm: 'none' },
          alignItems: 'center',
          gap: 2.25,
          pointerEvents: uiVisible ? 'auto' : 'none',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            remote.seek(Math.max(0, currentTime - 10));
            triggerFeedback('rewind');
          }}
          sx={{
            color: 'common.white',
            bgcolor: alpha('#000000', 0.45),
            backdropFilter: 'blur(8px)',
            p: 1.25,
            touchAction: 'manipulation',
            '&:active': { bgcolor: alpha('#000000', 0.75), transform: 'scale(0.92)' },
          }}
        >
          <Iconify icon="ic:round-replay-10" width={26} />
        </IconButton>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            remote.togglePaused();
            triggerFeedback(store.paused ? 'play' : 'pause');
          }}
          sx={{
            color: 'common.white',
            bgcolor: 'primary.main',
            boxShadow: `0 4px 20px ${alpha('#FF3030', 0.5)}`,
            p: 1.5,
            touchAction: 'manipulation',
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <Iconify icon={store.playing ? 'solar:pause-bold' : 'solar:play-bold'} width={32} />
        </IconButton>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            remote.seek(Math.min(maxSeek, currentTime + 10));
            triggerFeedback('forward');
          }}
          sx={{
            color: 'common.white',
            bgcolor: alpha('#000000', 0.45),
            backdropFilter: 'blur(8px)',
            p: 1.25,
            touchAction: 'manipulation',
            '&:active': { bgcolor: alpha('#000000', 0.75), transform: 'scale(0.92)' },
          }}
        >
          <Iconify icon="ic:round-forward-10" width={26} />
        </IconButton>
      </Box>


      {/* ===================== FLOATING "WHO'S THIS?" BUTTON (NETFLIX / CINECAT STYLE) ===================== */}
      {cast.length > 0 && uiVisible && (
        <Box
          sx={{
            position: 'absolute',
            bottom: activeSegment ? { xs: 120, sm: 144 } : { xs: 74, sm: 96 },
            right: { xs: 12, sm: 24 },
            zIndex: 24,
            pointerEvents: 'auto',
            animation: 'youplex-fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          <Button
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              setCastOpen(true);
            }}
            startIcon={
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 0.5,
                  bgcolor: alpha('#ffffff', 0.22),
                  color: 'common.white',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1,
                  mr: 0.25,
                }}
              >
                R
              </Box>
            }
            sx={{
              ...glassPanelSx,
              bgcolor: alpha('#0d1117', 0.88),
              color: 'common.white',
              border: `1px solid ${alpha('#ffffff', 0.3)}`,
              boxShadow: `0 6px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${alpha('#000000', 0.4)}`,
              backdropFilter: 'blur(16px)',
              py: { xs: 0.7, sm: 0.85 },
              px: { xs: 1.5, sm: 2 },
              borderRadius: 1.25,
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 600,
              letterSpacing: 0.2,
              textTransform: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: alpha('#161c24', 0.98),
                borderColor: alpha('#ffffff', 0.6),
                transform: 'translateY(-1px)',
                boxShadow: `0 8px 28px rgba(0, 0, 0, 0.75), 0 0 16px ${alpha('#ffffff', 0.2)}`,
              },
              '&:active': {
                transform: 'translateY(0) scale(0.98)',
              },
            }}
          >
            Who&apos;s this?
          </Button>
        </Box>
      )}

      {/* ===================== FLOATING SKIP BUTTON (THEMED UI STYLE) ===================== */}
      {activeSegment && (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 74, sm: 96 },
            right: { xs: 12, sm: 24 },
            zIndex: 25,
            pointerEvents: 'auto',
            animation: 'youplex-fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          {(() => {
            const palette = SEGMENT_PALETTE[activeSegment.type] || {
              color: activeSegment.color || '#FFB800',
              label: activeSegment.label || 'Segment',
            };
            const isCredits = activeSegment.type === 'credits' || activeSegment.type === 'outro';
            const willGoNext = isCredits && hasNextEpisode && onNextEpisode;

            return (
              <Button
                variant="contained"
                onClick={(e) => {
                  e.stopPropagation();
                  if (willGoNext) {
                    onNextEpisode();
                  } else {
                    const target = activeSegment.end != null ? Number(activeSegment.end) : maxSeek;
                    remote.seek(target);
                    triggerFeedback('forward');
                  }
                }}
                endIcon={
                  willGoNext ? (
                    <Iconify icon="solar:skip-next-bold" width={20} />
                  ) : (
                    <Iconify icon="solar:forward-bold" width={18} />
                  )
                }
                sx={{
                  ...glassPanelSx,
                  bgcolor: alpha('#0d1117', 0.88),
                  color: 'common.white',
                  border: `1px solid ${alpha(palette.color || '#ffffff', 0.4)}`,
                  boxShadow: `0 6px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${alpha(palette.color || '#FF3030', 0.2)}`,
                  backdropFilter: 'blur(16px)',
                  py: { xs: 0.75, sm: 0.9 },
                  px: { xs: 1.75, sm: 2.25 },
                  borderRadius: 1.25, // somewhat rounded (10px / 8px) matching UI buttons, NOT pill!
                  fontSize: { xs: 12.5, sm: 13.5 },
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  textTransform: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: alpha('#161c24', 0.98),
                    borderColor: palette.color || '#FF3030',
                    color: 'common.white',
                    transform: 'translateY(-1px)',
                    boxShadow: `0 8px 28px rgba(0, 0, 0, 0.75), 0 0 16px ${alpha(palette.color || '#FF3030', 0.35)}`,
                  },
                  '&:active': {
                    transform: 'translateY(0) scale(0.98)',
                  },
                }}
              >
                {activeSegment.type === 'intro'
                  ? 'Skip Intro'
                  : activeSegment.type === 'recap'
                  ? 'Skip Recap'
                  : willGoNext
                  ? 'Next Episode'
                  : isCredits
                  ? 'Skip Credits'
                  : activeSegment.type === 'preview'
                  ? 'Skip Preview'
                  : `Skip ${activeSegment.label || 'Segment'}`}
                <Typography
                  component="span"
                  sx={{
                    ml: 1,
                    px: 0.6,
                    py: 0.1,
                    borderRadius: 0.8,
                    bgcolor: alpha('#ffffff', 0.15),
                    color: alpha('#ffffff', 0.8),
                    fontSize: 10,
                    fontWeight: 700,
                    display: { xs: 'none', sm: 'inline-block' },
                  }}
                >
                  S
                </Typography>
              </Button>
            );
          })()}
        </Box>
      )}

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

        {captions.map((option, optIdx) => {
          let labelText = option.label;
          if (option.value !== 'off') {
            const sameTracks = captions.filter((c) => c.label === option.label && c.value !== 'off');
            if (sameTracks.length > 1) {
              const occurIdx = captions.filter(
                (c, i) => i <= optIdx && c.label === option.label && c.value !== 'off'
              ).length;
              labelText = option.label + ' (' + occurIdx + ')';
            }
          }
          return (
          <MenuItem
            key={option.value + '-' + optIdx}
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
              {labelText}
            </Typography>
            {option.selected && (
              <Iconify
                icon="solar:check-circle-bold"
                width={18}
                sx={{ color: 'primary.light', flexShrink: 0 }}
              />
            )}
          </MenuItem>
          );
        })}
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
