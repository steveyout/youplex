'use client';

import { useBoolean } from '@/hooks/use-boolean';

import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { Main } from './main';
import { Footer } from './footer';
import { NavMobile } from './nav/mobile';
import { NavDesktop } from './nav/desktop';
import { BottomNav } from '../components/bottom-nav';
import { BackgroundGradient } from './background-gradient';
import { HeaderBase } from '../core/header-base';
import { LayoutSection } from '../core/layout-section';
import { navData as mainNavData } from '../config-nav-main';

// ----------------------------------------------------------------------

export function MainLayout({ sx, data, children }) {
  const theme = useTheme();


  const mobileNavOpen = useBoolean();


  const layoutQuery = 'md';

  const navData = data?.nav ?? mainNavData;

  return (
    <>
      <NavMobile data={navData} open={mobileNavOpen.value} onClose={mobileNavOpen.onFalse} />

      <BottomNav />

      <BackgroundGradient />

      <LayoutSection
        /** **************************************
         * Header
         *************************************** */
        headerSection={
          <HeaderBase
            layoutQuery={layoutQuery}
            onOpenNav={mobileNavOpen.onTrue}
            slotsDisplay={{
              helpLink: false,
              searchbar: true,
              localization: true,
              notifications: true,
              signIn :false,
            }}
            slots={{
              topArea: (
                <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                  This is an info Alert.
                </Alert>
              ),
              rightAreaStart: (
                <NavDesktop
                  data={navData}
                  sx={{
                    display: 'none',
                    [theme.breakpoints.up(layoutQuery)]: {
                      mr: 2.5,
                      display: 'flex',
                    },
                  }}
                />
              ),
            }}
          />
        }
        /** **************************************
         * Footer
         *************************************** */
        footerSection={
          <Footer
            layoutQuery={layoutQuery}
            sx={{ pb: { xs: 'calc(84px + env(safe-area-inset-bottom, 0px))', md: 0 } }}
          />
        }
        /** **************************************
         * Style
         *************************************** */
        sx={sx}
      >
        <Main>{children}</Main>
      </LayoutSection>
    </>
  );
}
