'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/iconify';
import { isSitewideAdsEnabled } from './ad-config';

// ----------------------------------------------------------------------

export const AD_CONFIGS = {
  skyscraper: {
    key: 'db286534355560bb44457576fd0665fb',
    width: 160,
    height: 600,
    src: 'https://bancadeltempoidea.org/22/db286534355560bb44457576fd0665fb',
  },
  banner: {
    key: 'b0232c322b8c1c39292429c2667a837d',
    width: 160,
    height: 300,
    src: 'https://bancadeltempoidea.org/22/b0232c322b8c1c39292429c2667a837d',
  },
};

/**
 * AdBanner component renders the isolated iframe containing the ad script.
 *
 * @param {'skyscraper' | 'banner'} format - Choose between 160x600 (skyscraper) or 160x300 (banner)
 * @param {boolean} closable - Whether user can dismiss the ad
 * @param {string} label - Optional label above ad (default: 'ADVERTISEMENT')
 * @param {Object} sx - MUI style object
 */
export function AdBanner({
  format = 'skyscraper',
  closable = true,
  label = 'Advertisement',
  sx = {},
  ...other
}) {
  const theme = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const iframeRef = useRef(null);

  // Return null if sitewide ads are disabled via .env
  if (!isSitewideAdsEnabled()) {
    return null;
  }

  const config = AD_CONFIGS[format] || AD_CONFIGS.skyscraper;
  const width = config.width;
  const height = config.height;

  const srcDocHtml = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <base target="_blank">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    #ad-container {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <div id="ad-container">
    <script type="text/javascript">
      atOptions = {
        'key' : '${config.key}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    </script>
    <script type="text/javascript" src="${config.src}"></script>
  </div>
</body>
</html>`,
    [config, width, height]
  );

  if (dismissed) return null;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: alpha('#ffffff', 0.1),
        bgcolor: alpha('#111318', 0.85),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'relative',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        ...sx,
      }}
      {...other}
    >
      {/* Top Header with Label & Close */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          width: '100%',
          mb: 0.75,
          px: 0.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              opacity: 0.8,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: alpha('#ffffff', 0.55),
            }}
          >
            {label}
          </Typography>
        </Stack>

        {closable && (
          <IconButton
            size="small"
            onClick={() => setDismissed(true)}
            sx={{
              p: 0.25,
              color: alpha('#ffffff', 0.6),
              '&:hover': { color: 'common.white', bgcolor: alpha('#ffffff', 0.1) },
            }}
            aria-label="Dismiss advertisement"
          >
            <Iconify icon="eva:close-fill" width={14} />
          </IconButton>
        )}
      </Stack>

      {/* Sandboxed Secure Iframe */}
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.2)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDocHtml}
          title={`Ad ${config.key}`}
          width={width}
          height={height}
          scrolling="no"
          style={{
            border: 'none',
            overflow: 'hidden',
            display: 'block',
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      </Box>
    </Box>
  );
}

export default AdBanner;
