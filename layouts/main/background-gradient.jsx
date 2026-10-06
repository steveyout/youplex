'use client';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { varAlpha } from '@/theme/styles';

// ----------------------------------------------------------------------

export function BackgroundGradient() {
  const theme = useTheme();

  const { primary, secondary, info } = theme.vars.palette;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      <Box
        className="youplex-aurora"
        sx={{
          top: '-12%',
          left: '-8%',
          width: { xs: 340, sm: 460, md: 640 },
          height: { xs: 340, sm: 460, md: 640 },
          filter: { xs: 'none', md: 'blur(90px)' },
          animation: { xs: 'none', md: 'youplex-drift-a 30s ease-in-out infinite' },
          transform: 'translate3d(0, 0, 0)',
          background: `radial-gradient(circle at 50% 50%, ${varAlpha(
            primary.mainChannel,
            0.28
          )} 0%, ${varAlpha(primary.mainChannel, 0.08)} 45%, transparent 70%)`,
        }}
      />

      <Box
        className="youplex-aurora"
        sx={{
          top: '18%',
          right: '-14%',
          width: { xs: 380, sm: 520, md: 720 },
          height: { xs: 380, sm: 520, md: 720 },
          filter: { xs: 'none', md: 'blur(90px)' },
          animation: { xs: 'none', md: 'youplex-drift-b 38s ease-in-out infinite' },
          transform: 'translate3d(0, 0, 0)',
          background: `radial-gradient(circle at 50% 50%, ${varAlpha(
            secondary.mainChannel,
            0.2
          )} 0%, ${varAlpha(secondary.mainChannel, 0.06)} 45%, transparent 70%)`,
        }}
      />

      <Box
        className="youplex-aurora"
        sx={{
          bottom: '-18%',
          left: '16%',
          width: { xs: 380, sm: 540, md: 700 },
          height: { xs: 380, sm: 540, md: 700 },
          filter: { xs: 'none', md: 'blur(90px)' },
          animation: { xs: 'none', md: 'youplex-drift-c 44s ease-in-out infinite' },
          transform: 'translate3d(0, 0, 0)',
          background: `radial-gradient(circle at 50% 50%, ${varAlpha(
            info.mainChannel,
            0.15
          )} 0%, ${varAlpha(info.mainChannel, 0.04)} 45%, transparent 70%)`,
        }}
      />
    </Box>
  );
}

export default BackgroundGradient;
