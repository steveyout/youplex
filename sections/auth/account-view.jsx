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
    backendUrl,
    syncStatus,
    logout,
    disconnect,
    syncNow,
    updateBackendUrl,
    updateProfile,
  } = useSyncAuth();

  const [customUrl, setCustomUrl] = useState(backendUrl);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickVal, setNickVal] = useState(account?.nickname || '');

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace(paths.auth.signIn);
    } else {
      setCustomUrl(backendUrl);
      setNickVal(account?.nickname || '');
    }
  }, [isLoggedIn, router, backendUrl, account]);

  const handleSyncClick = async () => {
    setSyncingManual(true);
    try {
      await syncNow();
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
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                  {account?.nickname || 'Movie Fan'}
                </Typography>
                <IconButton size="small" onClick={() => setEditingNick(true)}>
                  <Iconify icon="solar:pen-bold" width={16} />
                </IconButton>
              </Stack>
            )}

            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              Device: {account?.deviceName || 'Web Client'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }} noWrap>
              User ID: {account?.userId}
            </Typography>
          </Box>

          <Chip
            variant="soft"
            color={syncStatus === 'synced' ? 'success' : syncStatus === 'syncing' ? 'warning' : 'default'}
            icon={
              syncStatus === 'syncing' ? (
                <CircularProgress size={12} color="inherit" />
              ) : (
                <Iconify icon="solar:check-circle-bold" width={16} />
              )
            }
            label={syncStatus === 'syncing' ? 'Syncing...' : 'Connected'}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Box>

      {/* Sync Status & Backend Info */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:cloud-upload-bold" width={22} sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Cloud Backend
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={backendUrl === DEFAULT_BACKEND_URL ? 'Default Server (pstream.site)' : 'Custom Server'}
            color="primary"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
        </Stack>

        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2, wordBreak: 'break-all' }}>
          {backendUrl}
        </Typography>

        <LoadingButton
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          loading={syncingManual}
          loadingIndicator="Syncing with cloud..."
          startIcon={<Iconify icon="solar:refresh-bold" />}
          onClick={handleSyncClick}
          sx={{ fontWeight: 700 }}
        >
          Force Sync Now
        </LoadingButton>
      </Box>

      {/* Passphrase Section */}
      {account?.mnemonic && (
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: 'background.neutral',
            border: (t) => `1px dashed ${t.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:key-bold" color="warning.main" width={20} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Secret Recovery Passphrase
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowPassphrase(!showPassphrase)}
              startIcon={<Iconify icon={showPassphrase ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />}
            >
              {showPassphrase ? 'Hide' : 'Reveal'}
            </Button>
          </Stack>

          {showPassphrase && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: (t) => `1px solid ${t.palette.divider}`,
                  wordBreak: 'break-word',
                }}
              >
                {account.mnemonic}
              </Box>
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1.5 }}
                startIcon={<Iconify icon="solar:copy-bold" />}
                onClick={() => handleCopyPassphrase(account.mnemonic)}
              >
                Copy Passphrase
              </Button>
            </Box>
          )}
        </Box>
      )}

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
