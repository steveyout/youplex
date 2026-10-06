'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Iconify } from '@/components/iconify';
import Player from '@/components/player/player';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import { alpha } from '@mui/material/styles';

const categoryNames = { all: 'All channels' };
const EMPTY_ARRAY = Object.freeze([]);

export default function LiveTvView() {
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
          setEvents((scheduleResult.value.schedule?.categories || []).flatMap((item) => item.events || []));
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
            {events.filter((event) => event.isLive).slice(0, 8).map((event) => (
              <Grid item xs={12} sm={6} md={3} key={event.id}>
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
      {loading ? <ChannelSkeleton /> : streamError && !selected ? (
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
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            bgcolor: '#080c14',
            backgroundImage: 'none',
            border: `1px solid ${alpha('#ffffff', 0.12)}`,
            borderRadius: { xs: 2, sm: 3 },
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.95)',
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: 'rgba(4, 6, 10, 0.82)',
              backdropFilter: 'blur(16px)',
            },
          },
        }}
      >
        {selected && (
          <Box>
            {/* Modal Header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: { xs: 1.5, sm: 2 },
                px: { xs: 2, sm: 2.5 },
                borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
                bgcolor: 'rgba(8, 12, 20, 0.95)',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: { xs: 34, sm: 38 },
                    height: { xs: 34, sm: 38 },
                    borderRadius: 1.5,
                    bgcolor: alpha('#FF3030', 0.15),
                    border: `1px solid ${alpha('#FF3030', 0.35)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: 'primary.light',
                    fontSize: { xs: 15, sm: 17 },
                    flexShrink: 0,
                  }}
                >
                  {selected.firstLetter || selected.name[0]}
                </Box>
                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="subtitle1"
                      noWrap
                      sx={{
                        fontWeight: 700,
                        color: 'common.white',
                        fontSize: { xs: 14, sm: 16 },
                        maxWidth: { xs: 150, sm: 300, md: 500 },
                      }}
                    >
                      {selected.name}
                    </Typography>
                    <Chip
                      size="small"
                      color="error"
                      label="LIVE"
                      sx={{
                        height: 20,
                        fontSize: 9.5,
                        fontWeight: 800,
                        px: 0.4,
                        boxShadow: '0 0 10px rgba(255, 48, 48, 0.5)',
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11.5 }}>
                    {selected.country ? `${selected.country} • ` : ''}DLHD High-Speed Stream
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                {channels.length > 0 && (
                  <Select
                    size="small"
                    value={selected.id}
                    onChange={(event) => {
                      const next = channels.find((channel) => channel.id === event.target.value);
                      if (next) setSelected(next);
                    }}
                    sx={{
                      minWidth: { xs: 110, sm: 200 },
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
              </Stack>
            </Stack>

            {/* Modal Player Canvas / Loading Frame */}
            <DialogContent sx={{ p: { xs: 1, sm: 1.75 }, bgcolor: '#04060a' }}>
              {streamLoading ? (
                <LiveTvLoading channel={selected} />
              ) : streamError ? (
                <Box
                  sx={{
                    width: 1,
                    aspectRatio: { xs: '16/10', sm: '16/9' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#05070a',
                    borderRadius: { xs: 1.5, sm: 2.5 },
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  }}
                >
                  <LiveTvError message={streamError} onRetry={refreshSelectedStream} />
                </Box>
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
                />
              ) : null}
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
        aspectRatio: { xs: '16/10', sm: '16/9' },
        bgcolor: '#05070a',
        borderRadius: { xs: 1.5, sm: 2.5 },
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
    <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
      <Iconify icon="solar:shield-warning-bold" width={52} sx={{ color: 'text.disabled' }} />
      <Typography variant="h6" sx={{ color: 'common.white' }}>Live TV is unavailable</Typography>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
      <Button variant="contained" startIcon={<Iconify icon="solar:refresh-bold" />} onClick={onRetry}>
        Try again
      </Button>
    </Stack>
  );
}
