'use client';

import { varAlpha } from '@/theme/styles';
import { Iconify } from '@/components/iconify';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

// ----------------------------------------------------------------------

export function SliderRow({ children, sx, itemWidth = { xs: 150, sm: 180, md: 200 }, gap = 2, ...other }) {
  const theme = useTheme();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return undefined;
    }
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const handleScroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', ...sx }} {...other}>
      {/* Left Navigation Arrow (Desktop) */}
      {canScrollLeft && (
        <IconButton
          onClick={() => handleScroll('left')}
          aria-label="Scroll left"
          sx={{
            display: { xs: 'none', md: 'flex' },
            position: 'absolute',
            left: -18,
            top: '45%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 42,
            height: 42,
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.85),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.2)}`,
            color: 'text.primary',
            boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.common.blackChannel, 0.4)}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.main',
              color: 'common.white',
              transform: 'translateY(-50%) scale(1.1)',
              boxShadow: `0 10px 28px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.6)}`,
            },
          }}
        >
          <Iconify icon="solar:alt-arrow-left-bold" width={20} />
        </IconButton>
      )}

      {/* Scrollable Container */}
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap,
          pb: 1.5,
          pt: 0.5,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '& > *': {
            flexShrink: 0,
            scrollSnapAlign: 'start',
            width: itemWidth,
          },
        }}
      >
        {children}
      </Box>

      {/* Right Navigation Arrow (Desktop) */}
      {canScrollRight && (
        <IconButton
          onClick={() => handleScroll('right')}
          aria-label="Scroll right"
          sx={{
            display: { xs: 'none', md: 'flex' },
            position: 'absolute',
            right: -18,
            top: '45%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 42,
            height: 42,
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.85),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.2)}`,
            color: 'text.primary',
            boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.common.blackChannel, 0.4)}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.main',
              color: 'common.white',
              transform: 'translateY(-50%) scale(1.1)',
              boxShadow: `0 10px 28px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.6)}`,
            },
          }}
        >
          <Iconify icon="solar:alt-arrow-right-bold" width={20} />
        </IconButton>
      )}
    </Box>
  );
}
