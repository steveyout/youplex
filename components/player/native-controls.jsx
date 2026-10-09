'use client';

import { Iconify } from '@/components/iconify';
import { usePlayerControls } from '@/hooks/use-player-controls';
import { useMovieChapters } from './use-movie-chapters';
import { useVideoPreview } from './use-video-preview';
import { CharacterDrawer } from './character-drawer';
import { useCharacterOcr } from './use-character-ocr';
import { saveWatchProgress, getWatchProgress } from '@/lib/watch-history';
import { isBookmarked, toggleBookmark, BOOKMARKS_EVENT } from '@/lib/bookmarks';
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
import { alpha, useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// ----------------------------------------------------------------------

const EMPTY_ARRAY = Object.freeze([]);

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

function getFullscreenContainer() {
  if (typeof document === 'undefined') return undefined;
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    document.body
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
  touchAction: 'manipulation',
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
  sceneImages = [],
  poster = null,
  type = 'movie',
  id = null,
  tmdbId = null,
  chapters: explicitChapters = null,
  cast = [],
  seasons = [],
  seasonEpisodes = [],
  seasonEpisodesLoading = false,
  onSelectEpisode = null,
}) {
  const theme = useTheme();
  const primaryColor = theme?.palette?.primary?.main || '#FF3030';
  const primaryLight = theme?.palette?.primary?.light || '#FF6060';

  const mediaId = id || tmdbId;

  const remote = useMediaRemote();
  const store = useMediaStore();

  // Cast & AirPlay remote playback states
  const canGoogleCast = useMediaState('canGoogleCast');
  const canAirPlay = useMediaState('canAirPlay');
  const isGoogleCastConnected = useMediaState('isGoogleCastConnected');
  const isAirPlayConnected = useMediaState('isAirPlayConnected');
  const selectServer = onSelectServer || handleSelectServer;

  const [hasChrome, setHasChrome] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && Boolean(window.chrome)) {
      setHasChrome(true);
    }
  }, []);

  const showChromecast = Boolean(canGoogleCast || (!canAirPlay && hasChrome));

  // Keyboard shortcuts: 'r' / 'R' for Cast, 'e' / 'E' for Episodes
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
          setDrawerTab('cast');
          setDrawerOpen((prev) => !prev);
        }
      }
      if ((e.key === 'e' || e.key === 'E') && type === 'tv' && seasons.length > 0) {
        e.preventDefault();
        setDrawerTab('episodes');
        setDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cast.length, type, seasons.length]);

  const captions = useCaptionOptions({ off: 'Off' });
  const qualities = useVideoQualityOptions({ auto: 'Auto' });
  const rates = usePlaybackRateOptions();

  // Anchors for menus
  const [capAnchor, setCapAnchor] = useState(null);
  const [setAnchor, setSetAnchor] = useState(null);
  const [srvAnchor, setSrvAnchor] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('cast');
  const castOpen = drawerOpen;
  const setCastOpen = (val) => {
    if (typeof val === 'function') {
      setDrawerOpen((prev) => val(prev));
    } else {
      setDrawerOpen(val);
    }
  };
  const [mobileMoreAnchor, setMobileMoreAnchor] = useState(null);
  const ocrState = useCharacterOcr({ cast });
  const isMenuOpen = Boolean(capAnchor || setAnchor || srvAnchor || drawerOpen || mobileMoreAnchor);
  const { visible: uiVisible, show: showUI } = usePlayerControls(store.paused, isMenuOpen);

  // Seekbar interactive state
  const [dragVal, setDragVal] = useState(null);
  const [hoverSeek, setHoverSeek] = useState(null);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isVolHovered, setIsVolHovered] = useState(false);

  // Transient double-tap / seek feedback animations
  const [seekFeedback, setSeekFeedback] = useState(null);

  // Auto-resume and watch history
  const [resumedNotice, setResumedNotice] = useState(null);

  // Auto-play next episode on finish
  const hasTriggeredNextRef = useRef(false);
  useEffect(() => {
    hasTriggeredNextRef.current = false;
  }, [mediaId, season, episode]);

  useEffect(() => {
    if (store.ended && hasNextEpisode && onNextEpisode && !hasTriggeredNextRef.current) {
      hasTriggeredNextRef.current = true;
      onNextEpisode();
    }
  }, [store.ended, hasNextEpisode, onNextEpisode]);
  const hasAttemptedResumeRef = useRef(false);
  const lastSavedTimeRef = useRef(0);

  // Bookmarks
  const [bookmarked, setBookmarked] = useState(false);

  const progressBarRef = useRef(null);
  const lastClickRef = useRef({ time: 0, x: 0 });

  const { currentTime, duration, bufferedEnd, volume, muted } = store;
  const isLive = Boolean(store.live || type === 'live' || !Number.isFinite(duration));
  const isLiveEdge = Boolean(store.liveEdge);
  const active = dragVal ?? currentTime;
  const maxSeek = typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
  const canSeek = !isLive && maxSeek > 0;
  const bufferPct = canSeek ? Math.min(100, (bufferedEnd / maxSeek) * 100) : 0;
  const playedPct = canSeek ? Math.min(100, (active / maxSeek) * 100) : 0;

  const isMuted = muted || volume === 0;
  const volIcon = isMuted
    ? 'solar:volume-cross-bold'
    : volume < 0.4
    ? 'solar:volume-small-bold'
    : 'solar:volume-bold';

  const currentThumbnailBackdrop = useMemo(() => {
    if (!hoverSeek || !canSeek || maxSeek <= 0) return backdrop || poster;
    if (Array.isArray(sceneImages) && sceneImages.length > 0) {
      const pct = Math.max(0, Math.min(1, hoverSeek.time / maxSeek));
      const idx = Math.min(sceneImages.length - 1, Math.floor(pct * sceneImages.length));
      return sceneImages[idx];
    }
    return backdrop || poster;
  }, [hoverSeek, canSeek, maxSeek, sceneImages, backdrop, poster]);

  // Compute movie chapters & active chapter info
  const { chapters, getChapterAtTime } = useMovieChapters({
    duration: isLive ? 0 : maxSeek,
    timelineSegments: isLive ? EMPTY_ARRAY : timelineSegments,
    explicitChapters: isLive ? null : explicitChapters,
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

  // Auto-select English subtitles by default
  const hasAutoSelectedSubsRef = useRef(false);
  useEffect(() => {
    hasAutoSelectedSubsRef.current = false;
  }, [videoSrc, season, episode]);

  useEffect(() => {
    if (hasAutoSelectedSubsRef.current) return;
    if (!captions || captions.length <= 1) return;

    // Check if any non-off subtitle track is already selected
    const activeTrack = captions.find((c) => c.selected && c.value !== 'off');
    if (activeTrack) {
      hasAutoSelectedSubsRef.current = true;
      return;
    }

    // Filter available non-off English tracks
    const englishTracks = captions.filter((c) => {
      if (c.value === 'off') return false;
      const lbl = (c.label || c.track?.label || '').toLowerCase();
      const lang = (c.track?.language || c.track?.langCode || '').toLowerCase();
      return lbl.includes('english') || lbl.includes('eng') || lang.startsWith('en');
    });

    if (englishTracks.length > 0) {
      // Prioritize standard English without forced or SDH if available
      const targetTrack =
        englishTracks.find((c) => {
          const l = (c.label || c.track?.label || '').toLowerCase();
          return !l.includes('forced') && !l.includes('sdh') && !l.includes('[cc]');
        }) ||
        englishTracks.find((c) => {
          const l = (c.label || c.track?.label || '').toLowerCase();
          return !l.includes('forced');
        }) ||
        englishTracks[0];

      if (targetTrack && typeof targetTrack.select === 'function') {
        targetTrack.select();
        hasAutoSelectedSubsRef.current = true;
      }
    }
  }, [captions, videoSrc, season, episode]);

  // Sync bookmark state
  useEffect(() => {
    if (!mediaId) return;
    setBookmarked(isBookmarked(mediaId, type));

    const handleBookmarkChange = () => {
      setBookmarked(isBookmarked(mediaId, type));
    };
    window.addEventListener(BOOKMARKS_EVENT, handleBookmarkChange);
    return () => window.removeEventListener(BOOKMARKS_EVENT, handleBookmarkChange);
  }, [mediaId, type]);

  const triggerFeedback = useCallback((typeFeedback) => {
    setSeekFeedback({ type: typeFeedback, id: Date.now() });
  }, []);

  const handleToggleBookmark = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (!mediaId) return;
      const nextState = toggleBookmark({
        id: mediaId,
        tmdbId,
        type: type || 'movie',
        title,
        poster,
        backdrop,
      });
      setBookmarked(nextState);
      triggerFeedback(nextState ? 'bookmark-added' : 'bookmark-removed');
    },
    [mediaId, tmdbId, type, title, poster, backdrop, triggerFeedback]
  );

  // Reset resume ref when media changes
  useEffect(() => {
    hasAttemptedResumeRef.current = false;
    lastSavedTimeRef.current = 0;
    setResumedNotice(null);
  }, [mediaId, type, season, episode]);

  // Auto-resume watch progress
  useEffect(() => {
    if (isLive || !canSeek || !mediaId || hasAttemptedResumeRef.current) return;
    if (maxSeek < 30) return;

    hasAttemptedResumeRef.current = true;
    const saved = getWatchProgress(mediaId, type, season, episode);
    if (saved && saved.currentTime > 10 && saved.currentTime < maxSeek - 20) {
      remote.seek(saved.currentTime);
      setResumedNotice({
        time: saved.currentTime,
        label: durationText(saved.currentTime),
      });
      const timer = setTimeout(() => {
        setResumedNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isLive, canSeek, mediaId, type, season, episode, maxSeek, remote]);

  // Persist progress function
  const persistProgress = useCallback(
    (timeToSave) => {
      if (isLive || !mediaId || !maxSeek || maxSeek <= 0) return;
      const t = typeof timeToSave === 'number' ? timeToSave : currentTime;
      if (t < 3) return;

      saveWatchProgress({
        id: mediaId,
        tmdbId,
        type: type || 'movie',
        title,
        poster,
        backdrop,
        season,
        episode,
        currentTime: t,
        duration: maxSeek,
      });
      lastSavedTimeRef.current = t;
    },
    [isLive, mediaId, tmdbId, type, title, poster, backdrop, season, episode, currentTime, maxSeek]
  );

  // Save on interval while playing
  useEffect(() => {
    if (!canSeek || store.paused) return;

    const interval = setInterval(() => {
      if (Math.abs(currentTime - lastSavedTimeRef.current) >= 3) {
        persistProgress(currentTime);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [canSeek, store.paused, currentTime, persistProgress]);

  // Save on pause
  useEffect(() => {
    if (store.paused && currentTime > 5 && canSeek) {
      persistProgress(currentTime);
    }
  }, [store.paused, currentTime, canSeek, persistProgress]);

  // Save on window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTime > 5 && canSeek) {
        persistProgress(currentTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentTime, canSeek, persistProgress]);

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

  useEffect(() => {
    if (!seekFeedback) return undefined;
    const timer = setTimeout(() => {
      setSeekFeedback(null);
    }, 700);
    return () => clearTimeout(timer);
  }, [seekFeedback]);

  // Handle Seek commit
  const seekCommit = (_, value) => {
    setDragVal(null);
    remote.seek(value);
    persistProgress(value);
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

  // Desktop click and mobile touch tap handler on video canvas:
  // Every single click or tap immediately pauses / plays the video!
  const handleVideoCanvasClick = (e) => {
    e.stopPropagation();
    showUI();

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const { width } = rect;
    const isDouble = now - lastClickRef.current.time < 300;

    // Double-tap left 28%: Rewind 10s
    if (!isLive && isDouble && clickX < width * 0.28) {
      lastClickRef.current = { time: 0, x: 0 };
      remote.seek(Math.max(0, currentTime - 10));
      triggerFeedback('rewind');
      return;
    }

    // Double-tap right 28%: Forward 10s
    if (!isLive && isDouble && clickX > width * 0.72) {
      lastClickRef.current = { time: 0, x: 0 };
      remote.seek(Math.min(maxSeek, currentTime + 10));
      triggerFeedback('forward');
      return;
    }

    lastClickRef.current = { time: now, x: clickX };

    // Single click or tap anywhere on the video canvas immediately pauses / plays!
    if (store.paused) {
      remote.play(e.nativeEvent || e);
      triggerFeedback('play');
    } else {
      remote.pause(e.nativeEvent || e);
      triggerFeedback('pause');
    }
  };

  const handleVideoCanvasDoubleClick = (e) => {
    e.stopPropagation();
    if (store.canFullscreen) {
      remote.toggleFullscreen(e.nativeEvent || e);
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
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
          if (canSeek) {
            e.preventDefault();
            remote.seek(Math.max(0, currentTime - 10));
            triggerFeedback('rewind');
          }
          break;
        case 'arrowright':
        case 'l':
          if (canSeek) {
            e.preventDefault();
            remote.seek(Math.min(maxSeek, currentTime + 10));
            triggerFeedback('forward');
          }
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
        case 'b':
          e.preventDefault();
          handleToggleBookmark();
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
    handleToggleBookmark,
  ]);

  // Format time display
  const timeFormatted = showRemainingTime
    ? `-${durationText(Math.max(0, maxSeek - active))}`
    : durationText(active);

  return (
    <Box
      onPointerMove={showUI}
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
        onDoubleClick={handleVideoCanvasDoubleClick}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          cursor: 'pointer',
          pointerEvents: drawerOpen ? 'none' : 'auto',
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
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)',
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
          height: 160,
          pointerEvents: 'none',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0) 100%)',
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
        spacing={1.5}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          p: { xs: 1.25, sm: 2 },
          zIndex: 3,
          opacity: uiVisible ? 1 : 0,
          transform: uiVisible ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          '& > *': {
            pointerEvents: uiVisible ? 'auto' : 'none',
          },
        }}
      >
        {/* Left: Optional Back + Title Metadata */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flexGrow: 1, maxWidth: { xs: '65%', sm: '75%' } }}>
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
                    fontSize: { xs: 10, sm: 11 },
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
                  fontSize: { xs: 13, sm: 16 },
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                {title}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Right: Bookmark, Mode Switcher & Source Selector */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1.25 }}>
          {/* Mobile Who's this? / Cast Button */}
          {cast.length > 0 && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setDrawerTab('cast');
                setDrawerOpen((prev) => !prev);
              }}
              sx={{
                ...controlButtonSx,
                ...glassPanelSx,
                display: { xs: 'inline-flex', sm: 'none' },
                color: drawerOpen && drawerTab === 'cast' ? 'primary.light' : 'common.white',
                p: { xs: 0.75, sm: 1 },
              }}
              aria-label="Cast and Actors"
            >
              <Iconify icon="solar:users-group-rounded-bold" width={20} />
            </IconButton>
          )}

          {/* Mobile Settings Button */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setSetAnchor(e.currentTarget);
            }}
            sx={{
              ...controlButtonSx,
              ...glassPanelSx,
              display: { xs: 'inline-flex', sm: 'none' },
              p: { xs: 0.75, sm: 1 },
            }}
            aria-label="Settings"
          >
            <Iconify icon="solar:settings-minimalistic-bold" width={20} />
          </IconButton>
          {/* Bookmark Button (Desktop only) */}
          {mediaId && (
            <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <PlayerTooltip title={bookmarked ? 'Remove from Bookmarks (b)' : 'Save to Bookmarks (b)'} placement="bottom" arrow>
                <IconButton
                  onClick={handleToggleBookmark}
                  sx={{
                    ...controlButtonSx,
                    ...glassPanelSx,
                    color: bookmarked ? 'primary.light' : 'common.white',
                    p: { xs: 0.75, sm: 1 },
                  }}
                >
                  <Iconify icon={bookmarked ? 'solar:bookmark-bold' : 'solar:bookmark-linear'} width={20} />
                </IconButton>
              </PlayerTooltip>
            </Box>
          )}

          {/* Mode Pill (Native / Embed) - Desktop only */}
          {onModeChange && allowModeChange && (
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                ...glassPanelSx,
                p: 0.5,
                borderRadius: 3,
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box
                onClick={() => onModeChange('native')}
                sx={{
                  cursor: 'pointer',
                  px: { xs: 1, sm: 1.5 },
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
                      ? `0 2px 10px ${alpha(primaryColor, 0.45)}`
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
                  px: { xs: 1, sm: 1.5 },
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
                      ? `0 2px 10px ${alpha(primaryColor, 0.45)}`
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

          {/* Server / Extractor Dropdown Button (Desktop only) */}
          {serverList.length > 0 && selectServer && (
            <>
              <PlayerTooltip title="Switch stream provider / server" arrow placement="bottom">
                <Box
                  onClick={(e) => setSrvAnchor(e.currentTarget)}
                  sx={{
                    ...glassPanelSx,
                    cursor: 'pointer',
                    px: { xs: 1.1, sm: 1.75 },
                    py: 0.6,
                    borderRadius: 3,
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    gap: { xs: 0.5, sm: 1 },
                    color: 'common.white',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha('#ffffff', 0.18),
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {sourcesLoading ? (
                    <CircularProgress size={14} sx={{ color: 'primary.light' }} />
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
                      maxWidth: { xs: 55, sm: 120 },
                    }}
                    noWrap
                  >
                    {sourcesLoading ? 'Extracting…' : currentServerLabel}
                  </Typography>
                  <Iconify icon="solar:alt-arrow-down-bold" width={12} sx={{ opacity: 0.7 }} />
                </Box>
              </PlayerTooltip>

              <Menu
                container={getFullscreenContainer}
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
                          bgcolor: alpha(primaryColor, 0.18),
                          '&:hover': { bgcolor: alpha(primaryColor, 0.28) },
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
      {/* Transient Seek / Play / Bookmark Feedback */}
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
              borderRadius: seekFeedback.type.startsWith('bookmark') ? 2 : '50%',
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
            {seekFeedback.type === 'bookmark-added' && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1 }}>
                <Iconify icon="solar:bookmark-bold" width={26} sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>
                  Saved to Bookmarks
                </Typography>
              </Stack>
            )}
            {seekFeedback.type === 'bookmark-removed' && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1 }}>
                <Iconify icon="solar:bookmark-linear" width={26} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>
                  Removed from Bookmarks
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      {/* Resumed from timestamp banner */}
      {resumedNotice && (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 80, sm: 104 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            ...glassPanelSx,
            bgcolor: alpha('#0d1117', 0.94),
            border: `1px solid ${alpha('#FF3030', 0.45)}`,
            borderRadius: 2,
            px: { xs: 1.5, sm: 2 },
            py: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
            animation: 'youplex-fade-up 0.25s ease both',
          }}
        >
          <Iconify icon="solar:history-bold" width={18} sx={{ color: 'primary.light' }} />
          <Typography variant="body2" sx={{ color: 'common.white', fontSize: { xs: 12, sm: 13 }, fontWeight: 600 }}>
            Resumed from {resumedNotice.label}
          </Typography>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              remote.seek(0);
              persistProgress(0);
              setResumedNotice(null);
            }}
            sx={{
              color: 'primary.light',
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 700,
              p: 0.5,
              minWidth: 0,
              '&:hover': { bgcolor: alpha('#ffffff', 0.1) },
            }}
          >
            Start Over
          </Button>
        </Box>
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
              onClick={(e) => {
                e.stopPropagation();
                remote.play(e.nativeEvent || e);
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
                  boxShadow: `0 0 30px ${alpha(primaryColor, 0.5)}`,
                },
              }}
            >
              <Iconify icon="solar:play-bold" width={48} sx={{ ml: 0.5 }} />
            </IconButton>
          </Stack>
        )
      )}

      {/* Center Mobile Play / Pause & 10s Seek Controls (Matching Screenshot Layout) */}
      {!store.waiting && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: '44%', sm: '50%' },
            left: '50%',
            transform: uiVisible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.92)',
            zIndex: 4,
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            gap: 2.75,
            pointerEvents: uiVisible ? 'auto' : 'none',
            opacity: uiVisible ? 1 : 0,
            transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Rewind 10s Circular Button */}
          {!isLive && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                remote.seek(Math.max(0, currentTime - 10));
                triggerFeedback('rewind');
              }}
              sx={{
                color: 'common.white',
                bgcolor: alpha('#000000', 0.55),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha('#ffffff', 0.2)}`,
                width: 52,
                height: 52,
                touchAction: 'manipulation',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.15s ease',
                '&:active': { bgcolor: alpha('#000000', 0.8), transform: 'scale(0.92)' },
              }}
              aria-label="Rewind 10 seconds"
            >
              <Iconify icon="ic:round-replay-10" width={30} />
            </IconButton>
          )}

          {/* Large Center Play / Pause Button */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              remote.togglePaused();
              triggerFeedback(store.paused ? 'play' : 'pause');
            }}
            sx={{
              color: 'common.white',
              bgcolor: alpha('#000000', 0.65),
              backdropFilter: 'blur(16px)',
              border: `2px solid ${alpha('#ffffff', 0.3)}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 24px ${alpha(primaryColor, 0.45)}`,
              width: 68,
              height: 68,
              touchAction: 'manipulation',
              transition: 'all 0.15s ease',
              '&:active': { transform: 'scale(0.92)' },
            }}
            aria-label={store.playing ? 'Pause' : 'Play'}
          >
            <Iconify icon={store.playing ? 'solar:pause-bold' : 'solar:play-bold'} width={40} />
          </IconButton>

          {/* Forward 10s Circular Button */}
          {!isLive && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                remote.seek(Math.min(maxSeek, currentTime + 10));
                triggerFeedback('forward');
              }}
              sx={{
                color: 'common.white',
                bgcolor: alpha('#000000', 0.55),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha('#ffffff', 0.2)}`,
                width: 52,
                height: 52,
                touchAction: 'manipulation',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.15s ease',
                '&:active': { bgcolor: alpha('#000000', 0.8), transform: 'scale(0.92)' },
              }}
              aria-label="Forward 10 seconds"
            >
              <Iconify icon="ic:round-forward-10" width={30} />
            </IconButton>
          )}
        </Box>
      )}

      {/* ===================== BOTTOM CONTROLS HUD ===================== */}
      <Stack
        spacing={1}
        onPointerEnter={showUI}
        onPointerMove={showUI}
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
        {/* ================= SEEKBAR ROW ================= */}
        <Box sx={{ width: 1, display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 0 } }}>
          {/* Mobile Current Time (Left) */}
          {isLive ? (
            <Box
              sx={{
                display: { xs: 'flex', sm: 'none' },
                alignItems: 'center',
                gap: 0.5,
                minWidth: 44,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  boxShadow: '0 0 6px #FF3030',
                  animation: 'livetv-blink 1.2s infinite',
                  '@keyframes livetv-blink': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'common.white',
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                LIVE
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="caption"
              sx={{
                display: { xs: 'block', sm: 'none' },
                color: 'common.white',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                fontSize: 12,
                minWidth: 36,
                textAlign: 'left',
                userSelect: 'none',
              }}
            >
              {durationText(active)}
            </Typography>
          )}

          <Box
            ref={progressBarRef}
            onMouseMove={handleSeekMouseMove}
            onMouseLeave={handleSeekMouseLeave}
            onClick={() => {
              if (isLive && typeof remote.seekToLiveEdge === 'function') {
                remote.seekToLiveEdge();
              }
            }}
            sx={{
              position: 'relative',
              flexGrow: 1,
              width: { sm: 1 },
              height: { xs: 26, sm: 24 },
              display: 'flex',
              alignItems: 'center',
              cursor: canSeek ? 'pointer' : isLive ? 'pointer' : 'default',
              touchAction: 'none',
              '&:hover .seek-track': {
                height: 6,
              },
              '&:hover .seek-segment': {
                height: 7,
              },
              '&:hover .seek-segment-played': {
                height: 7,
              },
              '&:hover .seek-thumb': {
                transform: isLive ? 'translate(50%, -50%) scale(1.3)' : 'translate(-50%, -50%) scale(1.25)',
                boxShadow: `0 0 12px ${alpha(primaryColor, 0.8)}, 0 2px 6px rgba(0,0,0,0.6)`,
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

                {/* 2. Live Canvas Video Frame Preview */}
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
                      opacity: hasFrame ? 1 : 0,
                      transition: 'opacity 0.15s ease',
                    }}
                  />
                )}

                {/* 3. Scene Still / Backdrop fallback when canvas has not painted yet */}
                {!thumbnailsUrl && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      backgroundImage: currentThumbnailBackdrop
                        ? `url(${currentThumbnailBackdrop})`
                        : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'brightness(0.72) saturate(1.15)',
                    }}
                  />
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

          {/* Live Progress Bar Glow Track */}
          {isLive && !canSeek && (
            <>
              <Box
                className="seek-track"
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: { xs: 5, sm: 4 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: alpha('#FF3030', 0.2),
                  boxShadow: `0 0 8px ${alpha('#FF3030', 0.25)}`,
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    width: 1,
                    height: 1,
                    background: 'linear-gradient(90deg, rgba(255, 48, 48, 0.35) 0%, #FF3030 100%)',
                    borderRadius: 2,
                    boxShadow: '0 0 10px rgba(255, 48, 48, 0.5)',
                  }}
                />
              </Box>

              {/* Pulsing Live Edge Thumb at 100% */}
              <Box
                className="seek-thumb"
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translate(50%, -50%)',
                  width: { xs: 12, sm: 11 },
                  height: { xs: 12, sm: 11 },
                  borderRadius: '50%',
                  bgcolor: '#FF3030',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 12px #FF3030, 0 0 4px #FFFFFF',
                  zIndex: 6,
                  pointerEvents: 'none',
                  animation: 'livetv-thumb-pulse 1.8s ease-in-out infinite',
                  '@keyframes livetv-thumb-pulse': {
                    '0%, 100%': { transform: 'translate(50%, -50%) scale(1)', boxShadow: '0 0 12px #FF3030, 0 0 4px #FFFFFF' },
                    '50%': { transform: 'translate(50%, -50%) scale(1.25)', boxShadow: '0 0 20px #FF3030, 0 0 8px #FFFFFF' },
                  },
                }}
              />
            </>
          )}

          {/* Background Track (VOD / Seekable) */}
          {!isLive && (
            <Box
              className="seek-track"
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: { xs: 5, sm: 4 },
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
          )}

          {/* Played Progress Bar */}
          {!isLive && (
            <Box
              className="seek-track"
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: `${playedPct}%`,
                height: { xs: 5, sm: 4 },
                borderRadius: 2,
                background: `linear-gradient(90deg, ${primaryColor} 0%, ${primaryLight} 100%)` ,
                transition: 'height 0.15s ease',
                boxShadow: `0 0 8px ${alpha(primaryColor, 0.4)}`,
                zIndex: 2,
                pointerEvents: 'none',
                opacity: 0.88,
              }}
            />
          )}

          {/* Colored Segments on Timeline with Distinct Gradients and Crisp Boundary Notches */}
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
                gradient: seg.gradient || 'linear-gradient(90deg, #FF9800 0%, #FBBF24 100%)',
              };

              const isSegPlayed = active > startSec;
              const playedInSegWidthPct = isSegPlayed
                ? Math.max(0, ((Math.min(active, endSec) - startSec) / maxSeek) * 100)
                : 0;

              return (
                <Box key={seg.id || `${seg.type}-${idx}-${startSec}`}>
                  {/* Unplayed Segment Track with Distinct Gradient */}
                  <Box
                    className="seek-segment"
                    sx={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: { xs: 5, sm: 4 },
                      borderRadius: 1,
                      background: palette.gradient,
                      boxShadow: `0 0 8px ${alpha(palette.color, 0.5)}`,
                      border: `1px solid ${alpha(palette.borderColor || palette.color, 0.6)}`,
                      opacity: 0.65,
                      zIndex: 3,
                      pointerEvents: 'none',
                      transition: 'height 0.15s ease',
                    }}
                  />

                  {/* Played Portion of Segment with Vibrant Glowing Gradient */}
                  {isSegPlayed && (
                    <Box
                      className="seek-segment-played"
                      sx={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        width: `${playedInSegWidthPct}%`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: { xs: 5, sm: 4 },
                        borderRadius: 1,
                        background: palette.gradient,
                        boxShadow: `0 0 12px ${palette.color}, 0 0 4px ${alpha('#ffffff', 0.8)}`,
                        border: `1px solid ${alpha(palette.borderColor || palette.color, 0.9)}`,
                        zIndex: 4,
                        pointerEvents: 'none',
                        transition: 'height 0.15s ease',
                      }}
                    />
                  )}

                  {/* Physical 2.5px Dark Divider Notches at Segment Start & End */}
                  {startSec > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 2.5,
                        height: { xs: 8, sm: 7 },
                        bgcolor: '#0a0d14',
                        boxShadow: '0 0 2px #000000',
                        zIndex: 5,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {endSec < maxSeek && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${(endSec / maxSeek) * 100}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 2.5,
                        height: { xs: 8, sm: 7 },
                        bgcolor: '#0a0d14',
                        boxShadow: '0 0 2px #000000',
                        zIndex: 5,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>
              );
            })}

          {/* Chapter & IntroDB Segment Dividers on Timeline */}
          {canSeek &&
            chapters
              .filter((ch) => ch.start > 0)
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
                      width: 2.5,
                      height: 9,
                      bgcolor: '#050709',
                      borderRadius: 0.5,
                      zIndex: 4,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}

          {/* Scrub Thumb */}
          {!isLive && (
            <Box
              className="seek-thumb"
              sx={{
                position: 'absolute',
                left: `${playedPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%) scale(1)',
                width: { xs: 16, sm: 14 },
                height: { xs: 16, sm: 14 },
                borderRadius: '50%',
                bgcolor: activeSegment
                  ? (SEGMENT_PALETTE[activeSegment.type]?.color || 'common.white')
                  : 'common.white',
                boxShadow: activeSegment
                  ? `0 0 12px ${SEGMENT_PALETTE[activeSegment.type]?.color || '#ffffff'}, 0 2px 8px rgba(0,0,0,0.8)`
                  : '0 2px 8px rgba(0,0,0,0.6)',
                pointerEvents: 'none',
                zIndex: 6,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            />
          )}

          {/* Transparent Slider for Drag Scrubbing */}
          {!isLive && (
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
                height: { xs: 34, sm: 24 },
                opacity: 0,
                cursor: 'pointer',
                p: 0,
                zIndex: 7,
                '& .MuiSlider-thumb': {
                  width: 28,
                  height: 28,
                },
              }}
            />
          )}
          </Box>

          {/* Mobile Total / Remaining Time (Right) */}
          {isLive ? (
            <Typography
              variant="caption"
              sx={{
                display: { xs: 'block', sm: 'none' },
                color: alpha('#ffffff', 0.6),
                fontSize: 11,
                fontWeight: 600,
                minWidth: 28,
                textAlign: 'right',
              }}
            >
              HD
            </Typography>
          ) : (
            <Typography
              variant="caption"
              onClick={() => setShowRemainingTime((prev) => !prev)}
              sx={{
                display: { xs: 'block', sm: 'none' },
                color: alpha('#ffffff', 0.75),
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                fontSize: 12,
                minWidth: 36,
                textAlign: 'right',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {showRemainingTime ? `-${durationText(Math.max(0, maxSeek - active))}` : durationText(duration)}
            </Typography>
          )}
        </Box>

        {/* ================= MOBILE BOTTOM ACTION BAR (Matching Screenshot Layout) ================= */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-around"
          sx={{
            width: 1,
            pt: 0.5,
            display: { xs: 'flex', sm: 'none' },
          }}
        >
          {/* Subtitles & Audio */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setCapAnchor(e.currentTarget);
            }}
            sx={{
              ...controlButtonSx,
              position: 'relative',
              color: hasActiveCaption ? 'primary.light' : 'common.white',
              p: 1,
            }}
            aria-label="Subtitles and Audio"
          >
            <Iconify icon="ph:subtitles-bold" width={24} />
            {hasActiveCaption && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                }}
              />
            )}
          </IconButton>

          {/* Server / Stream Provider Selector */}
          {serverList.length > 0 && selectServer && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSrvAnchor(e.currentTarget);
              }}
              sx={{
                ...controlButtonSx,
                position: 'relative',
                color: 'common.white',
                p: 1,
              }}
              aria-label="Server Selection"
            >
              <Iconify icon="solar:server-2-bold" width={23} />
            </IconButton>
          )}

          {/* TV Episodes & Seasons Drawer */}
          {type === 'tv' && seasons.length > 0 && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setDrawerTab('episodes');
                setDrawerOpen(true);
              }}
              sx={{
                ...controlButtonSx,
                position: 'relative',
                color: drawerOpen && drawerTab === 'episodes' ? 'primary.main' : 'common.white',
                p: 1,
              }}
              aria-label="Episodes and Seasons"
            >
              <Iconify icon="solar:clapperboard-play-bold" width={23} />
            </IconButton>
          )}

          {/* Player Settings / Speed Menu */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setSetAnchor(e.currentTarget);
            }}
            sx={{
              ...controlButtonSx,
              color: 'common.white',
              p: 1,
            }}
            aria-label="Player Settings"
          >
            <Iconify icon="solar:tuning-bold" width={23} />
          </IconButton>

          {/* Fullscreen Toggle */}
          {store.canFullscreen && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                remote.toggleFullscreen();
              }}
              sx={{
                ...controlButtonSx,
                color: 'common.white',
                p: 1,
              }}
              aria-label="Fullscreen"
            >
              <Iconify
                icon={store.fullscreen ? 'ic:round-fullscreen-exit' : 'ic:round-fullscreen'}
                width={25}
              />
            </IconButton>
          )}
        </Stack>

        {/* ================= DESKTOP CONTROLS ROW ================= */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.25, sm: 0.75 }}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          {/* Play / Pause (Desktop) */}
          <PlayerTooltip title={store.playing ? 'Pause (k)' : 'Play (k)'} placement="top" arrow>
            <IconButton onClick={(e) => { e.stopPropagation(); remote.togglePaused(); }} sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}>
              <Iconify icon={store.playing ? 'solar:pause-bold' : 'solar:play-bold'} width={26} />
            </IconButton>
          </PlayerTooltip>

          {/* Live Edge Button or 10s skips */}
          {isLive ? (
            <PlayerTooltip
              title={isLiveEdge ? 'Streaming live broadcast' : 'Click to jump to live edge'}
              placement="top"
              arrow
            >
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof remote.seekToLiveEdge === 'function') {
                    remote.seekToLiveEdge();
                  }
                }}
                startIcon={
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#FF3030',
                      boxShadow: '0 0 8px #FF3030',
                      animation: 'livetv-blink 1.2s infinite',
                      '@keyframes livetv-blink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.3 },
                      },
                    }}
                  />
                }
                sx={{
                  color: 'common.white',
                  bgcolor: alpha('#FF3030', 0.16),
                  border: `1px solid ${alpha('#FF3030', 0.4)}`,
                  fontWeight: 800,
                  fontSize: 11.5,
                  letterSpacing: 0.5,
                  px: 1.25,
                  py: 0.4,
                  minWidth: 0,
                  borderRadius: 1.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: alpha('#FF3030', 0.28),
                    borderColor: '#FF3030',
                  },
                }}
              >
                LIVE
              </Button>
            </PlayerTooltip>
          ) : (
            <>
              {/* 10s Rewind (Desktop) */}
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

              {/* 10s Forward (Desktop) */}
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
            </>
          )}

          {/* Volume Control with Expandable Slider (Desktop only) */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            onMouseEnter={() => setIsVolHovered(true)}
            onMouseLeave={() => setIsVolHovered(false)}
            sx={{ ml: { xs: 0, sm: 0.5 }, display: { xs: 'none', sm: 'flex' } }}
          >
            <PlayerTooltip title={isMuted ? 'Unmute (m)' : 'Mute (m)'} placement="top" arrow>
              <IconButton onClick={handleToggleMute} sx={controlButtonSx}>
                <Iconify icon={volIcon} width={24} />
              </IconButton>
            </PlayerTooltip>

            <Box
              sx={{
                width: isVolHovered ? 84 : 0,
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
          {isLive ? (
            <Typography
              variant="caption"
              sx={{
                color: alpha('#ffffff', 0.8),
                fontVariantNumeric: 'tabular-nums',
                ml: { xs: 0.25, sm: 1 },
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: { xs: 11.5, sm: 13 },
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <span>High-Speed Broadcast</span>
            </Typography>
          ) : (
            <PlayerTooltip title="Click to toggle remaining time" arrow placement="top">
              <Typography
                variant="caption"
                onClick={() => setShowRemainingTime((prev) => !prev)}
                sx={{
                  color: 'common.white',
                  fontVariantNumeric: 'tabular-nums',
                  ml: { xs: 0.25, sm: 1 },
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  fontSize: { xs: 11.5, sm: 13 },
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
          )}

          {/* IntroDB Segment Pills (Direct Jump Buttons) */}
          {timelineSegments && timelineSegments.length > 0 && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
              {timelineSegments.map((seg, idx) => {
                const startSec = clamp(Number(seg.start) || 0, 0, maxSeek);
                const palette = SEGMENT_PALETTE[seg.type] || {
                  color: seg.color || '#FFB800',
                  label: seg.label || 'Segment',
                };
                return (
                  <PlayerTooltip
                    key={`seg-pill-${seg.id || idx}`}
                    title={`Jump to ${palette.label} (${durationText(startSec)})`}
                    placement="top"
                    arrow
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        px: 0.85,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: alpha(palette.color, 0.16),
                        border: `1px solid ${alpha(palette.color, 0.45)}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: alpha(palette.color, 0.3),
                          borderColor: palette.color,
                          transform: 'scale(1.04)',
                        },
                      }}
                      onClick={() => {
                        remote.seek(startSec);
                        triggerFeedback('forward');
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: palette.color,
                          boxShadow: `0 0 6px ${palette.color}`,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: palette.color,
                          fontWeight: 700,
                          fontSize: 11,
                          lineHeight: 1.2,
                        }}
                      >
                        {palette.label}
                      </Typography>
                    </Box>
                  </PlayerTooltip>
                );
              })}
            </Stack>
          )}

          {/* Active Chapter / Segment Label */}
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

          {/* Episodes Selector Button (TV Shows - Desktop direct) */}
          {type === 'tv' && seasons.length > 0 && (
            <PlayerTooltip title="Episodes & Seasons (e)" placement="top" arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerTab('episodes');
                  setDrawerOpen(true);
                }}
                sx={{
                  ...controlButtonSx,
                  display: { xs: 'none', sm: 'inline-flex' },
                  position: 'relative',
                  color: drawerOpen && drawerTab === 'episodes' ? 'primary.main' : 'common.white',
                  bgcolor: drawerOpen && drawerTab === 'episodes' ? alpha(primaryColor, 0.16) : 'transparent',
                }}
              >
                <Iconify icon="solar:clapperboard-play-bold" width={22} />
              </IconButton>
            </PlayerTooltip>
          )}

          {/* Who's this? / Cast in scene (Desktop direct, Mobile in overflow menu) */}
          {cast.length > 0 && (
            <PlayerTooltip title="Who's this? / Actors (r)" placement="top" arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerTab('cast');
                  setDrawerOpen((prev) => !prev);
                }}
                sx={{
                  ...controlButtonSx,
                  display: { xs: 'none', sm: 'inline-flex' },
                  position: 'relative',
                  color: castOpen ? 'primary.main' : 'common.white',
                  bgcolor: castOpen ? alpha(primaryColor, 0.16) : 'transparent',
                }}
              >
                <Iconify icon="solar:users-group-rounded-bold" width={22} />
              </IconButton>
            </PlayerTooltip>
          )}

          {/* Server Switcher Button (Desktop direct, Mobile in overflow menu) */}
          {serverList.length > 0 && selectServer && (
            <PlayerTooltip title={`Servers (${currentServerLabel})`} placement="top" arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSrvAnchor(e.currentTarget);
                }}
                sx={{
                  ...controlButtonSx,
                  display: { xs: 'none', sm: 'inline-flex' },
                  position: 'relative',
                  color: 'common.white',
                }}
              >
                <Iconify icon="solar:server-2-bold" width={22} />
              </IconButton>
            </PlayerTooltip>
          )}

          {/* Captions / Subtitles Menu (Both Desktop & Mobile) */}
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

          {/* Quality & Speed Settings Menu (Desktop direct, Mobile in overflow menu) */}
          <PlayerTooltip title="Settings" placement="top" arrow>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSetAnchor(e.currentTarget);
              }}
              sx={{
                ...controlButtonSx,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
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

          {/* Apple AirPlay (Desktop direct, Mobile in overflow menu) */}
          {canAirPlay && (
            <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
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
                      bgcolor: isAirPlayConnected ? alpha(primaryColor, 0.16) : 'transparent',
                    }}
                  >
                    <Iconify
                      icon={isAirPlayConnected ? 'material-symbols:airplay' : 'material-symbols:airplay-rounded'}
                      width={22}
                    />
                  </IconButton>
                </AirPlayButton>
              </PlayerTooltip>
            </Box>
          )}

          {/* Google Cast / Chromecast (Desktop direct, Mobile in overflow menu) */}
          {showChromecast && (
            <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
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
                      bgcolor: isGoogleCastConnected ? alpha(primaryColor, 0.16) : 'transparent',
                    }}
                  >
                    <Iconify
                      icon={isGoogleCastConnected ? 'solar:screencast-bold' : 'solar:screencast-2-bold'}
                      width={22}
                    />
                  </IconButton>
                </GoogleCastButton>
              </PlayerTooltip>
            </Box>
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

      {/* ===================== FLOATING "WHO'S THIS?" BUTTON (ICON ONLY WITH TOOLTIP) ===================== */}
      {cast.length > 0 && uiVisible && (
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            position: 'absolute',
            bottom: activeSegment ? { xs: 120, sm: 144 } : { xs: 74, sm: 96 },
            right: { xs: 12, sm: 24 },
            zIndex: 24,
            pointerEvents: 'auto',
            animation: 'youplex-fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          <PlayerTooltip title="Who's this? / Actors in scene (r)" placement="left" arrow>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setDrawerTab('cast');
                setDrawerOpen(true);
              }}
              aria-label="Who's this actor?"
              sx={{
                ...glassPanelSx,
                width: { xs: 40, sm: 46 },
                height: { xs: 40, sm: 46 },
                bgcolor: alpha('#0d1117', 0.9),
                color: 'common.white',
                border: `1px solid ${alpha('#ffffff', 0.28)}`,
                boxShadow: `0 8px 30px rgba(0, 0, 0, 0.65), 0 0 16px ${alpha(primaryColor, 0.25)}`,
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: alpha('#161c24', 0.98),
                  borderColor: 'primary.light',
                  color: 'primary.light',
                  transform: 'scale(1.1) translateY(-2px)',
                  boxShadow: `0 12px 32px rgba(0, 0, 0, 0.8), 0 0 20px ${alpha(primaryColor, 0.5)}`,
                },
                '&:active': {
                  transform: 'scale(0.96)',
                },
              }}
            >
              <Iconify icon="solar:user-speak-rounded-bold" width={{ xs: 20, sm: 24 }} />
            </IconButton>
          </PlayerTooltip>
        </Box>
      )}

      {/* ===================== FLOATING SKIP BUTTON ===================== */}
      {activeSegment && (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 84, sm: 96 },
            right: { xs: 16, sm: 24 },
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
                  boxShadow: `0 6px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${alpha(palette.color || primaryColor, 0.2)}`,
                  backdropFilter: 'blur(16px)',
                  py: { xs: 0.75, sm: 0.9 },
                  px: { xs: 1.75, sm: 2.25 },
                  borderRadius: 1.25,
                  fontSize: { xs: 12.5, sm: 13.5 },
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  textTransform: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: alpha('#161c24', 0.98),
                    borderColor: palette.color || primaryColor,
                    color: 'common.white',
                    transform: 'translateY(-1px)',
                    boxShadow: `0 8px 28px rgba(0, 0, 0, 0.75), 0 0 16px ${alpha(palette.color || primaryColor, 0.35)}`,
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

      {/* ===================== WHO'S THIS? / CAST & EPISODES DRAWER ===================== */}
      <CharacterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cast={cast}
        ocrState={ocrState}
        type={type}
        seasons={seasons}
        seasonEpisodes={seasonEpisodes}
        seasonEpisodesLoading={seasonEpisodesLoading}
        currentSeason={season}
        currentEpisode={episode}
        onSelectEpisode={onSelectEpisode}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        tmdbId={tmdbId || mediaId}
        backdrop={backdrop}
        sceneImages={sceneImages}
      />

      {/* ===================== MOBILE OVERFLOW MENU (xs ONLY) ===================== */}
      <Menu
        container={getFullscreenContainer}
        anchorEl={mobileMoreAnchor}
        open={Boolean(mobileMoreAnchor)}
        onClose={() => setMobileMoreAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              ...menuPaperSx,
              width: 250,
              py: 1,
              borderRadius: 2,
            },
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 0.5,
            display: 'block',
            color: 'text.disabled',
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontSize: 10.5,
          }}
        >
          Player Controls
        </Typography>

        {/* Episodes Selector for Mobile */}
        {type === 'tv' && seasons.length > 0 && (
          <MenuItem
            onClick={() => {
              setMobileMoreAnchor(null);
              setDrawerTab('episodes');
              setDrawerOpen(true);
            }}
            sx={{ py: 1.25, px: 2, gap: 1.5 }}
          >
            <Iconify icon="solar:clapperboard-play-bold" width={20} sx={{ color: 'primary.light' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Episodes & Seasons
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: 1,
                bgcolor: alpha(primaryColor, 0.16),
                color: 'primary.light',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              S{season} E{episode}
            </Box>
          </MenuItem>
        )}

        {/* Who's this? */}
        {cast.length > 0 && (
          <MenuItem
            onClick={() => {
              setMobileMoreAnchor(null);
              setDrawerTab('cast');
              setDrawerOpen(true);
            }}
            sx={{ py: 1.25, px: 2, gap: 1.5 }}
          >
            <Iconify icon="solar:user-speak-rounded-bold" width={20} sx={{ color: 'primary.light' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Who&apos;s this?
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: 1,
                bgcolor: alpha(primaryColor, 0.16),
                color: 'primary.light',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {cast.length}
            </Box>
          </MenuItem>
        )}

        {/* Server Switcher */}
        {serverList.length > 0 && selectServer && (
          <MenuItem
            onClick={(e) => {
              const anchor = mobileMoreAnchor;
              setMobileMoreAnchor(null);
              setSrvAnchor(anchor);
            }}
            sx={{ py: 1.25, px: 2, gap: 1.5 }}
          >
            <Iconify icon="solar:server-2-bold" width={20} sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>
              Server Source
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 700 }}>
              {currentServerLabel}
            </Typography>
          </MenuItem>
        )}

        {/* Settings (Speed & Quality) */}
        <MenuItem
          onClick={() => {
            const anchor = mobileMoreAnchor;
            setMobileMoreAnchor(null);
            setSetAnchor(anchor);
          }}
          sx={{ py: 1.25, px: 2, gap: 1.5 }}
        >
          <Iconify icon="solar:settings-minimalistic-bold" width={20} sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>
            Playback Settings
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {rates.find((r) => r.selected)?.label || 'Normal'}
          </Typography>
        </MenuItem>

        {/* PiP */}
        {store.canPictureInPicture && (
          <MenuItem
            onClick={() => {
              setMobileMoreAnchor(null);
              remote.togglePictureInPicture();
            }}
            sx={{ py: 1.25, px: 2, gap: 1.5 }}
          >
            <Iconify icon="ic:round-picture-in-picture" width={20} sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Picture in Picture
            </Typography>
          </MenuItem>
        )}

        {/* AirPlay */}
        {canAirPlay && (
          <MenuItem
            component="div"
            onClick={() => setMobileMoreAnchor(null)}
            sx={{ py: 1.25, px: 2, gap: 1.5 }}
          >
            <Iconify icon="material-symbols:airplay-rounded" width={20} sx={{ color: isAirPlayConnected ? 'primary.light' : 'text.secondary' }} />
            <Box sx={{ flexGrow: 1 }}>
              <AirPlayButton asChild>
                <Box component="button" sx={{ all: 'unset', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {isAirPlayConnected ? 'Disconnect AirPlay' : 'Apple AirPlay'}
                  </Typography>
                </Box>
              </AirPlayButton>
            </Box>
          </MenuItem>
        )}

        {/* Chromecast */}
        {showChromecast && (
          <MenuItem
            component="div"
            onClick={() => setMobileMoreAnchor(null)}
            sx={{ py: 1.25, px: 2, gap: 1.5 }}
          >
            <Iconify icon="solar:screencast-bold" width={20} sx={{ color: isGoogleCastConnected ? 'primary.light' : 'text.secondary' }} />
            <Box sx={{ flexGrow: 1 }}>
              <GoogleCastButton asChild>
                <Box component="button" sx={{ all: 'unset', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {isGoogleCastConnected ? 'Disconnect Chromecast' : 'Cast to TV'}
                  </Typography>
                </Box>
              </GoogleCastButton>
            </Box>
          </MenuItem>
        )}
      </Menu>

      {/* ===================== CAPTIONS MENU ===================== */}
      <Menu
        container={getFullscreenContainer}
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
          if (option.value === 'off') {
            return (
              <MenuItem
                key="caption-off"
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
                    bgcolor: alpha(primaryColor, 0.18),
                    '&:hover': { bgcolor: alpha(primaryColor, 0.28) },
                  },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: option.selected ? 600 : 400 }}>
                  Off
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
          }

          let labelText = option.label || option.track?.label || 'Subtitles';
          const sameTracks = captions.filter(
            (c) => (c.label || c.track?.label) === labelText && c.value !== 'off'
          );
          if (sameTracks.length > 1) {
            const occurIdx = captions.filter(
              (c, i) => i <= optIdx && (c.label || c.track?.label) === labelText && c.value !== 'off'
            ).length;
            labelText = `${labelText} (${occurIdx})`;
          }

          // Parse descriptors and badges
          const isSDH = /\[SDH\]|\[CC\]|\(SDH\)|\(CC\)/i.test(labelText);
          const isForced = /\[Forced\]|\(Forced\)/i.test(labelText);
          const isOpenSubs = /OpenSubtitles/i.test(labelText);
          const isStream = /\[Stream(?: \d+)?\]/i.test(labelText);
          const releaseMatch = labelText.match(/\[(BluRay|BDRip|BRRip|WEB-DL|WEBRip|HDTV|HDRip|DVDRip|YIFY|PSA|RARBG)\]/i);
          const releaseTag = releaseMatch ? releaseMatch[1] : '';

          let cleanTitle = labelText
            .replace(/\[(?:SDH|CC|Forced|Stream(?: \d+)?)\]/gi, '')
            .replace(/\(OpenSubtitles\)/gi, '')
            .replace(/\[(?:BluRay|BDRip|BRRip|WEB-DL|WEBRip|HDTV|HDRip|DVDRip|YIFY|PSA|RARBG)\]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (!cleanTitle) cleanTitle = labelText;

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
                gap: 1.5,
                '&.Mui-selected': {
                  bgcolor: alpha(primaryColor, 0.18),
                  '&:hover': { bgcolor: alpha(primaryColor, 0.28) },
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.85} sx={{ minWidth: 0, flexWrap: 'wrap', gap: 0.6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: option.selected ? 600 : 400 }}>
                  {cleanTitle}
                </Typography>
                {isStream && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0.75,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(0, 167, 111, 0.16)',
                      color: '#00a76f',
                      border: '1px solid rgba(0, 167, 111, 0.35)',
                      lineHeight: 1.2,
                    }}
                  >
                    Stream
                  </Box>
                )}
                {isSDH && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0.75,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(255, 171, 0, 0.16)',
                      color: '#ffc107',
                      border: '1px solid rgba(255, 171, 0, 0.35)',
                      lineHeight: 1.2,
                    }}
                  >
                    SDH / CC
                  </Box>
                )}
                {isForced && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0.75,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(255, 86, 48, 0.16)',
                      color: '#ff7043',
                      border: '1px solid rgba(255, 86, 48, 0.35)',
                      lineHeight: 1.2,
                    }}
                  >
                    Forced
                  </Box>
                )}
                {releaseTag && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0.75,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      color: 'text.secondary',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      lineHeight: 1.2,
                    }}
                  >
                    {releaseTag}
                  </Box>
                )}
                {isOpenSubs && (
                  <Box
                    sx={{
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0.75,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(142, 51, 255, 0.16)',
                      color: '#b388ff',
                      border: '1px solid rgba(142, 51, 255, 0.35)',
                      lineHeight: 1.2,
                    }}
                  >
                    OpenSubtitles
                  </Box>
                )}
              </Stack>
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
        container={getFullscreenContainer}
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
                    bgcolor: alpha(primaryColor, 0.18),
                    '&:hover': { bgcolor: alpha(primaryColor, 0.28) },
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
                bgcolor: alpha(primaryColor, 0.18),
                '&:hover': { bgcolor: alpha(primaryColor, 0.28) },
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
