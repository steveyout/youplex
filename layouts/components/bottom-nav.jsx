'use client';

import { useRef, useState } from 'react';
import { m, useScroll, useMotionValueEvent } from 'framer-motion';

import { paths } from '@/routes/paths';
import { Iconify } from '@/components/iconify';
import { usePathname } from '@/routes/hooks';
import { RouterLink } from '@/routes/components';
import { varAlpha } from '@/theme/styles';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { key: 'home', title: 'Home', path: '/', icon: 'proicons:home' },
  { key: 'search', title: 'Search', path: paths.search, icon: 'ic:round-search' },
  { key: 'movies', title: 'Movies', path: paths.movies, icon: 'fluent:movies-and-tv-20-regular' },
  { key: 'tv', title: 'TV', path: paths.tv, icon: 'iconoir:tv' },
  {
    key: 'torrents',
    title: 'Torrents',
    path: paths.torrents,
    icon: 'arcticons:torrents-csv-android',
    external: true,
  },
  {
    key: 'discord',
    title: 'Discord',
    path: paths.discord,
    icon: 'ic:round-discord',
    external: true,
  },
];

// ----------------------------------------------------------------------

export function BottomNav({ sx }) {
  const theme = useTheme();
  const pathname = usePathname();

  const lastY = useRef(0);
  const { scrollY } = useScroll();

  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const isScrollingDown = y > lastY.current;
    setHidden(isScrollingDown && y > 140);
    lastY.current = y;
  });

  return (
    <Box
      data-slot="bottom-nav"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--layout-header-zIndex)',
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'center',
        px: 2,
        pt: 1,
        pb: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        pointerEvents: 'none',
        ...sx,
      }}
    >
      <m.div
        initial={{ y: 110, opacity: 0 }}
        animate={{ y: hidden ? 110 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        style={{ pointerEvents: 'auto' }}
      >
        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            p: 0.75,
            borderRadius: 999,
            border: '1px solid',
            borderColor: theme.vars.palette.divider,
            background: `linear-gradient(180deg, ${varAlpha(theme.vars.palette.background.paperChannel, 0.9)}, ${varAlpha(theme.vars.palette.background.defaultChannel, 0.92)})`,
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: theme.customShadows.dropdown,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(pathname, item);

            return (
              <Box
                key={item.key}
                component={item.external ? 'a' : RouterLink}
                href={item.path}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                sx={{ textDecoration: 'none', color: 'inherit' }}
              >
                <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }}>
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.25}
                    sx={{
                      position: 'relative',
                      minWidth: { xs: 46, sm: 56 },
                      py: 0.7,
                      px: 0.25,
                      borderRadius: 999,
                      color: active ? 'primary.main' : 'text.secondary',
                      transition: theme.transitions.create(['color'], {
                        duration: theme.transitions.duration.shorter,
                      }),
                    }}
                  >
                    {active && (
                      <m.span
                        layoutId="youplex-bottom-nav-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 999,
                          background: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                          boxShadow: `inset 0 0 0 1px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.3)}, 0 8px 24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.35)}`,
                        }}
                      />
                    )}

                    <Iconify icon={item.icon} width={21} sx={{ zIndex: 1 }} />

                    <Typography
                      variant="caption"
                      sx={{
                        zIndex: 1,
                        fontSize: '0.625rem',
                        fontWeight: active ? 700 : 500,
                        lineHeight: 1,
                      }}
                    >
                      {item.title}
                    </Typography>
                  </Stack>
                </m.div>
              </Box>
            );
          })}
        </Stack>
      </m.div>
    </Box>
  );
}

// ----------------------------------------------------------------------

function isItemActive(pathname, item) {
  if (item.external) return false;

  if (item.key === 'home') {
    return pathname === '/';
  }

  if (item.key === 'search') {
    return pathname === '/search' || pathname.startsWith('/search');
  }

  if (item.key === 'movies') {
    if (/^\/watch\/movie\//.test(pathname)) return true;
    return pathname === '/movies' || pathname.startsWith('/movies/');
  }

  if (item.key === 'tv') {
    if (/^\/watch\/tv\//.test(pathname)) return true;
    return pathname === '/tv' || pathname.startsWith('/tv/');
  }

  return false;
}