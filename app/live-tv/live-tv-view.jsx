'use client';

import { useEffect, useMemo, useState } from 'react';
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
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const categoryNames = { all: 'All channels' };

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

  useEffect(() => {
    Promise.all([
      fetch('/api/livetv/channels').then((response) => response.json()),
      fetch('/api/livetv/schedule').then((response) => response.json()),
    ]).then(([channelData, scheduleData]) => {
      setChannels(channelData.channels || []);
      setCategories(channelData.categories || []);
      setEvents((scheduleData.schedule?.categories || []).flatMap((item) => item.events || []));
    }).catch(() => setStreamError('Unable to load live TV right now.')).finally(() => setLoading(false));
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
                  component="button"
                  onClick={() => event.channels[0] && setSelected({
                    id: event.channels[0].channelId,
                    name: event.title,
                  })}
                  disabled={!event.channels[0]}
                  sx={{
                    p: 2,
                    height: '100%',
                    width: 1,
                    textAlign: 'left',
                    color: 'inherit',
                    border: 0,
                    cursor: event.channels[0] ? 'pointer' : 'default',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': event.channels[0]
                      ? { transform: 'translateY(-3px)', boxShadow: 8 }
                      : {},
                  }}
                >
                  <Chip size="small" color="error" label="LIVE" sx={{ mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                  {event.channels[0] && <Button size="small" sx={{ mt: 1, pointerEvents: 'none' }}>Watch</Button>}
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
              <Card component="button" onClick={() => setSelected(channel)} sx={{ width: 1, minHeight: 112, p: 2, textAlign: 'left', cursor: 'pointer', color: 'inherit', border: 0, '&:hover': { transform: 'translateY(-3px)', boxShadow: 8 } }}>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800 }}>{channel.firstLetter || channel.name[0]}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>{channel.name}</Typography>
                <Typography variant="caption" color="text.secondary">{channel.country}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="xl"
        PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}
      >
        <DialogContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        {selected && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
              <Typography variant="h5" noWrap sx={{ fontWeight: 700 }}>{selected.name}</Typography>
              <Chip size="small" color="error" label="LIVE" />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Select
                size="small"
                value={selected.id}
                onChange={(event) => {
                  const next = channels.find((channel) => channel.id === event.target.value);
                  if (next) setSelected(next);
                }}
                sx={{ minWidth: { xs: 130, sm: 220 } }}
              >
                {channels.map((channel) => (
                  <MenuItem key={`player-channel-${channel.id}`} value={channel.id}>
                    {channel.name}
                  </MenuItem>
                ))}
              </Select>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </Stack>
          </Stack>
          {streamLoading ? (
            <Skeleton variant="rounded" animation="wave" sx={{ width: 1, aspectRatio: '16/9', bgcolor: 'grey.900' }} />
          ) : streamError ? (
            <LiveTvError message={streamError} onRetry={() => setSelected({ ...selected })} />
          ) : source ? (
            <Player
              title={selected.name}
              src={source.url}
              directSources={[source]}
              subtitles={[]}
              servers={[]}
              extractorProviders={[]}
              sourcesLoading={false}
              activeExtractorId="dlhd"
              allowEmbedMode={false}
            />
          ) : null}
        </Box>
        )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}

function ChannelSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 24 }).map((_, index) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
          <Skeleton variant="rounded" animation="wave" sx={{ height: 112 }} />
        </Grid>
      ))}
    </Grid>
  );
}

function LiveTvError({ message, onRetry }) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
      <Iconify icon="solar:shield-warning-bold" width={52} sx={{ color: 'text.disabled' }} />
      <Typography variant="h6">Live TV is unavailable</Typography>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
      <Button variant="contained" startIcon={<Iconify icon="solar:refresh-bold" />} onClick={onRetry}>
        Try again
      </Button>
    </Stack>
  );
}
