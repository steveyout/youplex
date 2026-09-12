'use client';

import { paths } from '@/routes/paths';
import { useRef, useState } from 'react';
import { varAlpha } from '@/theme/styles';
import { usePathname } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { m, useScroll, useMotionValueEvent } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { key: 'home', title: 'Home', path: '/', icon: 'solar:home-2-bold-duotone', activeIcon: 'solar:home-2-bold' },
  { key: 'search', title: 'Search', path: paths.search, icon: 'solar:magnifer-bold-duotone', activeIcon: 'solar:magnifer-bold' },
  { key: 'movies', title: 'Movies', path: paths.movies, icon: 'solar:clapperboard-bold-duotone', activeIcon: 'solar:clapperboard-bold' },
  { key: 'tv', title: 'Shows', path: paths.tv, icon: 'solar:tv-bold-duotone', activeIcon: 'solar:tv-bold' },
  { key: 'live-tv', title: 'Live', path: paths.liveTv, icon: 'solar:radio-bold-duotone', activeIcon: 'solar:radio-bold' },
  {
    key: 'torrents',
    title: 'Torrents',
    path: paths.torrents,
    icon: 'solar:download-square-bold-duotone',
    activeIcon: 'solar:download-square-bold',
    external: true,
  },
  {
    key: 'discord',
    title: 'Discord',
    path: paths.discord,
    icon: 'ic:baseline-discord',
    activeIcon: 'ic:baseline-discord',
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
    setHidden(isScrollingDown && y > 120);
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
        zIndex: 'var(--layout-header-zIndex, 1100)',
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'center',
        px: 1.5,
        pt: 1,
        pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        pointerEvents: 'none',
        ...sx,
      }}
    >
      <m.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: hidden ? 120 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        style={{ pointerEvents: 'auto', maxWidth: '100%' }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{
            p: 0.6,
            borderRadius: 999,
            border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.12)}`,
            background: `linear-gradient(180deg, ${varAlpha(theme.vars.palette.background.paperChannel, 0.88)}, ${varAlpha(theme.vars.palette.background.defaultChannel, 0.94)})`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: `0 16px 36px -8px rgba(0, 0, 0, 0.56), 0 0 0 1px ${varAlpha(theme.vars.palette.common.whiteChannel, 0.06)}`,
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
                sx={{ textDecoration: 'none', color: 'inherit', outline: 'none' }}
              >
                <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}>
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.3}
                    sx={{
                      position: 'relative',
                      minWidth: { xs: 42, sm: 58 },
                      flexShrink: 0,
                      py: 0.75,
                      px: { xs: 0.25, sm: 0.5 },
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
                        transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 999,
                          background: varAlpha(theme.vars.palette.primary.mainChannel, 0.14),
                          boxShadow: `inset 0 0 0 1px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.32)}, 0 8px 20px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.35)}`,
                        }}
                      />
                    )}

                    <Iconify
                      icon={active ? (item.activeIcon || item.icon) : item.icon}
                      width={22}
                      sx={{
                        zIndex: 1,
                        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: active ? 'scale(1.1)' : 'scale(1)',
                        filter: active
                          ? `drop-shadow(0 2px 8px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.5)})`
                          : 'none',
                      }}
                    />

                    <Typography
                      variant="caption"
                      sx={{
                        zIndex: 1,
                        fontSize: '0.625rem',
                        fontWeight: active ? 700 : 500,
                        lineHeight: 1,
                        letterSpacing: 0.2,
                        whiteSpace: 'nowrap',
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

  if (item.key === 'live-tv') {
    return pathname === '/live-tv' || pathname.startsWith('/live-tv/');
  }

  return false;
}
