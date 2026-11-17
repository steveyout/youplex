'use client';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { useSyncAuth } from '@/hooks/use-sync-auth';
import { DEFAULT_BACKEND_URL } from '@/lib/sync/config';

// ----------------------------------------------------------------------

export function AccountView() {
  const router = useRouter();
  const {
    account,
    isLoggedIn,
    syncProgress,
    syncBookmarks,
    syncSettings,
    updateProfile,
    deleteAccount,
    logout,
    disconnect,
    backendUrl,
    updateBackendUrl,
  } = useSyncAuth();

  const [editingNick, setEditingNick] = useState(false);
  const [nickVal, setNickVal] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [syncingManual, setSyncingManual] = useState(false);

  useEffect(() => {
    if (account?.profile?.nickname) {
      setNickVal(account.profile.nickname);
    }
  }, [account]);

  useEffect(() => {
    setCustomUrl(backendUrl || DEFAULT_BACKEND_URL);
  }, [backendUrl]);

  const handleManualSync = async () => {
    setSyncingManual(true);
    try {
      await Promise.all([syncProgress(), syncBookmarks(), syncSettings()]);
      toast.success('Sync complete! All devices updated.');
    } catch (e) {
      toast.error('Sync failed: ' + (e?.message || 'Network error'));
    } finally {
      setSyncingManual(false);
    }
  };

  const handleSaveNick = async () => {
    if (!nickVal.trim()) return;
    await updateProfile({ nickname: nickVal.trim() });
    setEditingNick(false);
  };

  const handleCopyPassphrase = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Passphrase copied to clipboard!');
  };

  if (!isLoggedIn) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Sync & Account Management
      </Typography>

      {/* Profile Card */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: 'background.neutral',
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Avatar
            sx={{
              width: 64,
              height: 64,
              background: `linear-gradient(135deg, ${account?.profile?.colorA || '#00A76F'}, ${account?.profile?.colorB || '#00B8D9'})`,
              boxShadow: (t) => `0 6px 16px ${account?.profile?.colorA || '#00A76F'}40`,
            }}
          >
            <Iconify icon={account?.profile?.icon || 'solar:user-bold'} width={34} sx={{ color: '#fff' }} />
          </Avatar>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {editingNick ? (
              <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                <TextField
                  size="small"
                  value={nickVal}
                  onChange={(e) => setNickVal(e.target.value)}
                  placeholder="Nickname"
                />
                <Button size="small" variant="contained" onClick={handleSaveNick}>
                  Save
                </Button>
                <Button size="small" variant="outlined" onClick={() => setEditingNick(false)}>
                  Cancel
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                  {account?.profile?.nickname || 'Anonymous Streamer'}
                </Typography>
                <IconButton size="small" onClick={() => setEditingNick(true)}>
                  <Iconify icon="solar:pen-bold" width={16} />
                </IconButton>
              </Stack>
            )}

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Device: {account?.deviceName || 'Web Client'}
            </Typography>
          </Box>

          <LoadingButton
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="solar:refresh-bold" />}
            loading={syncingManual}
            onClick={handleManualSync}
          >
            Sync Now
          </LoadingButton>
        </Stack>
      </Box>

      {/* Passphrase Card */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: 'background.neutral',
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Device Link Passphrase (12 words)
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowSeed((prev) => !prev)}
              startIcon={<Iconify icon={showSeed ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />}
            >
              {showSeed ? 'Hide' : 'Reveal'}
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Enter these 12 secret words on your TV or another browser to link and automatically sync your watch history & bookmarks.
          </Typography>

          {showSeed && account?.seed ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: (t) => `1px dashed ${t.palette.divider}`,
                position: 'relative',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  letterSpacing: 0.5,
                  userSelect: 'all',
                  wordBreak: 'break-all',
                }}
              >
                {account.seed}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:copy-bold" />}
                onClick={() => handleCopyPassphrase(account.seed)}
                sx={{ mt: 1.5 }}
              >
                Copy Passphrase
              </Button>
            </Box>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: (t) => `1px dashed ${t.palette.divider}`,
                filter: 'blur(4px)',
                userSelect: 'none',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                apple banana cherry diamond elephant flamingo galaxy horizon island jungle kangaroo lagoon
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Connected Devices */}
      {Array.isArray(account?.devices) && account.devices.length > 0 && (
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'background.neutral',
            border: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Connected Devices ({account.devices.length})
          </Typography>
          <Stack spacing={1}>
            {account.devices.map((dev) => (
              <Stack
                key={dev.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  border: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Iconify
                    icon={
                      dev.os === 'Android'
                        ? 'solar:smartphone-bold'
                        : dev.os === 'iOS'
                        ? 'solar:smartphone-2-bold'
                        : 'solar:laptop-bold'
                    }
                    width={22}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {dev.name || 'Unnamed Device'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {dev.browser} on {dev.os}
                    </Typography>
                  </Box>
                </Stack>
                {dev.id === account.deviceId && (
                  <Chip size="small" color="success" label="This Device" />
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Android App Download Banner */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
          border: (t) => `1px dashed ${alpha(t.palette.primary.main, 0.3)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.16),
              color: 'primary.main',
            }}
          >
            <Iconify icon="ant-design:android-filled" width={26} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Youplex for Android & Android TV
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Download our official native APK release to stream on phones, tablets, and Smart TVs.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          color="primary"
          component="a"
          href={paths.app}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<Iconify icon="solar:download-square-bold" />}
        >
          Download APK
        </Button>
      </Box>

      {/* Backend URL Configuration */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
          Custom Backend Server URL (Optional)
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://backend.pstream.site"
            sx={{ fontFamily: 'monospace' }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              updateBackendUrl(customUrl);
            }}
          >
            Update
          </Button>
        </Stack>
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          fullWidth
          size="large"
          onClick={() => {
            disconnect();
            router.push(paths.auth.signIn);
          }}
        >
          Disconnect Sync
        </Button>
        <Button
          variant="soft"
          color="error"
          fullWidth
          size="large"
          onClick={() => {
            logout();
            router.push(paths.auth.signIn);
          }}
        >
          Log Out
        </Button>
      </Stack>
    </Stack>
  );
}
