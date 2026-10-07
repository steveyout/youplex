'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Iconify } from '@/components/iconify';
import { alpha, useTheme } from '@mui/material/styles';
import { getSeasonDetails } from '@/actions/api';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// ----------------------------------------------------------------------

function getFullscreenContainer() {
  if (typeof document === 'undefined') return undefined;
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    undefined
  );
}

export function CharacterDrawer({
  open,
  onClose,
  cast = [],
  ocrState,
  type = 'movie',
  seasons = [],
  seasonEpisodes = [],
  seasonEpisodesLoading = false,
  currentSeason = 1,
  currentEpisode = 1,
  onSelectEpisode = null,
  activeTab = 'cast',
  onTabChange = null,
  tmdbId = null,
  backdrop = null,
}) {
  const theme = useTheme();
  const primaryColor = theme?.palette?.primary?.main || '#FF3030';
  const primaryLight = theme?.palette?.primary?.light || '#FF6060';

  const [fullscreenContainer, setFullscreenContainer] = useState(undefined);

  useEffect(() => {
    const updateContainer = () => {
      if (typeof document === 'undefined') return;
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        undefined;
      setFullscreenContainer(fsEl);
    };

    updateContainer();
    document.addEventListener('fullscreenchange', updateContainer);
    document.addEventListener('webkitfullscreenchange', updateContainer);
    document.addEventListener('mozfullscreenchange', updateContainer);
    document.addEventListener('MSFullscreenChange', updateContainer);

    return () => {
      document.removeEventListener('fullscreenchange', updateContainer);
      document.removeEventListener('webkitfullscreenchange', updateContainer);
      document.removeEventListener('mozfullscreenchange', updateContainer);
      document.removeEventListener('MSFullscreenChange', updateContainer);
    };
  }, []);

  const isTv = type === 'tv' && seasons.length > 0;

  // Active tab: 'episodes' | 'cast'
  const [tab, setTab] = useState(activeTab || (isTv ? 'episodes' : 'cast'));

  useEffect(() => {
    if (activeTab) setTab(activeTab);
  }, [activeTab]);

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    if (onTabChange) onTabChange(newTab);
  };

  // Selected season for browsing
  const [selectedSeasonTab, setSelectedSeasonTab] = useState(Number(currentSeason) || 1);

  useEffect(() => {
    if (currentSeason) setSelectedSeasonTab(Number(currentSeason));
  }, [currentSeason]);

  // Display episodes state (current season from parent, other seasons fetched on-demand)
  const [displayEpisodes, setDisplayEpisodes] = useState(seasonEpisodes);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (Number(selectedSeasonTab) === Number(currentSeason)) {
      setDisplayEpisodes(seasonEpisodes);
      setLoadingEpisodes(seasonEpisodesLoading);
    } else if (tmdbId) {
      let active = true;
      setLoadingEpisodes(true);
      getSeasonDetails(tmdbId, selectedSeasonTab)
        .then((data) => {
          if (active && Array.isArray(data?.episodes)) {
            setDisplayEpisodes(data.episodes);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoadingEpisodes(false);
        });
      return () => {
        active = false;
      };
    }
  }, [selectedSeasonTab, currentSeason, seasonEpisodes, seasonEpisodesLoading, tmdbId]);

  // Cast search query
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isScanning,
    scanStatus,
    detectedCharacters,
    scannedFrameUrl,
    scanMessage,
    scanCurrentCharacter,
    clearScan,
  } = ocrState || {};

  // Filtered cast based on search query
  const filteredCast = useMemo(() => {
    if (!searchQuery.trim()) return cast;
    const q = searchQuery.toLowerCase();
    return cast.filter(
      (actor) =>
        (actor.name && actor.name.toLowerCase().includes(q)) ||
        (actor.character && actor.character.toLowerCase().includes(q))
    );
  }, [cast, searchQuery]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      container={fullscreenContainer}
      disablePortal={false}
      PaperProps={{
        sx: {
          zIndex: 100000,
          pointerEvents: 'auto !important',
          width: { xs: '100%', sm: 420, md: 460 },
          maxWidth: { xs: '100%', sm: 480 },
          bgcolor: '#0a0d14 !important',
          backgroundColor: '#0a0d14 !important',
          backgroundImage: 'none !important',
          backdropFilter: 'none !important',
          WebkitBackdropFilter: 'none !important',
          borderLeft: `1px solid ${alpha('#ffffff', 0.12)}`,
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.95)',
          color: 'common.white',
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateZ(0)',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      }}
      ModalProps={{
        BackdropProps: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          },
        },
      }}
      sx={{
        zIndex: 99999,
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        },
        '& .MuiDrawer-paper': {
          zIndex: 100000,
          pointerEvents: 'auto !important',
          width: { xs: '100%', sm: 420, md: 460 },
          maxWidth: { xs: '100%', sm: 480 },
          bgcolor: '#0a0d14 !important',
          backgroundColor: '#0a0d14 !important',
          backgroundImage: 'none !important',
          backdropFilter: 'none !important',
          WebkitBackdropFilter: 'none !important',
          borderLeft: `1px solid ${alpha('#ffffff', 0.12)}`,
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.95)',
          color: 'common.white',
        },
      }}
    >
      {/* 1. Header with Tab Switcher */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderBottom: `1px solid ${alpha('#ffffff', 0.1)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#0c1018',
          flexShrink: 0,
        }}
      >
        {isTv ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{
              bgcolor: alpha('#ffffff', 0.06),
              p: 0.5,
              borderRadius: 1.5,
              border: `1px solid ${alpha('#ffffff', 0.08)}`,
            }}
          >
            <Button
              size="small"
              onClick={() => handleTabSwitch('episodes')}
              startIcon={<Iconify icon="solar:clapperboard-play-bold" width={17} />}
              sx={{
                px: { xs: 1.25, sm: 1.75 },
                py: 0.5,
                borderRadius: 1,
                fontSize: { xs: 12, sm: 12.5 },
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: tab === 'episodes' ? alpha(primaryColor, 0.22) : 'transparent',
                color: tab === 'episodes' ? 'primary.light' : alpha('#ffffff', 0.7),
                border: tab === 'episodes' ? `1px solid ${alpha(primaryColor, 0.4)}` : '1px solid transparent',
                '&:hover': {
                  bgcolor: alpha(primaryColor, 0.15),
                  color: 'common.white',
                },
              }}
            >
              Episodes
            </Button>
            <Button
              size="small"
              onClick={() => handleTabSwitch('cast')}
              startIcon={<Iconify icon="solar:user-speak-rounded-bold" width={17} />}
              sx={{
                px: { xs: 1.25, sm: 1.75 },
                py: 0.5,
                borderRadius: 1,
                fontSize: { xs: 12, sm: 12.5 },
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: tab === 'cast' ? alpha(primaryColor, 0.22) : 'transparent',
                color: tab === 'cast' ? 'primary.light' : alpha('#ffffff', 0.7),
                border: tab === 'cast' ? `1px solid ${alpha(primaryColor, 0.4)}` : '1px solid transparent',
                '&:hover': {
                  bgcolor: alpha(primaryColor, 0.15),
                  color: 'common.white',
                },
              }}
            >
              Cast & OCR {cast.length > 0 ? `(${cast.length})` : ''}
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(primaryColor, 0.16),
                color: 'primary.light',
                border: `1px solid ${alpha(primaryColor, 0.3)}`,
              }}
            >
              <Iconify icon="solar:user-speak-rounded-bold" width={22} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Who&apos;s this?
                </Typography>
                <Box
                  sx={{
                    px: 0.85,
                    py: 0.15,
                    borderRadius: 0.75,
                    bgcolor: alpha(primaryColor, 0.2),
                    color: 'primary.light',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {cast.length}
                </Box>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                Cast & Characters in Scene
              </Typography>
            </Box>
          </Stack>
        )}

        <IconButton
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            p: 0.75,
            borderRadius: 1.25,
            bgcolor: alpha('#ffffff', 0.06),
            '&:hover': {
              color: 'common.white',
              bgcolor: alpha('#ffffff', 0.12),
            },
          }}
          aria-label="Close drawer"
        >
          <Iconify icon="eva:close-fill" width={20} />
        </IconButton>
      </Box>

      {/* ===================== TAB: EPISODES ===================== */}
      {isTv && tab === 'episodes' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Season Selector Bar */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
              bgcolor: '#080b11',
              flexShrink: 0,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, color: 'text.secondary' }}>
                  Season:
                </Typography>
                <Select
                  size="small"
                  value={selectedSeasonTab}
                  onChange={(e) => setSelectedSeasonTab(Number(e.target.value))}
                  MenuProps={{
                    container: fullscreenContainer || undefined,
                    disablePortal: false,
                    PaperProps: {
                      sx: {
                        zIndex: 120000,
                        bgcolor: '#0a0e14',
                        color: 'common.white',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
                        maxHeight: 320,
                        '& .MuiMenuItem-root': {
                          fontSize: 13,
                          py: 1,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                          '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.16)' },
                        },
                      },
                    },
                    sx: {
                      zIndex: 120000,
                    },
                  }}
                  sx={{
                    color: 'common.white',
                    bgcolor: alpha('#ffffff', 0.08),
                    borderRadius: 1.25,
                    height: 34,
                    fontSize: 13,
                    fontWeight: 700,
                    '& .MuiSelect-select': { py: 0.5, px: 1.5 },
                    '& .MuiSelect-icon': { color: 'text.secondary' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#ffffff', 0.15) },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.light' },
                  }}
                >
                  {seasons.map((s) => (
                    <MenuItem key={s.season_number} value={s.season_number}>
                      {s.name || `Season ${s.season_number}`} {s.episode_count ? `(${s.episode_count} eps)` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <Box
                sx={{
                  px: 1.2,
                  py: 0.35,
                  borderRadius: 0.85,
                  bgcolor: alpha(primaryColor, 0.18),
                  border: `1px solid ${alpha(primaryColor, 0.35)}`,
                  color: 'primary.light',
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                }}
              >
                Playing: S{currentSeason} &bull; E{currentEpisode}
              </Box>
            </Stack>
          </Box>

          {/* Episode Cards List */}
          <Stack
            spacing={1.25}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: { xs: 1.5, sm: 2 },
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { width: 5 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: alpha('#ffffff', 0.2),
                borderRadius: 2.5,
              },
            }}
          >
            {loadingEpisodes ? (
              <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={32} sx={{ color: 'primary.light' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Loading season episodes...
                </Typography>
              </Box>
            ) : displayEpisodes.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                <Iconify icon="solar:clapperboard-play-linear" width={40} sx={{ opacity: 0.35, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  No episodes found for Season {selectedSeasonTab}
                </Typography>
              </Box>
            ) : (
              displayEpisodes.map((ep) => {
                const isCurrent =
                  Number(ep.episode_number) === Number(currentEpisode) &&
                  Number(selectedSeasonTab) === Number(currentSeason);

                return (
                  <Box
                    key={ep.id || `ep-${ep.episode_number}`}
                    onClick={() => {
                      if (onSelectEpisode) {
                        onSelectEpisode(selectedSeasonTab, ep.episode_number);
                        onClose();
                      }
                    }}
                    sx={{
                      p: { xs: 1, sm: 1.25 },
                      borderRadius: 1.75,
                      cursor: 'pointer',
                      bgcolor: isCurrent ? alpha(primaryColor, 0.14) : alpha('#ffffff', 0.03),
                      border: `1px solid ${isCurrent ? alpha(primaryColor, 0.45) : alpha('#ffffff', 0.07)}`,
                      boxShadow: isCurrent ? `0 0 16px ${alpha(primaryColor, 0.25)}` : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      gap: { xs: 1.25, sm: 1.5 },
                      alignItems: 'center',
                      touchAction: 'manipulation',
                      pointerEvents: 'auto',
                      '&:hover': {
                        bgcolor: isCurrent ? alpha(primaryColor, 0.2) : alpha('#ffffff', 0.08),
                        borderColor: isCurrent ? primaryColor : alpha('#ffffff', 0.2),
                        transform: 'translateX(3px)',
                      },
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                    }}
                  >
                    {/* Thumbnail Still */}
                    <Box
                      sx={{
                        width: { xs: 104, sm: 120 },
                        aspectRatio: '16/9',
                        borderRadius: 1.25,
                        overflow: 'hidden',
                        position: 'relative',
                        flexShrink: 0,
                        bgcolor: '#141822',
                        border: `1px solid ${alpha('#ffffff', 0.1)}`,
                      }}
                    >
                      <Box
                        component="img"
                        src={
                          ep.still_path
                            ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                            : backdrop || '/assets/placeholder.jpg'
                        }
                        alt={ep.name}
                        loading="lazy"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {ep.runtime && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 3,
                            right: 3,
                            px: 0.5,
                            py: 0.1,
                            borderRadius: 0.5,
                            bgcolor: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            fontSize: 9.5,
                            fontWeight: 700,
                          }}
                        >
                          {ep.runtime}m
                        </Box>
                      )}
                      {isCurrent && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: alpha(primaryColor, 0.3),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify icon="solar:play-circle-bold" width={28} sx={{ color: 'common.white' }} />
                        </Box>
                      )}
                    </Box>

                    {/* Episode Text Info */}
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: isCurrent ? 'primary.light' : alpha('#ffffff', 0.6),
                            fontSize: 11,
                          }}
                        >
                          EP {ep.episode_number}
                        </Typography>
                        {isCurrent && (
                          <Box
                            sx={{
                              px: 0.6,
                              py: 0.1,
                              borderRadius: 0.5,
                              bgcolor: 'primary.main',
                              color: 'common.white',
                              fontSize: 9.5,
                              fontWeight: 800,
                              letterSpacing: 0.3,
                            }}
                          >
                            NOW PLAYING
                          </Box>
                        )}
                      </Stack>

                      <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{
                          fontWeight: isCurrent ? 700 : 600,
                          color: isCurrent ? 'common.white' : alpha('#ffffff', 0.95),
                          fontSize: { xs: 13, sm: 13.5 },
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
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mt: 0.3,
                          }}
                        >
                          {ep.overview}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>
      )}

      {/* ===================== TAB: CAST & CHARACTERS ===================== */}
      {(!isTv || tab === 'cast') && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* 2. Interactive OCR Character Scanner */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
              bgcolor: '#080b11',
              flexShrink: 0,
            }}
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Iconify icon="solar:scanner-bold" width={18} sx={{ color: 'primary.light' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    AI Character Scanner (OCR)
                  </Typography>
                </Stack>
                {detectedCharacters?.length > 0 && (
                  <Button
                    size="small"
                    onClick={clearScan}
                    sx={{
                      py: 0.25,
                      px: 1,
                      minWidth: 0,
                      fontSize: 11,
                      color: 'text.disabled',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Box>

              <Button
                fullWidth
                variant="contained"
                disabled={isScanning}
                onClick={scanCurrentCharacter}
                startIcon={
                  isScanning ? (
                    <CircularProgress size={16} sx={{ color: 'common.white' }} />
                  ) : (
                    <Iconify icon="solar:radar-2-bold" width={18} />
                  )
                }
                sx={{
                  py: 1,
                  borderRadius: 1.5,
                  fontSize: 13,
                  fontWeight: 700,
                  bgcolor: alpha(primaryColor, 0.9),
                  color: 'common.white',
                  boxShadow: `0 4px 16px ${alpha(primaryColor, 0.3)}`,
                  '&:hover': {
                    bgcolor: primaryColor,
                    boxShadow: `0 6px 20px ${alpha(primaryColor, 0.5)}`,
                  },
                }}
              >
                {isScanning
                  ? scanStatus === 'extracting'
                    ? 'Reading on-screen cues...'
                    : 'Recognizing characters...'
                  : 'Scan Current Character'}
              </Button>

              {/* Snapshot & Match Preview */}
              {scannedFrameUrl && (
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: alpha('#ffffff', 0.03),
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      component="img"
                      src={scannedFrameUrl}
                      alt="Scanned frame"
                      sx={{
                        width: 64,
                        height: 36,
                        borderRadius: 1,
                        objectFit: 'cover',
                        border: `1px solid ${alpha('#ffffff', 0.15)}`,
                      }}
                    />
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: 11 }}>
                        {(typeof scanMessage === 'object' && scanMessage !== null ? scanMessage.text : scanMessage) || 'Frame scanned'}
                      </Typography>
                      {detectedCharacters?.length > 0 ? (
                        <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 700 }}>
                          Identified {detectedCharacters.length} match{detectedCharacters.length > 1 ? 'es' : ''} in scene!
                        </Typography>
                      ) : !isScanning ? (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          No exact subtitle/name tag matched. Browse cast below.
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* Identified Character Matches */}
              {detectedCharacters?.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.light', letterSpacing: 0.3 }}>
                    IDENTIFIED IN SCENE:
                  </Typography>
                  {detectedCharacters.map((item, idx) => {
                    const actor = item?.actor || item;
                    const confidence = item?.score ? item.score / 100 : item?.confidence;
                    return (
                    <Stack
                      key={actor.id || `detected-${idx}`}
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: alpha(primaryColor, 0.14),
                        border: `1px solid ${alpha(primaryColor, 0.38)}`,
                        boxShadow: `0 0 12px ${alpha(primaryColor, 0.25)}`,
                      }}
                    >
                      <Avatar
                        src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : undefined}
                        alt={actor.name}
                        sx={{ width: 44, height: 44, borderRadius: 1.25, border: `1px solid ${alpha(primaryLight, 0.4)}` }}
                      >
                        {actor.name?.charAt(0)}
                      </Avatar>
                      <Stack spacing={0.2} sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: 'common.white' }}>
                            {actor.name}
                          </Typography>
                          {actor.confidence && (
                            <Box
                              sx={{
                                px: 0.6,
                                py: 0.1,
                                borderRadius: 0.5,
                                bgcolor: alpha(primaryColor, 0.3),
                                color: 'primary.light',
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              {Math.round(actor.confidence * 100)}% Match
                            </Box>
                          )}
                        </Stack>
                        {actor.character && (
                          <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                            as <strong style={{ color: '#fff' }}>{actor.character}</strong>
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  );
                })}
                </Stack>
              )}
            </Stack>
          </Box>

          {/* 3. Search Cast */}
          <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, borderBottom: `1px solid ${alpha('#ffffff', 0.06)}`, flexShrink: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.25,
                py: 0.5,
                borderRadius: 1.25,
                bgcolor: alpha('#ffffff', 0.05),
                border: `1px solid ${alpha('#ffffff', 0.1)}`,
              }}
            >
              <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled', mr: 1 }} />
              <InputBase
                fullWidth
                placeholder="Search cast & character..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  color: 'common.white',
                  fontSize: 13,
                  '& input::placeholder': { color: 'text.disabled', opacity: 1 },
                }}
              />
              {searchQuery && (
                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ color: 'text.disabled', p: 0.25 }}>
                  <Iconify icon="eva:close-fill" width={16} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* 4. Full Cast List */}
          <Stack
            spacing={1}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: { xs: 1.5, sm: 2 },
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { width: 5 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: alpha('#ffffff', 0.2),
                borderRadius: 2.5,
              },
            }}
          >
            {filteredCast.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <Iconify icon="solar:users-group-rounded-linear" width={40} sx={{ opacity: 0.4, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  No cast members found
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {searchQuery ? `No results matching "${searchQuery}"` : 'Cast details unavailable'}
                </Typography>
              </Box>
            ) : (
              filteredCast.map((actor, idx) => (
                <Stack
                  key={actor.id || `cast-${idx}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: alpha('#ffffff', 0.03),
                    border: `1px solid ${alpha('#ffffff', 0.06)}`,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'auto',
                    cursor: 'default',
                    '&:hover': {
                      bgcolor: alpha('#ffffff', 0.07),
                      borderColor: alpha('#ffffff', 0.16),
                      transform: 'translateX(3px)',
                    },
                  }}
                >
                  <Avatar
                    src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : undefined}
                    alt={actor.name}
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 1.25,
                      bgcolor: alpha('#ffffff', 0.1),
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {actor.name?.charAt(0)}
                  </Avatar>
                  <Stack spacing={0.25} sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: 'common.white', fontSize: 13.5 }}>
                      {actor.name}
                    </Typography>
                    {actor.character && (
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: 12 }}>
                        as <span style={{ color: alpha('#ffffff', 0.85) }}>{actor.character}</span>
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              ))
            )}
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
