'use client';

import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/components/iconify';
import { useSyncAuth } from '@/hooks/use-sync-auth';
import { DEFAULT_BACKEND_URL } from '@/lib/sync/config';
import { genMnemonic, isPasskeySupported, authenticatePasskey, verifyValidMnemonic } from '@/lib/sync/crypto';

// ----------------------------------------------------------------------

const AVATAR_PALETTES = [
  { name: 'Emerald', colorA: '#00A76F', colorB: '#00B8D9', icon: 'solar:user-bold' },
  { name: 'Purple Dream', colorA: '#7635dc', colorB: '#8e33ff', icon: 'solar:crown-star-bold' },
  { name: 'Sunset', colorA: '#ffab00', colorB: '#ff5630', icon: 'solar:fire-bold' },
  { name: 'Ocean', colorA: '#006C9C', colorB: '#00A76F', icon: 'solar:planet-bold' },
  { name: 'Midnight', colorA: '#1C252E', colorB: '#919EAB', icon: 'solar:shield-check-bold' },
];

function getBrowserDeviceName() {
  if (typeof window === 'undefined') return 'Web Client';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'PC';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

// ----------------------------------------------------------------------

export function AccountDialog({ open, onClose }) {
  const {
    account,
    isLoggedIn,
    backendUrl,
    syncStatus,
    login,
    register,
    logout,
    disconnect,
    syncNow,
    updateBackendUrl,
  } = useSyncAuth();

  const [tabIndex, setTabIndex] = useState(0);

  // Login form state
  const [loginPassphrase, setLoginPassphrase] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginDevice, setLoginDevice] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regNickname, setRegNickname] = useState('');
  const [regDevice, setRegDevice] = useState('');
  const [regMnemonic, setRegMnemonic] = useState('');
  const [selectedPalette, setSelectedPalette] = useState(AVATAR_PALETTES[0]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [passphraseConfirmed, setPassphraseConfirmed] = useState(false);

  // Settings in dialog
  const [customUrl, setCustomUrl] = useState(backendUrl);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);

  // Initialize defaults on dialog open
  useEffect(() => {
    if (open) {
      const devName = getBrowserDeviceName();
      setLoginDevice((prev) => prev || devName);
      setRegDevice((prev) => prev || devName);
      if (!regMnemonic) {
        setRegMnemonic(genMnemonic());
      }
      setCustomUrl(backendUrl);
      setLoginError('');
      setRegError('');
    }
  }, [open, backendUrl, regMnemonic]);

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setLoginError('');

    if (!verifyValidMnemonic(loginPassphrase)) {
      setLoginError('Invalid passphrase format. Please enter your valid 12-word passphrase.');
      return;
    }

    setLoginLoading(true);
    try {
      await login({
        mnemonic: loginPassphrase.trim(),
        deviceName: loginDevice.trim() || getBrowserDeviceName(),
      });
      setLoginPassphrase('');
      onClose();
    } catch (err) {
      setLoginError(err?.message || 'Login failed. Please verify your passphrase.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Passkey Login
  const handlePasskeyLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const assertion = await authenticatePasskey();
      await login({
        credentialId: assertion.id,
        deviceName: loginDevice.trim() || getBrowserDeviceName(),
      });
      onClose();
    } catch (err) {
      setLoginError(err?.message || 'Passkey authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e) => {
    e?.preventDefault();
    setRegError('');

    if (!regMnemonic) {
      setRegError('Please generate or provide a passphrase.');
      return;
    }

    setRegLoading(true);
    try {
      await register({
        mnemonic: regMnemonic.trim(),
        deviceName: regDevice.trim() || getBrowserDeviceName(),
        nickname: regNickname.trim() || 'Movie Lover',
        profile: {
          colorA: selectedPalette.colorA,
          colorB: selectedPalette.colorB,
          icon: selectedPalette.icon,
        },
      });
      onClose();
    } catch (err) {
      setRegError(err?.message || 'Account registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // Copy passphrase helper
  const handleCopyPassphrase = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Passphrase copied to clipboard!');
  };

  // Manual sync trigger
  const handleSyncClick = async () => {
    setSyncingManual(true);
    try {
      await syncNow();
    } finally {
      setSyncingManual(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: 24,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.darker',
              color: 'primary.light',
            }}
          >
            <Iconify icon="solar:cloud-upload-bold-duotone" width={26} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {isLoggedIn ? 'Cloud Sync Account' : 'Youplex Sync'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Sync bookmarks & watch progress across all your devices
            </Typography>
          </Box>
        </Stack>

        <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled' }}>
          <Iconify icon="solar:close-circle-bold" width={22} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 3 }}>
        {/* =================================================================== */}
        {/* LOGGED IN VIEW                                                      */}
        {/* =================================================================== */}
        {isLoggedIn ? (
          <Stack spacing={2.5}>
            {/* User Profile Card */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: 'background.neutral',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  background: `linear-gradient(135deg, ${account?.profile?.colorA || '#00A76F'}, ${account?.profile?.colorB || '#00B8D9'})`,
                  boxShadow: (theme) => `0 4px 12px ${account?.profile?.colorA || '#00A76F'}40`,
                }}
              >
                <Iconify icon={account?.profile?.icon || 'solar:user-bold'} width={30} />
              </Avatar>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {account?.nickname || 'Movie Fan'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                  Device: {account?.deviceName || 'Web Client'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }} noWrap>
                  ID: {account?.userId?.slice(0, 14)}...
                </Typography>
              </Box>

              <Chip
                size="small"
                variant="soft"
                color={syncStatus === 'synced' ? 'success' : syncStatus === 'syncing' ? 'warning' : 'default'}
                icon={
                  syncStatus === 'syncing' ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <Iconify icon="solar:check-circle-bold" width={14} />
                  )
                }
                label={syncStatus === 'syncing' ? 'Syncing...' : 'Connected'}
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Backend URL & Status */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  SYNC BACKEND SERVER
                </Typography>
                <Chip
                  size="small"
                  label={backendUrl === DEFAULT_BACKEND_URL ? 'Default (pstream.site)' : 'Custom'}
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 11 }}
                />
              </Stack>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 1.5 }}>
                {backendUrl}
              </Typography>

              <Button
                variant="soft"
                color="primary"
                fullWidth
                startIcon={
                  syncingManual ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:refresh-bold" />
                  )
                }
                onClick={handleSyncClick}
                disabled={syncingManual}
              >
                {syncingManual ? 'Syncing with cloud...' : 'Sync Now (Force Update)'}
              </Button>
            </Box>

            {/* Recovery Passphrase Section */}
            {account?.mnemonic && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.neutral',
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Secret Recovery Passphrase
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    startIcon={
                      <Iconify icon={showPassphrase ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />
                    }
                  >
                    {showPassphrase ? 'Hide' : 'Reveal'}
                  </Button>
                </Stack>

                {showPassphrase && (
                  <Box sx={{ mt: 1.5 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        lineHeight: 1.6,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        wordBreak: 'break-word',
                      }}
                    >
                      {account.mnemonic}
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                      startIcon={<Iconify icon="solar:copy-bold" />}
                      onClick={() => handleCopyPassphrase(account.mnemonic)}
                    >
                      Copy Passphrase
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Custom Backend URL modifier */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Change Backend Server URL (Optional)
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
                  Save
                </Button>
              </Stack>
            </Box>

            {/* Actions: Disconnect & Sign Out */}
            <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={() => {
                  disconnect();
                  onClose();
                }}
              >
                Disconnect Sync
              </Button>
              <Button
                variant="soft"
                color="error"
                fullWidth
                onClick={() => {
                  logout();
                  onClose();
                }}
              >
                Log Out
              </Button>
            </Stack>
          </Stack>
        ) : (
          /* =================================================================== */
          /* LOGGED OUT VIEW (Tabs: Sign In / Create Account)                     */
          /* =================================================================== */
          <Stack spacing={2.5}>
            <Tabs
              value={tabIndex}
              onChange={(_, val) => setTabIndex(val)}
              variant="fullWidth"
              sx={{
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
                p: 0.5,
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
                '& .MuiTab-root': {
                  borderRadius: 1.25,
                  minHeight: 38,
                  fontWeight: 600,
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    boxShadow: 2,
                  },
                },
              }}
            >
              <Tab label="Log In" icon={<Iconify icon="solar:login-2-bold" width={18} />} iconPosition="start" />
              <Tab label="Create Account" icon={<Iconify icon="solar:user-plus-bold" width={18} />} iconPosition="start" />
            </Tabs>

            {/* TAB 0: LOG IN */}
            {tabIndex === 0 && (
              <Box component="form" onSubmit={handleLoginSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loginError && <Alert severity="error">{loginError}</Alert>}

                <TextField
                  label="Device Name"
                  placeholder="e.g. Chrome on Windows"
                  value={loginDevice}
                  onChange={(e) => setLoginDevice(e.target.value)}
                  fullWidth
                  helperText="Helps identify active sessions on other devices"
                />

                <TextField
                  label="Secret 12-Word Passphrase"
                  placeholder="word1 word2 word3 ... word12"
                  value={loginPassphrase}
                  onChange={(e) => setLoginPassphrase(e.target.value)}
                  type={showLoginPassword ? 'text' : 'password'}
                  multiline={showLoginPassword}
                  minRows={showLoginPassword ? 2 : 1}
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          edge="end"
                          size="small"
                        >
                          <Iconify icon={showLoginPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Your account is secured with end-to-end cryptography. No email or password needed."
                />

                {isPasskeySupported() && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    startIcon={<Iconify icon="solar:shield-keyhole-bold" />}
                    onClick={handlePasskeyLogin}
                    disabled={loginLoading}
                    sx={{ py: 1.2 }}
                  >
                    Sign In with Passkey / Biometrics
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={loginLoading || !loginPassphrase.trim()}
                  startIcon={loginLoading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:login-3-bold" />}
                  sx={{ py: 1.3, fontWeight: 700 }}
                >
                  {loginLoading ? 'Authenticating & Syncing...' : 'Sign In & Sync'}
                </Button>
              </Box>
            )}

            {/* TAB 1: CREATE ACCOUNT */}
            {tabIndex === 1 && (
              <Box component="form" onSubmit={handleRegisterSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {regError && <Alert severity="error">{regError}</Alert>}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Nickname"
                    placeholder="e.g. Alex"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Device Name"
                    placeholder="e.g. Chrome on Windows"
                    value={regDevice}
                    onChange={(e) => setRegDevice(e.target.value)}
                    fullWidth
                  />
                </Stack>

                {/* Avatar Palette Selector */}
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                    CHOOSE YOUR AVATAR THEME
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {AVATAR_PALETTES.map((palette) => {
                      const isSelected = selectedPalette.name === palette.name;
                      return (
                        <Tooltip key={palette.name} title={palette.name}>
                          <Box
                            onClick={() => setSelectedPalette(palette)}
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${palette.colorA}, ${palette.colorB})`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              border: isSelected ? '3px solid #fff' : '2px solid transparent',
                              boxShadow: isSelected ? '0 0 0 2px #00A76F' : 'none',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Iconify icon={palette.icon} width={18} />
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>

                {/* Generated Passphrase Card */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="solar:key-bold" color="warning.main" width={20} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Your Secret Passphrase (12 Words)
                      </Typography>
                    </Stack>
                    <IconButton
                      size="small"
                      onClick={() => setRegMnemonic(genMnemonic())}
                      title="Generate new passphrase"
                    >
                      <Iconify icon="solar:refresh-bold" width={18} />
                    </IconButton>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    {regMnemonic.split(' ').map((word, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 0.75,
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          fontSize: 12,
                          textAlign: 'center',
                          fontFamily: 'monospace',
                        }}
                      >
                        <Typography component="span" sx={{ color: 'text.disabled', fontSize: 10, mr: 0.5 }}>
                          {idx + 1}.
                        </Typography>
                        <strong>{word}</strong>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    size="small"
                    variant="soft"
                    color="primary"
                    fullWidth
                    startIcon={<Iconify icon="solar:copy-bold" />}
                    onClick={() => {
                      handleCopyPassphrase(regMnemonic);
                      setPassphraseConfirmed(true);
                    }}
                  >
                    Copy All 12 Words
                  </Button>
                </Box>

                <Alert severity="warning" sx={{ fontSize: 12 }}>
                  <strong>Important:</strong> There is no email recovery. Save these 12 words in a password manager or notes. They are the only way to log in on other devices!
                </Alert>

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={regLoading || !regMnemonic}
                  startIcon={regLoading ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:check-circle-bold" />}
                  sx={{ py: 1.3, fontWeight: 700 }}
                >
                  {regLoading ? 'Creating Account & Syncing...' : 'Create Account & Sync Now'}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
