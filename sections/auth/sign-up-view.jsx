'use client';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { useSyncAuth } from '@/hooks/use-sync-auth';
import { genMnemonic } from '@/lib/sync/crypto';
import { getBackendMeta } from '@/lib/sync/api';

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

export function SignUpView() {
  const router = useRouter();
  const { register, isLoggedIn, backendUrl, updateBackendUrl } = useSyncAuth();

  const [nickname, setNickname] = useState('');
  const [device, setDevice] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [selectedPalette, setSelectedPalette] = useState(AVATAR_PALETTES[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Server settings collapse & test state
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(backendUrl);
  const [serverPingStatus, setServerPingStatus] = useState(null);
  const [isTestingServer, setIsTestingServer] = useState(false);

  useEffect(() => {
    setDevice(getBrowserDeviceName());
    setMnemonic(genMnemonic());
  }, []);

  useEffect(() => {
    setCustomServerUrl(backendUrl);
  }, [backendUrl]);

  // If already logged in, redirect to account dashboard
  useEffect(() => {
    if (isLoggedIn) {
      router.replace(paths.auth.account);
    }
  }, [isLoggedIn, router]);

  const handleCopyPassphrase = () => {
    if (!mnemonic) return;
    navigator.clipboard.writeText(mnemonic);
    toast.success('Passphrase copied to clipboard!');
  };

  const handleTestServer = async () => {
    setIsTestingServer(true);
    setServerPingStatus(null);
    try {
      const meta = await getBackendMeta(customServerUrl);
      setServerPingStatus({
        type: 'success',
        text: `Connected successfully! Server: ${meta?.name || 'movie-web'} (v${meta?.version || '2'})`,
      });
    } catch (err) {
      setServerPingStatus({
        type: 'error',
        text: `Server check warning: ${err?.message || 'Failed to connect'}`,
      });
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleApplyServer = () => {
    if (!customServerUrl || !customServerUrl.trim()) return;
    updateBackendUrl(customServerUrl.trim());
    toast.success('Backend server URL updated');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!mnemonic) {
      setErrorMsg('Passphrase is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        mnemonic: mnemonic.trim(),
        deviceName: device.trim() || getBrowserDeviceName(),
        nickname: nickname.trim() || 'Movie Lover',
        profile: {
          colorA: selectedPalette.colorA,
          colorB: selectedPalette.colorB,
          icon: selectedPalette.icon,
        },
      });
      router.push(paths.auth.account);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setErrorMsg(msg);
      if (error?.status === 500) {
        setShowServerConfig(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHead = (
    <Stack spacing={1.5} sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Get started with Cloud Sync
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Already have an account?
        </Typography>

        <Link component={RouterLink} href={paths.auth.signIn} variant="subtitle2" sx={{ fontWeight: 600 }}>
          Sign in
        </Link>
      </Stack>
    </Stack>
  );

  const renderServerConfig = (
    <Box sx={{ mb: 3 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          py: 1,
          px: 1.5,
          borderRadius: 1.5,
          bgcolor: 'background.neutral',
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:server-square-bold" width={18} color="text.secondary" />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Sync Server: <strong>{backendUrl}</strong>
          </Typography>
        </Stack>
        <Button
          size="small"
          variant="text"
          onClick={() => setShowServerConfig((prev) => !prev)}
          sx={{ fontSize: 12, py: 0.25 }}
        >
          {showServerConfig ? 'Hide settings' : 'Change server'}
        </Button>
      </Box>

      <Collapse in={showServerConfig}>
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: 1.5,
            bgcolor: 'background.paper',
            border: (t) => `1px dashed ${t.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Point to any movie-web / p-stream OpenBackend compatible instance (e.g. self-hosted server or localhost):
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              value={customServerUrl}
              onChange={(e) => setCustomServerUrl(e.target.value)}
              placeholder="https://backend.pstream.site"
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleApplyServer}
              disabled={customServerUrl === backendUrl}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleTestServer}
              loading={isTestingServer}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Test
            </Button>
          </Stack>

          {!!serverPingStatus && (
            <Alert severity={serverPingStatus.type} sx={{ fontSize: 12 }}>
              {serverPingStatus.text}
            </Alert>
          )}
        </Box>
      </Collapse>
    </Box>
  );

  const renderForm = (
    <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          name="nickname"
          label="Nickname"
          placeholder="e.g. Alex"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          fullWidth
          required
        />
        <TextField
          name="device"
          label="Device name"
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          fullWidth
        />
      </Stack>

      {/* Avatar Palette Selector */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
          CHOOSE AVATAR THEME
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
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:key-bold" color="warning.main" width={20} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Your Secret Passphrase (12 Words)
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setMnemonic(genMnemonic())} title="Generate new passphrase">
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
          {mnemonic.split(' ').map((word, idx) => (
            <Box
              key={idx}
              sx={{
                p: 0.75,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: (t) => `1px solid ${t.palette.divider}`,
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
          onClick={handleCopyPassphrase}
        >
          Copy All 12 Words
        </Button>
      </Box>

      <Alert severity="warning" sx={{ fontSize: 12 }}>
        <strong>Important:</strong> There is no email recovery. Save these 12 words in a password manager or notes. They are the only way to log in on other devices!
      </Alert>

      <LoadingButton
        fullWidth
        color="primary"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Creating account..."
        disabled={!mnemonic}
        sx={{ py: 1.3, fontWeight: 700 }}
      >
        Create account & Sync Now
      </LoadingButton>

      <Typography
        component="div"
        sx={{
          textAlign: 'center',
          typography: 'caption',
          color: 'text.secondary',
        }}
      >
        Your data is encrypted end-to-end and stored securely on the sync network.
      </Typography>
    </Box>
  );

  return (
    <>
      {renderHead}

      {renderServerConfig}

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {renderForm}
    </>
  );
}
