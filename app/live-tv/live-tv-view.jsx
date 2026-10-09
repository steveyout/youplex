'use client';

import { Iconify } from '@/components/iconify';
import Player from '@/components/player/player';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import CardActionArea from '@mui/material/CardActionArea';

const categoryNames = { all: 'All channels' };
const EMPTY_ARRAY = Object.freeze([]);

export default function LiveTvView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [streamError, setStreamError] = useState('');
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [source, setSource] = useState(null);

  const refreshSelectedStream = useCallback(() => {
    setSelected((current) => (current ? { ...current } : current));
  }, []);

  const [modalChannelQuery, setModalChannelQuery] = useState('');

  const currentChannelIndex = useMemo(() => {
    if (!selected || channels.length === 0) return -1;
    return channels.findIndex((ch) => ch.id === selected.id);
  }, [selected, channels]);

  const handlePrevChannel = useCallback(() => {
    if (!channels || channels.length === 0) return;
    const idx = channels.findIndex((ch) => ch.id === selected?.id);
    if (idx <= 0) {
      setSelected(channels[channels.length - 1]);
    } else {
      setSelected(channels[idx - 1]);
    }
  }, [selected, channels]);

  const handleNextChannel = useCallback(() => {
    if (!channels || channels.length === 0) return;
    const idx = channels.findIndex((ch) => ch.id === selected?.id);
    if (idx < 0 || idx >= channels.length - 1) {
      setSelected(channels[0]);
    } else {
      setSelected(channels[idx + 1]);
    }
  }, [selected, channels]);

  const modalFilteredChannels = useMemo(() => {
    if (!modalChannelQuery.trim()) return channels;
    const q = modalChannelQuery.toLowerCase().trim();
    return channels.filter((ch) => ch.name.toLowerCase().includes(q) || (ch.country && ch.country.toLowerCase().includes(q)));
  }, [channels, modalChannelQuery]);

  const playerDirectSources = useMemo(() => (source ? [source] : EMPTY_ARRAY), [source]);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/livetv/channels').then((response) => {
        if (!response.ok) throw new Error('Channels request failed');
        return response.json();
      }),
      fetch('/api/livetv/schedule').then((response) => {
        if (!response.ok) throw new Error('Schedule request failed');
        return response.json();
      }),
    ])
      .then(([channelsResult, scheduleResult]) => {
        if (channelsResult.status === 'fulfilled' && channelsResult.value?.channels) {
          setChannels(channelsResult.value.channels || []);
          setCategories(channelsResult.value.categories || []);
        } else {
          setStreamError('Unable to load live TV channels right now.');
        }
        if (scheduleResult.status === 'fulfilled' && scheduleResult.value?.schedule) {
          const allEvents = (scheduleResult.value.schedule?.categories || []).flatMap((item) => item.events || []);
          const seenIds = new Set();
          const uniqueEvents = allEvents.filter((ev) => {
            const key = ev.id || `${ev.title}-${ev.time}`;
            if (seenIds.has(key)) return false;
            seenIds.add(key);
            return true;
          });
          setEvents(uniqueEvents);
        }
      })
      .catch(() => setStreamError('Unable to load live TV right now.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    setStreamError('');
    setSource(null);
    setStreamLoading(true);
    fetch(`/api/livetv/stream?channel=${encodeURIComponent(selected.id)}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.source?.url) throw new Error(data.error || 'Stream unavailable');
        if (!active) return;
        setSource(data.source);
      })
      .catch((error) => active && setStreamError(error.message))
      .finally(() => active && setStreamLoading(false));
    return () => {
      active = false;
    };
  }, [selected]);

  const filteredChannels = useMemo(() => channels.filter((channel) => (
    (category === 'all' || channel.category === category)
    && (!query || channel.name.toLowerCase().includes(query.toLowerCase()))
  )), [channels, category, query]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 }, pb: 12 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>Live TV</Typography>
        <Typography color="text.secondary">Live channels, sports and events from Flyx&apos;s DLHD catalog.</Typography>
      </Box>
      {events.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Live events</Typography>
          <Grid container spacing={2}>
            {events.filter((event) => event.isLive).slice(0, 8).map((event, eventIdx) => (
              <Grid item xs={12} sm={6} md={3} key={event.id ? `${event.id}-${eventIdx}` : `live-event-${eventIdx}`}>
                <Card
                  sx={{
                    height: '100%',
                    width: 1,
                    textAlign: 'left',
                    color: 'inherit',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    bgcolor: 'background.paper',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': event.channels[0]
                      ? { transform: 'translateY(-3px)', boxShadow: 8 }
                      : {},
                  }}
                >
                  <CardActionArea
                    onClick={() => event.channels[0] && setSelected({
                      id: event.channels[0].channelId,
                      name: event.title,
                    })}
                    disabled={!event.channels[0]}
                    sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                  >
                    <Chip size="small" color="error" label="LIVE" sx={{ mb: 1, fontWeight: 800, fontSize: 10 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                    {event.channels[0] && (
                      <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.light', fontSize: 12.5, fontWeight: 600 }}>
                        <Iconify icon="solar:play-bold" width={14} />
                        Watch Stream
                      </Box>
                    )}
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 1 }}>
        <Chip label={categoryNames.all} color={category === 'all' ? 'primary' : 'default'} onClick={() => setCategory('all')} />
        {categories.map((item) => <Chip key={item.id} label={`${item.icon} ${item.name} (${item.count})`} color={category === item.id ? 'primary' : 'default'} onClick={() => setCategory(item.id)} />)}
      </Box>
      <TextField fullWidth value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search live channels..." sx={{ mb: 3 }} InputProps={{ startAdornment: <InputAdornment position="start"><Iconify icon="solar:magnifer-bold" /></InputAdornment> }} />
      {loading ? (
        <ChannelSkeleton />
      ) : streamError && !selected ? (
        <LiveTvError message={streamError} onRetry={() => window.location.reload()} />
      ) : (
        <Grid container spacing={2}>
          {filteredChannels.map((channel) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={channel.id}>
              <Card
                sx={{
                  width: 1,
                  minHeight: 112,
                  textAlign: 'left',
                  color: 'inherit',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 },
                }}
              >
                <CardActionArea
                  onClick={() => setSelected(channel)}
                  sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800 }}>{channel.firstLetter || channel.name[0]}</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }} noWrap>{channel.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{channel.country || 'Live'}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Enhanced Live TV Player Modal */}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: '#080c14',
            backgroundImage: 'none',
            border: isMobile ? 'none' : `1px solid ${alpha('#ffffff', 0.12)}`,
            borderRadius: { xs: 0, sm: 2.5 },
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.95)',
            maxHeight: { xs: '100dvh', sm: 'calc(100vh - 48px)' },
            m: { xs: 0, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: 'rgba(4, 6, 10, 0.88)',
              backdropFilter: 'blur(16px)',
            },
          },
        }}
      >
        {selected && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Modal Header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                px: { xs: 1.5, sm: 2.5 },
                borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
                bgcolor: 'rgba(8, 12, 20, 0.98)',
                flexShrink: 0,
                zIndex: 10,
              }}
            >
              {/* Left Channel Information */}
              <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }} sx={{ minWidth: 0, flex: 1 }}>
                {isMobile && (
                  <IconButton
                    onClick={() => setSelected(null)}
                    size="small"
                    sx={{
                      color: 'common.white',
                      bgcolor: alpha('#ffffff', 0.06),
                      p: 0.75,
                      borderRadius: 1.5,
                      mr: 0.5,
                      '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                    }}
                  >
                    <Iconify icon="eva:arrow-ios-back-fill" width={20} />
                  </IconButton>
                )}

                <Box
                  sx={{
                    width: { xs: 32, sm: 38 },
                    height: { xs: 32, sm: 38 },
                    borderRadius: 1.5,
                    bgcolor: alpha('#FF3030', 0.15),
                    border: `1px solid ${alpha('#FF3030', 0.35)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: 'primary.light',
                    fontSize: { xs: 14, sm: 17 },
                    flexShrink: 0,
                  }}
                >
                  {selected.firstLetter || selected.name[0]}
                </Box>

                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      noWrap
                      sx={{
                        fontWeight: 700,
                        color: 'common.white',
                        fontSize: { xs: 13.5, sm: 16 },
                        maxWidth: { xs: 140, sm: 320, md: 500 },
                      }}
                    >
                      {selected.name}
                    </Typography>
                    <Chip
                      size="small"
                      color="error"
                      label="LIVE"
                      sx={{
                        height: { xs: 18, sm: 20 },
                        fontSize: { xs: 9, sm: 9.5 },
                        fontWeight: 800,
                        px: 0.4,
                        boxShadow: '0 0 10px rgba(255, 48, 48, 0.5)',
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: 'text.secondary', fontSize: { xs: 10.5, sm: 11.5 }, maxWidth: { xs: 160, sm: 320 } }}
                  >
                    {selected.country ? `${selected.country} \u2022 ` : ''}DLHD High-Speed Stream
                  </Typography>
                </Stack>
              </Stack>

              {/* Right Navigation & Switcher Controls */}
              <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
                {/* Channel Surfing buttons: Previous / Next Channel */}
                {channels.length > 1 && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton
                      onClick={handlePrevChannel}
                      size="small"
                      title="Previous Channel"
                      sx={{
                        color: 'common.white',
                        bgcolor: alpha('#ffffff', 0.06),
                        p: { xs: 0.6, sm: 0.75 },
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                      }}
                    >
                      <Iconify icon="solar:alt-arrow-left-bold" width={16} />
                    </IconButton>
                    <IconButton
                      onClick={handleNextChannel}
                      size="small"
                      title="Next Channel"
                      sx={{
                        color: 'common.white',
                        bgcolor: alpha('#ffffff', 0.06),
                        p: { xs: 0.6, sm: 0.75 },
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                      }}
                    >
                      <Iconify icon="solar:alt-arrow-right-bold" width={16} />
                    </IconButton>
                  </Stack>
                )}

                {/* Desktop Channel Dropdown Selector */}
                {!isMobile && channels.length > 0 && (
                  <Select
                    size="small"
                    value={selected.id}
                    onChange={(event) => {
                      const next = channels.find((channel) => channel.id === event.target.value);
                      if (next) setSelected(next);
                    }}
                    sx={{
                      minWidth: 180,
                      maxWidth: 240,
                      color: 'common.white',
                      height: 34,
                      fontSize: 12.5,
                      bgcolor: alpha('#ffffff', 0.05),
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#ffffff', 0.15) },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#ffffff', 0.3) },
                      '& .MuiSvgIcon-root': { color: 'common.white' },
                    }}
                  >
                    {channels.slice(0, 300).map((channel) => (
                      <MenuItem key={`player-channel-${channel.id}`} value={channel.id} sx={{ fontSize: 13 }}>
                        {channel.name} {channel.country ? `(${channel.country})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                )}

                {!isMobile && (
                  <IconButton
                    onClick={() => setSelected(null)}
                    sx={{
                      color: 'common.white',
                      bgcolor: alpha('#ffffff', 0.06),
                      p: 0.75,
                      borderRadius: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
                    }}
                  >
                    <Iconify icon="eva:close-fill" width={20} />
                  </IconButton>
                )}
              </Stack>
            </Stack>

            {/* Modal Player Canvas / Content */}
            <DialogContent
              sx={{
                p: 0,
                bgcolor: '#000',
                overflowX: 'hidden',
                overflowY: isMobile ? 'auto' : 'hidden',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: alpha('#ffffff', 0.15),
                  borderRadius: 3,
                },
              }}
            >
              {/* Cinema Theater 16:9 Video Canvas Frame */}
              <Box
                sx={{
                  width: 1,
                  position: 'relative',
                  bgcolor: '#000',
                  flexShrink: 0,
                  aspectRatio: '16/9',
                  maxHeight: { sm: 'calc(100vh - 130px)' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {streamLoading ? (
                  <LiveTvLoading channel={selected} />
                ) : streamError ? (
                  <LiveTvError message={streamError} onRetry={refreshSelectedStream} />
                ) : source ? (
                  <Player
                    id={selected.id}
                    tmdbId={selected.id}
                    title={selected.name}
                    src={source.url}
                    directSources={playerDirectSources}
                    subtitles={EMPTY_ARRAY}
                    servers={EMPTY_ARRAY}
                    extractorProviders={EMPTY_ARRAY}
                    sourcesLoading={false}
                    activeExtractorId="dlhd"
                    allowEmbedMode={false}
                    onRetrySources={refreshSelectedStream}
                    aspectRatio="16/9"
                    height="auto"
                    minHeight={0}
                    containerSx={{
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: 0,
                      border: 'none',
                      boxShadow: 'none',
                      maxHeight: { sm: 'calc(100vh - 130px)' },
                    }}
                  />
                ) : null}
              </Box>

              {/* Mobile Quick Channel Navigator & Guide (Below the 16:9 player) */}
              {isMobile && (
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    pb: 4,
                    bgcolor: '#070b12',
                    borderTop: `1px solid ${alpha('#ffffff', 0.08)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {/* Channel Quick Info & Stream Health */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha('#ffffff', 0.03),
                      border: `1px solid ${alpha('#ffffff', 0.06)}`,
                    }}
                  >
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'common.white' }}>
                        {selected.name}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            boxShadow: '0 0 6px #22C55E',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                          Live Feed Active \u2022 {selected.country || 'Global'}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={refreshSelectedStream}
                      startIcon={<Iconify icon="solar:refresh-bold" width={14} />}
                      sx={{
                        color: 'common.white',
                        borderColor: alpha('#ffffff', 0.15),
                        fontSize: 11.5,
                        px: 1.25,
                        py: 0.5,
                      }}
                    >
                      Reload Feed
                    </Button>
                  </Stack>

                  {/* Channel Switcher Header */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'common.white', fontSize: 13 }}>
                      Quick Channel Switcher ({channels.length})
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Tap to switch
                    </Typography>
                  </Stack>

                  {/* Search Channels Input */}
                  <TextField
                    size="small"
                    fullWidth
                    value={modalChannelQuery}
                    onChange={(e) => setModalChannelQuery(e.target.value)}
                    placeholder="Search channels to flip..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:magnifer-bold" width={16} sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: alpha('#ffffff', 0.04),
                        borderRadius: 1.75,
                        fontSize: 12.5,
                        color: 'common.white',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha('#ffffff', 0.1),
                      },
                    }}
                  />

                  {/* Scrollable Channel Rail / Cards */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 1.25,
                      maxHeight: 280,
                      overflowY: 'auto',
                      pr: 0.5,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: alpha('#ffffff', 0.1), borderRadius: 2 },
                    }}
                  >
                    {modalFilteredChannels.slice(0, 100).map((ch) => {
                      const isCurrent = ch.id === selected.id;
                      return (
                        <Box
                          key={`modal-nav-ch-${ch.id}`}
                          onClick={() => setSelected(ch)}
                          sx={{
                            p: 1.25,
                            borderRadius: 1.75,
                            bgcolor: isCurrent ? alpha('#FF3030', 0.12) : alpha('#ffffff', 0.04),
                            border: `1px solid ${isCurrent ? alpha('#FF3030', 0.5) : alpha('#ffffff', 0.07)}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            transition: 'all 0.15s ease',
                            '&:active': {
                              transform: 'scale(0.97)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: 1,
                              bgcolor: isCurrent ? 'primary.main' : alpha('#ffffff', 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'common.white',
                              fontWeight: 800,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {ch.firstLetter || ch.name[0]}
                          </Box>
                          <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: isCurrent ? 'primary.light' : 'common.white',
                                fontWeight: isCurrent ? 700 : 600,
                                fontSize: 11.5,
                              }}
                            >
                              {ch.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }} noWrap>
                              {ch.country || 'Live'}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </DialogContent>
          </Box>
        )}
      </Dialog>
    </Container>
  );
}

function LiveTvLoading({ channel }) {
  return (
    <Box
      sx={{
        width: 1,
        height: 1,
        aspectRatio: '16/9',
        bgcolor: '#05070a',
        borderRadius: 0,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${alpha('#ffffff', 0.08)}`,
        background: 'radial-gradient(circle at 50% 45%, rgba(255, 48, 48, 0.14) 0%, rgba(5, 7, 10, 0.98) 72%)',
      }}
    >
      {/* Animated Pulse Radar Ring */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: '2px solid rgba(255, 48, 48, 0.4)',
            animation: 'livetv-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            '@keyframes livetv-ping': {
              '0%': { transform: 'scale(0.8)', opacity: 0.9 },
              '100%': { transform: 'scale(1.6)', opacity: 0 },
            },
          }}
        />
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'rgba(255, 48, 48, 0.16)',
            border: '2px solid rgba(255, 48, 48, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.light',
            boxShadow: '0 0 30px rgba(255, 48, 48, 0.45)',
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.light' }}>
            {channel?.firstLetter || channel?.name?.[0] || 'TV'}
          </Typography>
        </Box>
      </Box>

      {/* Connection Text & Status */}
      <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center', px: 2, zIndex: 1 }}>
        <Chip
          size="small"
          icon={<Iconify icon="solar:record-bold" width={12} sx={{ color: 'error.main', animation: 'livetv-blink 1.2s infinite' }} />}
          label="CONNECTING LIVE FEED"
          sx={{
            bgcolor: 'rgba(255, 48, 48, 0.12)',
            border: '1px solid rgba(255, 48, 48, 0.35)',
            color: 'primary.light',
            fontWeight: 800,
            fontSize: 10.5,
            letterSpacing: 0.75,
            '@keyframes livetv-blink': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
          }}
        />
        <Typography variant="h6" sx={{ color: 'common.white', fontWeight: 700 }}>
          {channel?.name || 'Tuning channel...'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, fontSize: 13 }}>
          Securing encrypted high-speed HLS broadcast...
        </Typography>

        {/* Shimmering Progress Bar */}
        <Box sx={{ width: 190, mt: 1.5 }}>
          <LinearProgress
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
                background: 'linear-gradient(90deg, #FF3030 0%, #FF6060 100%)',
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
}

function ChannelSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 24 }).map((_, index) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
          <Skeleton variant="rounded" animation="wave" sx={{ height: 112, borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
  );
}

function LiveTvError({ message, onRetry }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        width: 1,
        height: 1,
        aspectRatio: '16/9',
        py: { xs: 3, sm: 6 },
        px: 2,
        textAlign: 'center',
        bgcolor: '#05070a',
      }}
    >
      <Iconify icon="solar:shield-warning-bold" width={52} sx={{ color: 'text.disabled' }} />
      <Typography variant="h6" sx={{ color: 'common.white' }}>Live TV is unavailable</Typography>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
      <Button variant="contained" startIcon={<Iconify icon="solar:refresh-bold" />} onClick={onRetry}>
        Try again
      </Button>
    </Stack>
  );
}
