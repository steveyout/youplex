'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import { alpha } from '@mui/material/styles';

import { usePathname } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

export function BackToTop({ threshold = 180, sx, ...other }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY =
        window.pageYOffset ??
        document.documentElement?.scrollTop ??
        document.body?.scrollTop ??
        0;
      setShow(scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const backToTop = useCallback(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement?.scrollTo({ top: 0, behavior: 'smooth' });
      document.body?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  const isPlayPage = pathname?.includes('/play');

  if (isPlayPage) {
    return null;
  }

  return (
    <Zoom in={show}>
      <Box
        role="presentation"
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 20, md: 28 },
          bottom: {
            xs: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            md: 28,
          },
          zIndex: 1300,
          ...sx,
        }}
      >
        <Fab
          aria-label="Back to top"
          onClick={backToTop}
          size="medium"
          sx={{
            width: { xs: 46, md: 50 },
            height: { xs: 46, md: 50 },
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'common.white',
            border: '1px solid rgba(255, 255, 255, 0.32)',
            boxShadow: (theme) =>
              `0 10px 28px -4px ${alpha(theme.palette.primary.main, 0.55)}, 0 4px 12px rgba(0, 0, 0, 0.45)`,
            transition: (theme) =>
              theme.transitions.create(['transform', 'box-shadow', 'filter'], {
                duration: 220,
              }),
            '&:hover': {
              transform: 'scale(1.08) translateY(-2px)',
              boxShadow: (theme) =>
                `0 14px 34px -4px ${alpha(theme.palette.primary.main, 0.7)}, 0 6px 16px rgba(0, 0, 0, 0.55)`,
              filter: 'brightness(1.08)',
            },
            '&:active': {
              transform: 'scale(0.92)',
            },
          }}
          {...other}
        >
          <Iconify width={26} icon="solar:double-alt-arrow-up-bold-duotone" />
        </Fab>
      </Box>
    </Zoom>
  );
}

export default BackToTop;
