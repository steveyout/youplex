import '@/global.css';

import { CONFIG } from '@/config-global';
import { primary } from '@/theme/core/palette';
import { LocalizationProvider } from '@/locales';
import { Snackbar } from '@/components/snackbar';
import { detectLanguage } from '@/locales/server';
import { I18nProvider } from '@/locales/i18n-provider';
import { ThemeProvider } from '@/theme/theme-provider';
import { ProgressBar } from '@/components/progress-bar';
import { MotionLazy } from '@/components/animate/motion-lazy';
import { detectSettings } from '@/components/settings/server';
import { getInitColorSchemeScript } from '@/theme/color-scheme-script';
import { SettingsDrawer, defaultSettings, SettingsProvider } from '@/components/settings';



// ----------------------------------------------------------------------


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primary.main,
};

export default async function RootLayout({ children }) {
  const lang = CONFIG.isStaticExport ? 'en' : await detectLanguage();

  const settings = CONFIG.isStaticExport ? defaultSettings : await detectSettings();

  return (
    <html lang={lang ?? 'en'} suppressHydrationWarning>
      <body>
        {getInitColorSchemeScript}

        <I18nProvider lang={CONFIG.isStaticExport ? undefined : lang}>
          <LocalizationProvider>
              <SettingsProvider
                settings={settings}
                caches={CONFIG.isStaticExport ? 'localStorage' : 'cookie'}
              >
                <ThemeProvider>
                  <MotionLazy>
                      <Snackbar />
                      <ProgressBar />
                      <SettingsDrawer />
                      {children}
                  </MotionLazy>
                </ThemeProvider>
              </SettingsProvider>
          </LocalizationProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
