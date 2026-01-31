'use client';

import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';

import { AnimateLogo1 } from 'src/components/animate';

// ----------------------------------------------------------------------

export function SplashScreen({ portal = true, sx, ...other }) {
  const content = (
    <Box sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          right: 0,
          width: 1,
          bottom: 0,
          height: 1,
          zIndex: 9998,
          display: 'flex',
          position: 'fixed',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          ...sx,
        }}
        {...other}
      >
        <AnimateLogo1 />
      </Box>
    </Box>
  );

  if (portal) {
    return <Portal>{content}</Portal>;
  }

  return content;
}
