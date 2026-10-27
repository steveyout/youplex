'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { AdBanner } from './ad-banner';
import { isSitewideAdsEnabled } from './ad-config';

// ----------------------------------------------------------------------

/**
 * Floating side skyscraper ads that sit in the left & right gutters
 * on wide desktop viewports without overlapping the main container content.
 */
export function FloatingSideAds() {
  const [leftClosed, setLeftClosed] = useState(false);
  const [rightClosed, setRightClosed] = useState(false);

  // Return null if sitewide ads are disabled via .env
  if (!isSitewideAdsEnabled()) {
    return null;
  }

  return (
    <>
      {/* Left Floating Skyscraper (160x600) */}
      {!leftClosed && (
        <Box
          sx={{
            display: { xs: 'none', '2xl': 'block', '@media (min-width: 1560px)': { display: 'block' } },
            position: 'fixed',
            left: { '2xl': 12, '@media (min-width: 1680px)': { left: 24 } },
            top: '52%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <AdBanner
            format="skyscraper"
            closable
            onClose={() => setLeftClosed(true)}
            label="Sponsor"
            sx={{
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
            }}
          />
        </Box>
      )}

      {/* Right Floating Skyscraper / Vertical Banner (160x600 or 160x300) */}
      {!rightClosed && (
        <Box
          sx={{
            display: { xs: 'none', '2xl': 'block', '@media (min-width: 1560px)': { display: 'block' } },
            position: 'fixed',
            right: { '2xl': 12, '@media (min-width: 1680px)': { right: 24 } },
            top: '52%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <Stack spacing={2}>
            <AdBanner
              format="banner"
              closable
              onClose={() => setRightClosed(true)}
              label="Sponsor"
              sx={{
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
              }}
            />
          </Stack>
        </Box>
      )}
    </>
  );
}

export default FloatingSideAds;
