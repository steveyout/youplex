'use client';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { useSyncAuth } from '@/hooks/use-sync-auth';
import { usePopover, CustomPopover } from '@/components/custom-popover';

// ----------------------------------------------------------------------

export function AccountButton({ sx, ...other }) {
  const router = useRouter();
  const popover = usePopover();
  const { account, isLoggedIn, syncStatus, logout, syncNow } = useSyncAuth();

  const handleNavigate = useCallback(
    (path) => {
      popover.onClose();
      router.push(path);
    },
    [router, popover]
  );

  const handleSyncNow = useCallback(async () => {
    try {
      await syncNow();
    } catch {
      // toast is already handled in auth-context
    }
  }, [syncNow]);

  const handleLogout = useCallback(async () => {
    popover.onClose();
    await logout();
    router.push(paths.auth.signIn);
  }, [logout, popover, router]);

  // Sync status helpers
  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing...'
      : syncStatus === 'error'
      ? 'Sync error'
      : syncStatus === 'synced'
      ? 'Synced with cloud'
      : 'Ready';

  const syncColor =
    syncStatus === 'syncing'
      ? 'warning.main'
      : syncStatus === 'error'
      ? 'error.main'
      : 'success.main';

  return (
    <>
      <Tooltip title={isLoggedIn ? `Account: ${account?.nickname || 'User'}` : 'Account / Sign In'}>
        <IconButton
          onClick={popover.onOpen}
          aria-label="Account menu"
          sx={{
            p: isLoggedIn ? 0.5 : 0.85,
            position: 'relative',
            color: popover.open ? 'primary.main' : 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            ...(popover.open && { bgcolor: 'action.selected' }),
            ...sx,
          }}
          {...other}
        >
          {isLoggedIn ? (
            <>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  background: `linear-gradient(135deg, ${account?.profile?.colorA || '#00A76F'}, ${account?.profile?.colorB || '#00B8D9'})`,
                }}
              >
                <Iconify
                  icon={account?.profile?.icon || 'solar:user-bold'}
                  width={18}
                  sx={{ color: '#fff' }}
                />
              </Avatar>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  bgcolor: syncColor,
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  border: (t) => `2px solid ${t.palette.background.paper}`,
                }}
              />
            </>
          ) : (
            <Iconify icon="solar:user-circle-bold-duotone" width={26} />
          )}
        </IconButton>
      </Tooltip>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <Box sx={{ width: { xs: 285, sm: 305 } }}>
          {isLoggedIn ? (
            /* ================= LOGGED IN USER VIEW ================= */
            <>
              <Box sx={{ p: 2, pb: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      background: `linear-gradient(135deg, ${account?.profile?.colorA || '#00A76F'}, ${account?.profile?.colorB || '#00B8D9'})`,
                    }}
                  >
                    <Iconify
                      icon={account?.profile?.icon || 'solar:user-bold'}
                      width={24}
                      sx={{ color: '#fff' }}
                    />
                  </Avatar>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {account?.nickname || 'Movie Lover'}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block', fontSize: 11 }}>
                      {account?.deviceName || 'Web Client'}
                    </Typography>
                  </Box>
                </Stack>

                {/* Cloud Sync Status Indicator */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    mt: 1.5,
                    px: 1.25,
                    py: 0.6,
                    borderRadius: 1.25,
                    bgcolor: 'background.neutral',
                    border: (t) => `1px solid ${t.palette.divider}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: syncColor,
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', flex: 1, fontSize: 11.5 }}>
                    {syncLabel}
                  </Typography>
                  <Tooltip title="Trigger immediate sync">
                    <IconButton size="small" onClick={handleSyncNow} sx={{ p: 0.25 }}>
                      <Iconify icon="solar:restart-bold" width={14} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

              <MenuList sx={{ p: 1 }}>
                <MenuItem
                  onClick={() => handleNavigate(paths.auth.account)}
                  sx={{ py: 1.1, px: 1.5, borderRadius: 1.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
                    <Iconify icon="solar:user-id-bold-duotone" width={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Account & Devices"
                    primaryTypographyProps={{ typography: 'subtitle2', fontWeight: 600, fontSize: 13.5 }}
                  />
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate(paths.bookmarks)}
                  sx={{ py: 1.1, px: 1.5, borderRadius: 1.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'info.main' }}>
                    <Iconify icon="solar:bookmark-bold-duotone" width={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Bookmarks / Watchlist"
                    primaryTypographyProps={{ typography: 'subtitle2', fontSize: 13.5 }}
                  />
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate(paths.history)}
                  sx={{ py: 1.1, px: 1.5, borderRadius: 1.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'warning.main' }}>
                    <Iconify icon="solar:history-bold-duotone" width={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Watch History"
                    primaryTypographyProps={{ typography: 'subtitle2', fontSize: 13.5 }}
                  />
                </MenuItem>
              </MenuList>

              <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

              <Box sx={{ p: 1, pt: 0.5 }}>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderRadius: 1.25,
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.lighter' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'error.main' }}>
                    <Iconify icon="solar:logout-2-bold-duotone" width={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sign Out"
                    primaryTypographyProps={{ typography: 'subtitle2', fontWeight: 600, fontSize: 13.5 }}
                  />
                </MenuItem>
              </Box>
            </>
          ) : (
            /* ================= GUEST / LOGGED OUT VIEW ================= */
            <>
              <Box sx={{ p: 2, pb: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: 'primary.lighter',
                      color: 'primary.main',
                    }}
                  >
                    <Iconify icon="solar:user-circle-bold-duotone" width={26} />
                  </Avatar>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      Cloud Sync
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: 11.5 }}>
                      Sync your watchlist & progress
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

              <MenuList sx={{ p: 1 }}>
                {/* SIGN IN OPTION */}
                <MenuItem
                  onClick={() => handleNavigate(paths.auth.signIn)}
                  sx={{
                    py: 1.2,
                    px: 1.5,
                    borderRadius: 1.25,
                    mb: 0.75,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
                    <Iconify icon="solar:login-2-bold-duotone" width={22} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sign In"
                    secondary="Use your 12-word passphrase"
                    primaryTypographyProps={{ typography: 'subtitle2', fontWeight: 700, fontSize: 13.5 }}
                    secondaryTypographyProps={{ typography: 'caption', fontSize: 11.5 }}
                  />
                </MenuItem>

                {/* SIGN UP OPTION */}
                <MenuItem
                  onClick={() => handleNavigate(paths.auth.signUp)}
                  sx={{
                    py: 1.2,
                    px: 1.5,
                    borderRadius: 1.25,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'success.main' }}>
                    <Iconify icon="solar:user-plus-bold-duotone" width={22} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sign Up / Register"
                    secondary="Create new account & sync"
                    primaryTypographyProps={{ typography: 'subtitle2', fontWeight: 700, fontSize: 13.5 }}
                    secondaryTypographyProps={{ typography: 'caption', fontSize: 11.5 }}
                  />
                </MenuItem>
              </MenuList>

              <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

              <MenuList sx={{ p: 1, pt: 0.5 }}>
                <MenuItem
                  onClick={() => handleNavigate(paths.bookmarks)}
                  sx={{ py: 0.9, px: 1.5, borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'text.secondary' }}>
                    <Iconify icon="solar:bookmark-bold-duotone" width={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Local Bookmarks"
                    primaryTypographyProps={{ typography: 'caption', fontWeight: 600, fontSize: 12.5 }}
                  />
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate(paths.history)}
                  sx={{ py: 0.9, px: 1.5, borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: 'text.secondary' }}>
                    <Iconify icon="solar:history-bold-duotone" width={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Watch History"
                    primaryTypographyProps={{ typography: 'caption', fontWeight: 600, fontSize: 12.5 }}
                  />
                </MenuItem>
              </MenuList>
            </>
          )}
        </Box>
      </CustomPopover>
    </>
  );
}

export { AccountButton as AccountPopover };
