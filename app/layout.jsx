import '@/global.css';

import Script from 'next/script'
import { CONFIG } from '@/config-global';
import PRIMARY_COLOR from '@/theme/with-settings/primary-color.json';
import { LocalizationProvider } from '@/locales';
import { Snackbar } from '@/components/snackbar';
import { detectLanguage } from '@/locales/server';
import { I18nProvider } from '@/locales/i18n-provider';
import { ThemeProvider } from '@/theme/theme-provider';
import { ProgressBar } from '@/components/progress-bar';
import { GoogleAnalytics } from '@next/third-parties/google';
import { MotionLazy } from '@/components/animate/motion-lazy';
import { detectSettings } from '@/components/settings/server';
import { getInitColorSchemeScript } from '@/theme/color-scheme-script';
import { SettingsDrawer, defaultSettings, SettingsProvider } from '@/components/settings';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Youplex- Stream Movies',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Youplex',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: PRIMARY_COLOR.red.main,
};

const extensionErrorSuppressor = `
  (function() {
    function isExt(ev) {
      try {
        var fn = (ev && ev.filename) || '';
        var stack = (ev && ev.error && ev.error.stack) || (ev && ev.reason && (ev.reason.stack || ev.reason.message)) || '';
        var msg = (ev && ev.message) || (ev && ev.reason && ev.reason.message) || '';
        return (
          fn.indexOf('chrome-extension://') !== -1 ||
          fn.indexOf('moz-extension://') !== -1 ||
          stack.indexOf('chrome-extension://') !== -1 ||
          stack.indexOf('moz-extension://') !== -1 ||
          msg.indexOf('M_ID') !== -1 ||
          stack.indexOf('M_ID') !== -1 ||
          msg.indexOf('channel secret') !== -1 ||
          msg.indexOf('broadcast system') !== -1
        );
      } catch (e) {
        return false;
      }
    }
    window.addEventListener('error', function(e) {
      if (isExt(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    window.addEventListener('unhandledrejection', function(e) {
      if (isExt(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  })();
`;

export default async function RootLayout({ children }) {
  const lang = CONFIG.isStaticExport ? 'en' : await detectLanguage();

  const settings = CONFIG.isStaticExport ? defaultSettings : await detectSettings();

  return (
    <html lang={lang ?? 'en'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionErrorSuppressor }} />
      </head>
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
                    {/* Google tag (gtag.js) */}
                    <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""} />
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
