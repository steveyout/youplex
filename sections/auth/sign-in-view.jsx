'use client';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { useBoolean } from '@/hooks/use-boolean';
import { RouterLink } from '@/routes/components';
import { useSyncAuth } from '@/hooks/use-sync-auth';
import { getBackendMeta } from '@/lib/sync/api';
import { isPasskeySupported, authenticatePasskey, verifyValidMnemonic } from '@/lib/sync/crypto';

// ----------------------------------------------------------------------

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

export function SignInView() {
  const router = useRouter();
  const { login, isLoggedIn, backendUrl, updateBackendUrl } = useSyncAuth();

  const [device, setDevice] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Server settings collapse & test state
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(backendUrl);
  const [serverPingStatus, setServerPingStatus] = useState(null);
  const [isTestingServer, setIsTestingServer] = useState(false);

  const password = useBoolean();

  useEffect(() => {
    setDevice(getBrowserDeviceName());
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

    if (!verifyValidMnemonic(passphrase)) {
      setErrorMsg('Invalid passphrase format. Please enter your valid 12-word passphrase.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        mnemonic: passphrase.trim(),
        deviceName: device.trim() || getBrowserDeviceName(),
      });
      router.push(paths.auth.account);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Login failed. Please check your passphrase.';
      setErrorMsg(msg);
      if (error?.status === 500) {
        setShowServerConfig(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPasskeyLogin = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const assertion = await authenticatePasskey();
      await login({
        credentialId: assertion.id,
        deviceName: device.trim() || getBrowserDeviceName(),
      });
      router.push(paths.auth.account);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : 'Passkey login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHead = (
    <Stack spacing={1.5} sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Sign in to your account
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Don’t have an account?
        </Typography>

        <Link component={RouterLink} href={paths.auth.signUp} variant="subtitle2" sx={{ fontWeight: 600 }}>
          Get started
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
      <TextField
        name="device"
        label="Device name"
        value={device}
        onChange={(e) => setDevice(e.target.value)}
        fullWidth
        helperText="Identifies this device in your active session list"
      />

      <TextField
        name="passphrase"
        label="Secret 12-word passphrase"
        placeholder="word1 word2 word3 ... word12"
        type={password.value ? 'text' : 'password'}
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        multiline={password.value}
        minRows={password.value ? 2 : 1}
        fullWidth
        required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={password.onToggle} edge="end" size="small">
                <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        helperText="Secured end-to-end with cryptography. No email or password needed."
      />

      {isPasskeySupported() && (
        <Button
          variant="outlined"
          color="inherit"
          fullWidth
          size="large"
          startIcon={<Iconify icon="solar:shield-keyhole-bold" />}
          onClick={onPasskeyLogin}
          disabled={isSubmitting}
          sx={{ py: 1.2 }}
        >
          Sign in with Passkey / Biometrics
        </Button>
      )}

      <LoadingButton
        fullWidth
        color="primary"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Signing in..."
        disabled={!passphrase.trim()}
        sx={{ py: 1.3, fontWeight: 700 }}
      >
        Sign in & Sync
      </LoadingButton>
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
