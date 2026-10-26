'use client';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { layoutClasses } from '@/layouts/classes';

// ----------------------------------------------------------------------

export function Main({ sx, children, layoutQuery = 'md', ...other }) {
  const theme = useTheme();

  const renderContent = (
    <Box
      sx={{
        py: 5,
        px: { xs: 2.5, sm: 4 },
        width: 1,
        borderRadius: 2.5,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        boxShadow: (t) => t.customShadows?.card || '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: (t) => `1px solid ${t.palette.divider}`,
        maxWidth: 'var(--layout-auth-content-width, 480px)',
      }}
    >
      {children}
    </Box>
  );

  return (
    <Box
      component="main"
      className={layoutClasses.main}
      sx={{
        px: 2,
        py: 5,
        zIndex: 9,
        display: 'flex',
        flex: '1 1 auto',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh',
        [theme.breakpoints.up(layoutQuery)]: {
          px: 0,
          py: 'calc(var(--layout-header-desktop-height, 72px) + 24px)',
        },
        ...sx,
      }}
      {...other}
    >
      {renderContent}
    </Box>
  );
}
