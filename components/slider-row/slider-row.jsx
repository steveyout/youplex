'use client';

import { varAlpha } from '@/theme/styles';
import { Iconify } from '@/components/iconify';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

// ----------------------------------------------------------------------

export function SliderRow({ children, sx, itemWidth = { xs: 145, sm: 175, md: 195 }, gap = 2, ...other }) {
  const theme = useTheme();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    // On mobile devices, arrows are hidden, skip calculating and re-rendering
    if (typeof window !== 'undefined' && window.innerWidth < 900) return;

    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasLeft = scrollLeft > 14;
    const hasRight = scrollLeft < scrollWidth - clientWidth - 14;

    setCanScrollLeft((prev) => (prev !== hasLeft ? hasLeft : prev));
    setCanScrollRight((prev) => (prev !== hasRight ? hasRight : prev));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    checkScroll();

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children, checkScroll]);

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
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.9),
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.2)}`,
            color: 'text.primary',
            boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.common.blackChannel, 0.4)}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
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
          scrollSnapType: { xs: 'x proximity', md: 'x mandatory' },
          scrollPadding: { xs: '0 16px', md: '0 24px' },
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-x pan-y',
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
            bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.9),
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.2)}`,
            color: 'text.primary',
            boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.common.blackChannel, 0.4)}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
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

export default SliderRow;
