'use client';

import { defaultSettings } from '@/components/settings';

import { getInitColorSchemeScript as _getInitColorSchemeScript } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const schemeConfig = {
  modeStorageKey: 'theme-mode',
  defaultMode: defaultSettings.colorScheme,
};

export const getInitColorSchemeScript = _getInitColorSchemeScript(schemeConfig);
