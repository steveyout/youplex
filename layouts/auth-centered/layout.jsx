'use client';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { Main } from './main';
import { HeaderBase } from '../core/header-base';
import { LayoutSection } from '../core/layout-section';

// ----------------------------------------------------------------------

export function AuthCenteredLayout({ sx, children }) {
  const layoutQuery = 'md';
  const theme = useTheme();

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        <HeaderBase
          disableElevation
          layoutQuery={layoutQuery}
          slotsDisplay={{
            signIn: false,
            searchbar: false,
            menuButton: false,
            localization: false,
            notifications: false,
            settings: true,
            helpLink: true,
          }}
          slotProps={{ container: { maxWidth: false } }}
          sx={{ position: { [layoutQuery]: 'fixed' } }}
        />
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        '--layout-auth-content-width': '480px',
      }}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        bgcolor: 'background.default',
        '&::before': {
          width: 1,
          height: 1,
          zIndex: 1,
          content: "''",
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          background: `radial-gradient(circle at 50% 30%, ${theme.palette.primary.main}15 0%, transparent 60%)`,
        },
        ...sx,
      }}
    >
      <Main layoutQuery={layoutQuery}>{children}</Main>
    </LayoutSection>
  );
}
