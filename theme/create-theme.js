import { experimental_extendTheme as extendTheme } from '@mui/material/styles';

import { setFont } from './styles/utils';
import { overridesTheme } from './overrides-theme';
import { shadows, typography, components, colorSchemes, customShadows } from './core';
import { updateCoreWithSettings, updateComponentsWithSettings } from './with-settings/update-theme';

// ----------------------------------------------------------------------

export function createTheme(localeComponents, settings) {
  const initialTheme = {
    colorSchemes,
    shadows: shadows(settings.colorScheme),
    customShadows: customShadows(settings.colorScheme),
    direction: settings.direction,
    shape: { borderRadius: 8 },
    components,
    typography: {
      ...typography,
      fontFamily: setFont(settings.fontFamily),
    },
    cssVarPrefix: '',
    shouldSkipGeneratingVar,
  };

  /**
   * 1.Update values from settings before creating theme.
   */
  const updateTheme = updateCoreWithSettings(initialTheme, settings);

  /**
   * 2.Create theme + add locale + update component with settings.
   */
  const theme = extendTheme(
    guardReactElements(updateTheme),
    guardReactElements(localeComponents),
    guardReactElements(updateComponentsWithSettings(settings)),
    guardReactElements(overridesTheme)
  );

  return theme;
}

function guardReactElements(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (typeof value.$$typeof === 'symbol') {
    const raw = { ...value };
    Object.defineProperty(raw, Symbol.iterator, { value: undefined });
    return raw;
  }

  const keys = Array.isArray(value) ? value.map((_, index) => index) : Object.keys(value);
  const output = Array.isArray(value) ? [] : {};
  let changed = false;

  keys.forEach((key) => {
    const next = guardReactElements(value[key]);
    output[key] = next;
    changed = changed || next !== value[key];
  });

  return changed ? output : value;
}

// ----------------------------------------------------------------------

function shouldSkipGeneratingVar(keys, value) {
  const skipGlobalKeys = [
    'mixins',
    'overlays',
    'direction',
    'breakpoints',
    'cssVarPrefix',
    'unstable_sxConfig',
    'typography',
    // 'transitions',
  ];

  const skipPaletteKeys = {
    global: ['tonalOffset', 'dividerChannel', 'contrastThreshold'],
    grey: ['A100', 'A200', 'A400', 'A700'],
    text: ['icon'],
  };

  const isPaletteKey = keys[0] === 'palette';

  if (isPaletteKey) {
    const paletteType = keys[1];
    const skipKeys = skipPaletteKeys[paletteType] || skipPaletteKeys.global;

    return keys.some((key) => skipKeys?.includes(key));
  }

  return keys.some((key) => skipGlobalKeys?.includes(key));
}

/**
* createTheme without @settings and @locale components.
*
 ```jsx
export function createTheme(): Theme {
  const initialTheme = {
    colorSchemes,
    shadows: shadows('light'),
    customShadows: customShadows('light'),
    shape: { borderRadius: 8 },
    components,
    typography,
    cssVarPrefix: '',
    shouldSkipGeneratingVar,
  };

  const theme = extendTheme(initialTheme, overridesTheme);

  return theme;
}
 ```
*/
