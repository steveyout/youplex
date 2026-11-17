'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import { useTheme, useColorScheme } from '@mui/material/styles';

import COLORS from 'theme/core/colors.json';
import { paper, varAlpha } from 'theme/styles';
import { defaultFont } from 'theme/core/typography';
import PRIMARY_COLOR from 'theme/with-settings/primary-color.json';

import { paths } from '@/routes/paths';
import { Iconify } from '../../iconify';
import { BaseOption } from './base-option';
import { NavOptions } from './nav-options';
import { Scrollbar } from '../../scrollbar';
import { FontOptions } from './font-options';
import { useSettingsContext } from '../context';
import { PresetsOptions } from './presets-options';
import { defaultSettings } from '../config-settings';
import { FullScreenButton } from './fullscreen-button';

// ----------------------------------------------------------------------

export function SettingsDrawer({
  sx,
  hideFont,
  hideCompact,
  hidePresets,
  hideNavColor,
  hideContrast,
  hideNavLayout,
  hideDirection,
  hideColorScheme,
}) {
  const theme = useTheme();

  const settings = useSettingsContext();

  const { mode, setMode } = useColorScheme();

  const renderHead = (
    <Box display="flex" alignItems="center" sx={{ py: 2, pr: 1, pl: 2.5 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Settings
      </Typography>

      <FullScreenButton />

      <Tooltip title="Reset">
        <IconButton
          onClick={() => {
            settings.onReset();
            setMode(defaultSettings.colorScheme);
          }}
        >
          <Badge color="error" variant="dot" invisible={!settings.canReset}>
            <Iconify icon="solar:restart-bold" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Tooltip title="Close">
        <IconButton onClick={settings.onCloseDrawer}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const renderMode = (
    <BaseOption
      label="Dark mode"
      icon="moon"
      selected={settings.colorScheme === 'dark'}
      onClick={() => {
        settings.onUpdateField('colorScheme', mode === 'light' ? 'dark' : 'light');
        setMode(mode === 'light' ? 'dark' : 'light');
      }}
    />
  );

  const renderContrast = (
    <BaseOption
      label="Contrast"
      icon="contrast"
      selected={settings.contrast === 'hight'}
      onClick={() =>
        settings.onUpdateField('contrast', settings.contrast === 'default' ? 'hight' : 'default')
      }
    />
  );

  const renderRTL = (
    <BaseOption
      label="Right to left"
      icon="align-right"
      selected={settings.direction === 'rtl'}
      onClick={() =>
        settings.onUpdateField('direction', settings.direction === 'ltr' ? 'rtl' : 'ltr')
      }
    />
  );

  const renderCompact = (
    <BaseOption
      tooltip="Dashboard only and available at large resolutions > 1600px (xl)"
      label="Compact"
      icon="autofit-width"
      selected={settings.compactLayout}
      onClick={() => settings.onUpdateField('compactLayout', !settings.compactLayout)}
    />
  );

  const renderPresets = (
    <PresetsOptions
      value={settings.primaryColor}
      onClickOption={(newValue) => settings.onUpdateField('primaryColor', newValue)}
      options={[
        { name: 'default', value: COLORS.primary.main },
        { name: 'cyan', value: PRIMARY_COLOR.cyan.main },
        { name: 'purple', value: PRIMARY_COLOR.purple.main },
        { name: 'blue', value: PRIMARY_COLOR.blue.main },
        { name: 'orange', value: PRIMARY_COLOR.orange.main },
        { name: 'red', value: PRIMARY_COLOR.red.main },
      ]}
    />
  );

  const renderNav = (
    <NavOptions
      value={{
        color: settings.navColor,
        layout: settings.navLayout,
      }}
      onClickOption={{
        color: (newValue) => settings.onUpdateField('navColor', newValue),
        layout: (newValue) => settings.onUpdateField('navLayout', newValue),
      }}
      options={{
        colors: ['integrate', 'apparent'],
        layouts: ['vertical', 'horizontal', 'mini'],
      }}
      hideNavColor={hideNavColor}
      hideNavLayout={hideNavLayout}
    />
  );

  const renderFont = (
    <FontOptions
      value={settings.fontFamily}
      onClickOption={(newValue) => settings.onUpdateField('fontFamily', newValue)}
      options={['Inter', 'DM Sans', 'Nunito Sans', 'Public Sans']}
    />
  );

  return (
    <Drawer
      anchor="right"
      open={settings.openDrawer}
      onClose={settings.onCloseDrawer}
      slotProps={{ backdrop: { invisible: true } }}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          ...paper({
            theme,
            color: varAlpha(theme.vars.palette.background.defaultChannel, 0.9),
          }),
          width: 360,
          ...sx,
        },
      }}
    >
      {renderHead}

      <Scrollbar>
        <Stack spacing={4} sx={{ px: 2.5, pb: 5 }}>
          <Box gap={2} display="grid" gridTemplateColumns="repeat(2, 1fr)">
            {!hideColorScheme && renderMode}
            {!hideContrast && renderContrast}
            {!hideDirection && renderRTL}
            {!hideCompact && renderCompact}
          </Box>
          {!(hideNavLayout && hideNavColor) && renderNav}
          {!hidePresets && renderPresets}
          {!hideFont && renderFont}

          {/* Android App Download Banner */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (t) => varAlpha(t.vars.palette.primary.mainChannel, 0.08),
              border: (t) => `1px dashed ${varAlpha(t.vars.palette.primary.mainChannel, 0.3)}`,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                mx: 'auto',
                mb: 1,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (t) => varAlpha(t.vars.palette.primary.mainChannel, 0.16),
                color: 'primary.main',
              }}
            >
              <Iconify icon="ant-design:android-filled" width={26} sx={{ color: '#3DDC84' }} />
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
              Youplex for Android
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
              Download the official APK for Android TV and mobile devices
            </Typography>
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="primary"
              component="a"
              href={paths.app}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Iconify icon="solar:download-square-bold" />}
            >
              Download APK
            </Button>
          </Box>
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}
