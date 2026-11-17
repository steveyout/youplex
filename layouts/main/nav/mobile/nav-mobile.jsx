import { useEffect } from 'react';
import { paths } from '@/routes/paths';
import { Logo } from '@/components/logo';
import { usePathname } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { NavUl } from '@/components/nav-section';
import { Scrollbar } from '@/components/scrollbar';
import { SignInButton } from '@/layouts/components/sign-in-button';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';

import { NavList } from './nav-mobile-list';

// ----------------------------------------------------------------------

export function NavMobile({ data, open, onClose, slots, sx }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
          width: 'var(--layout-nav-mobile-width)',
          ...sx,
        },
      }}
    >
      {slots?.topArea ?? (
        <Box display="flex" sx={{ pt: 3, pb: 2, pl: 2.5 }}>
          <Logo />
        </Box>
      )}

      <Scrollbar fillContent>
        <Box component="nav" display="flex" flexDirection="column" flex="1 1 auto" sx={{ pb: 3 }}>
          <NavUl>
            {data.map((list) => (
              <NavList key={list.title} data={list} />
            ))}
          </NavUl>
        </Box>
      </Scrollbar>

      {slots?.bottomArea ?? (
        <Box gap={1.5} display="flex" flexDirection="column" sx={{ px: 2.5, py: 2.5 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            component="a"
            rel="noopener noreferrer"
            target="_blank"
            href={paths.app}
            startIcon={<Iconify icon="ant-design:android-filled" width={20} />}
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: (theme) =>
                `0 6px 16px -2px ${alpha(theme.palette.primary.main, 0.4)}`,
              fontWeight: 600,
            }}
          >
            Download Android App
          </Button>

          <Box gap={1.5} display="flex">
            <SignInButton fullWidth />

            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              component="a"
              rel="noopener noreferrer"
              target="_blank"
              href={paths.discord}
              startIcon={<Iconify icon="line-md:discord" width={22} />}
            >
              Discord
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
