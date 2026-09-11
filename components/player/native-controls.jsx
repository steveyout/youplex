'use client';

import { Iconify } from '@/components/iconify';
import { useState, useCallback } from 'react';
import {
  formatTime,
  useMediaStore,
  useMediaRemote,
  useCaptionOptions,
  useVideoQualityOptions,
  usePlaybackRateOptions,
} from '@vidstack/react';

import { usePlayerControls } from '@/hooks/use-player-controls';

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
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? formatTime(seconds) : '0:00';
}

const controlButtonSx = {
  color: 'common.white',
  flexShrink: 0,
  p: { xs: 0.75, sm: 1 },
  '&:hover': { bgcolor: alpha('#ffffff', 0.16) },
};

/**
 * Netflix-style MUI control layer for native playback.
 *
 * Rendered inside <MediaPlayer>, consumes Vidstack's media store to render a
 * fully custom, theme-matched overlay: seek slider with buffered progress,
 * play/pause, seek-10s, volume, captions menu, quality + speed settings menu,
 * picture-in-picture and fullscreen. Controls auto-hide while playing.
 */
export default function NativeControls() {
  const remote = useMediaRemote();
  const store = useMediaStore();

  const captions = useCaptionOptions({ off: 'Off' });
  const qualities = useVideoQualityOptions({ auto: 'Auto' });
  const rates = usePlaybackRateOptions();

  const { visible: uiVisible, show: showUI } = usePlayerControls(store.paused);

  const [dragVal, setDragVal] = useState(null);
  const [capAnchor, setCapAnchor] = useState(null);
  const [setAnchor, setSetAnchor] = useState(null);

  const { currentTime, duration, bufferedEnd } = store;
  const active = dragVal ?? currentTime;
  const maxSeek = typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
  const canSeek = maxSeek > 0;
  const bufferPct = canSeek ? Math.min(100, (bufferedEnd / maxSeek) * 100) : 0;
  const playedPct = canSeek ? Math.min(100, (active / maxSeek) * 100) : 0;

  const muted = store.muted || store.volume === 0;
  const volIcon = muted
    ? 'solar:volume-cross-bold'
    : store.volume < 0.5
    ? 'solar:volume-small-bold'
    : 'solar:volume-bold';

  const seekCommit = (_, value) => {
    setDragVal(null);
    remote.seek(value);
  };

  return (
    <Box
      onPointerMove={showUI}
      onPointerDown={showUI}
      sx={{ position: 'absolute', inset: 0, zIndex: 2 }}
    >
      {/* Click anywhere on the video to toggle play/pause */}
      <Box sx={{ position: 'absolute', inset: 0, cursor: 'pointer' }} onClick={() => remote.togglePaused()} />

      {/* Top gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 88,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Center: buffering spinner / big play button */}
      {store.waiting ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <CircularProgress size={72} thickness={3} sx={{ color: 'primary.main' }} />
        </Stack>
      ) : (
        store.paused && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: uiVisible ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            <IconButton
              onClick={() => remote.togglePaused()}
              sx={{
                pointerEvents: 'auto',
                color: 'common.white',
                bgcolor: alpha('#000000', 0.45),
                border: `solid 1px ${alpha('#ffffff', 0.2)}`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                p: 2.5,
                '&:hover': { bgcolor: alpha('#000000', 0.65), transform: 'scale(1.05)' },
              }}
            >
              <Iconify icon="solar:play-bold" width={52} />
            </IconButton>
          </Stack>
        )
      )}

      {/* Bottom control bar */}
      <Stack
        spacing={0.5}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          px: { xs: 1.5, sm: 2.5 },
          pb: { xs: 1, sm: 1.5 },
          pt: 4,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Seek bar: single layered bar (buffered below, played above). A fully
            invisible Slider overlays it purely for drag/tap; the visible thumb
            is drawn by us from the same `active` value as the played bar, so
            the thumb can never drift out of sync with the progress. */}
        <Box sx={{ position: 'relative', width: 1, height: 22, px: 1 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              height: 4,
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: alpha('#ffffff', 0.16),
            }}
          >
            <Box sx={{ width: `${bufferPct}%`, height: 1, bgcolor: alpha('#ffffff', 0.4) }} />
          </Box>

          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: `${playedPct}%`,
              height: 4,
              borderRadius: 1,
              bgcolor: 'primary.main',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              left: `${playedPct}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: 16, sm: 14 },
              height: { xs: 16, sm: 14 },
              borderRadius: '50%',
              bgcolor: 'common.white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

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
              top: '50%',
              transform: 'translateY(-50%)',
              width: 1,
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </Box>

        {/* Controls row */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Tooltip title={store.playing ? 'Pause' : 'Play'} placement="top" arrow>
            <IconButton onClick={() => remote.togglePaused()} sx={controlButtonSx}>
              <Iconify icon={store.playing ? 'solar:pause-bold' : 'solar:play-bold'} width={26} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Rewind 10s" placement="top" arrow>
            <IconButton
              onClick={() => remote.seek(Math.max(0, currentTime - 10))}
              sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Iconify icon="ic:round-replay-10" width={26} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Forward 10s" placement="top" arrow>
            <IconButton
              onClick={() => remote.seek(currentTime + 10)}
              sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Iconify icon="ic:round-forward-10" width={26} />
            </IconButton>
          </Tooltip>

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ ml: 0.5 }}>
            <Tooltip title={muted ? 'Unmute' : 'Mute'} placement="top" arrow>
              <IconButton onClick={() => remote.toggleMuted()} sx={controlButtonSx}>
                <Iconify icon={volIcon} width={24} />
              </IconButton>
            </Tooltip>
            <Box sx={{ width: 90, display: { xs: 'none', sm: 'block' } }}>
              <Slider
                size="small"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : store.volume}
                onChange={(_, value) => remote.changeVolume(value)}
                sx={{
                  color: 'primary.main',
                  py: 1,
                  '& .MuiSlider-thumb': { width: 12, height: 12, boxShadow: 'none' },
                }}
              />
            </Box>
          </Stack>

          <Typography
            variant="caption"
            sx={{ color: 'common.white', fontVariantNumeric: 'tabular-nums', ml: 0.5, whiteSpace: 'nowrap' }}
          >
            {durationText(active)} <Box component="span" sx={{ color: alpha('#ffffff', 0.55) }}>/</Box>{' '}
            {durationText(duration)}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Captions" placement="top" arrow>
            <IconButton onClick={(e) => setCapAnchor(e.currentTarget)} sx={controlButtonSx}>
              <Iconify icon="ph:subtitles-bold" width={24} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings" placement="top" arrow>
            <IconButton onClick={(e) => setSetAnchor(e.currentTarget)} sx={controlButtonSx}>
              <Iconify icon="solar:tuning-2-bold" width={24} />
            </IconButton>
          </Tooltip>

          {store.canPictureInPicture && (
            <Tooltip title="Picture in Picture" placement="top" arrow>
              <IconButton
                onClick={() => remote.togglePictureInPicture()}
                sx={{ ...controlButtonSx, display: { xs: 'none', sm: 'inline-flex' } }}
              >
                <Iconify icon="ic:round-picture-in-picture" width={24} />
              </IconButton>
            </Tooltip>
          )}

          {store.canFullscreen && (
            <Tooltip title={store.fullscreen ? 'Exit Fullscreen' : 'Fullscreen'} placement="top" arrow>
              <IconButton onClick={() => remote.requestFullscreen()} sx={controlButtonSx}>
                <Iconify icon={store.fullscreen ? 'ic:round-fullscreen-exit' : 'ic:round-fullscreen'} width={24} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Captions menu */}
      <Menu
        anchorEl={capAnchor}
        open={Boolean(capAnchor)}
        onClose={() => setCapAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, p: 1 } } }}
      >
        <Typography variant="caption" sx={{ px: 1, py: 0.5, display: 'block', color: 'text.disabled' }}>
          Captions
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        {captions.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.selected}
            onClick={() => {
              option.select();
              setCapAnchor(null);
            }}
            sx={{ borderRadius: 1, justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="subtitle2">{option.label}</Typography>
            {option.selected && (
              <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Settings menu */}
      <Menu
        anchorEl={setAnchor}
        open={Boolean(setAnchor)}
        onClose={() => setSetAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280, p: 1 } } }}
      >
        <Typography variant="caption" sx={{ px: 1, py: 0.5, display: 'block', color: 'text.disabled' }}>
          Quality
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        {qualities.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.selected}
            onClick={() => option.select()}
            sx={{ borderRadius: 1, py: 0.75, justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="subtitle2">{option.label}</Typography>
            {option.selected && (
              <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
            )}
          </MenuItem>
        ))}

        <Typography
          variant="caption"
          sx={{ px: 1, py: 0.5, display: 'block', color: 'text.disabled', mt: 0.75 }}
        >
          Playback Speed
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        {rates.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.selected}
            onClick={() => option.select()}
            sx={{ borderRadius: 1, py: 0.75, justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="subtitle2">{option.label}</Typography>
            {option.selected && (
              <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
