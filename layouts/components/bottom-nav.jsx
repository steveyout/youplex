'use client';

import { m } from 'framer-motion';
import { paths } from '@/routes/paths';
import { varAlpha } from '@/theme/styles';
import { usePathname } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    key: 'home',
    title: 'Home',
    path: '/',
    icon: 'solar:home-2-bold-duotone',
    activeIcon: 'solar:home-2-bold',
  },
  {
    key: 'search',
    title: 'Search',
    path: paths.search,
    icon: 'solar:magnifer-bold-duotone',
    activeIcon: 'solar:magnifer-bold',
  },
  {
    key: 'movies',
    title: 'Movies',
    path: paths.movies,
    icon: 'solar:clapperboard-bold-duotone',
    activeIcon: 'solar:clapperboard-bold',
  },
  {
    key: 'tv',
    title: 'Shows',
    path: paths.tv,
    icon: 'solar:tv-bold-duotone',
    activeIcon: 'solar:tv-bold',
  },
  {
    key: 'live-tv',
    title: 'Live',
    path: paths.liveTv,
    icon: 'solar:radio-bold-duotone',
    activeIcon: 'solar:radio-bold',
  },
  {
    key: 'library',
    title: 'Library',
    path: paths.bookmarks,
    icon: 'solar:bookmark-square-minimalistic-bold-duotone',
    activeIcon: 'solar:bookmark-square-minimalistic-bold',
  },
];

// ----------------------------------------------------------------------

export function BottomNav({ sx }) {
  const theme = useTheme();
  const pathname = usePathname();

  // Do not render bottom nav on video playback screens
  if (pathname?.includes('/play')) {
    return null;
  }

  return (
    <Box
      component="nav"
      aria-label="Mobile Bottom Navigation"
      data-slot="bottom-nav"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: { xs: 'block', md: 'none' },
        width: '100%',
        bgcolor: varAlpha(theme.vars.palette.background.defaultChannel, 0.92),
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${varAlpha(theme.vars.palette.divider, 0.12)}`,
        boxShadow: `0 -4px 20px rgba(0, 0, 0, 0.4), 0 -1px 0 ${varAlpha(theme.vars.palette.common.whiteChannel, 0.05)}`,
        pt: 0.75,
        pb: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        px: { xs: 0.5, sm: 1.5 },
        contain: 'layout paint',
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: 620,
          mx: 'auto',
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
              sx={{
                flex: 1,
                minWidth: 0,
                textDecoration: 'none',
                color: 'inherit',
                outline: 'none',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0.5,
                cursor: 'pointer',
              }}
            >
              <m.div
                whileTap={{ scale: 0.91 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                {/* Material 3 Active Indicator Pill around the icon */}
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: { xs: 46, sm: 56 },
                    height: 30,
                    borderRadius: 999,
                    mb: 0.35,
                  }}
                >
                  {active && (
                    <m.span
                      layoutId="m3-bottom-nav-active-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 32,
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.2),
                        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.38)}`,
                        boxShadow: `0 2px 10px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.3)}`,
                      }}
                    />
                  )}

                  <Iconify
                    icon={active ? item.activeIcon || item.icon : item.icon}
                    width={20}
                    sx={{
                      zIndex: 1,
                      color: active ? 'primary.main' : 'text.secondary',
                      transform: active ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.25s cubic-bezier(0.2, 0, 1), color 0.2s ease',
                      filter: active
                        ? `drop-shadow(0 2px 6px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.45)})`
                        : 'none',
                    }}
                  />
                </Box>

                {/* Material Label below */}
                <Typography
                  variant="caption"
                  sx={{
                    zIndex: 1,
                    fontSize: { xs: '0.62rem', sm: '0.68rem' },
                    fontWeight: active ? 700 : 500,
                    lineHeight: 1.15,
                    letterSpacing: 0.2,
                    color: active ? 'primary.main' : 'text.secondary',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s ease, font-weight 0.2s ease',
                  }}
                >
                  {item.title}
                </Typography>
              </m.div>
            </Box>
          );
        })}
      </Box>
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
    return pathname === '/search' || pathname?.startsWith('/search');
  }

  if (item.key === 'movies') {
    return (
      pathname === paths.movies ||
      pathname?.startsWith('/movies') ||
      pathname?.startsWith('/watch/movie')
    );
  }

  if (item.key === 'tv') {
    return (
      pathname === paths.tv ||
      pathname?.startsWith('/tv') ||
      pathname?.startsWith('/watch/tv')
    );
  }

  if (item.key === 'live-tv') {
    return pathname === paths.liveTv || pathname?.startsWith('/live-tv');
  }

  if (item.key === 'library') {
    return (
      pathname === paths.bookmarks ||
      pathname?.startsWith('/bookmarks') ||
      pathname === paths.history ||
      pathname?.startsWith('/history')
    );
  }

  return pathname === item.path;
}
