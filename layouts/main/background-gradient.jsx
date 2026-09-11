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
      }}
    >
      <Box
        className="youplex-aurora"
        sx={{
          top: '-12%',
          left: '-8%',
          width: { xs: 460, md: 640 },
          height: { xs: 460, md: 640 },
          animation: 'youplex-drift-a 30s ease-in-out infinite',
          background: `radial-gradient(circle at 50% 50%, ${varAlpha(
            primary.mainChannel,
            0.32
          )}, transparent 65%)`,
        }}
      />

      <Box
        className="youplex-aurora"
        sx={{
          top: '18%',
          right: '-14%',
          width: { xs: 520, md: 720 },
          height: { xs: 520, md: 720 },
          animation: 'youplex-drift-b 38s ease-in-out infinite',
          background: `radial-gradient(circle at 50% 50%, ${varAlpha(
            secondary.mainChannel,
            0.24
          )}, transparent 65%)`,
        }}
      />

      <Box
        className="youplex-aurora"
        sx={{
          bottom: '-18%',
          left: '16%',
          width: { xs: 540, md: 700 },
          height: { xs: 540, md: 700 },
          animation: 'youplex-drift-c 44s ease-in-out infinite',
          background: `radial-gradient(circle at 50% 50%, ${varAlpha(
            info.mainChannel,
            0.18
          )}, transparent 65%)`,
        }}
      />
    </Box>
  );
}