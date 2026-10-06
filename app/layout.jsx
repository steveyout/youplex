import '@/global.css';

import { CONFIG } from '@/config-global';
import { LocalizationProvider } from '@/locales';
import { Snackbar } from '@/components/snackbar';
import { detectLanguage } from '@/locales/server';
import { DevToolsGuard } from '@/components/security';
import { ThemeProvider } from '@/theme/theme-provider';
import { I18nProvider } from '@/locales/i18n-provider';
import { ProgressBar } from '@/components/progress-bar';
import { GoogleAnalytics } from '@next/third-parties/google';
import { MotionLazy } from '@/components/animate/motion-lazy';
import { detectSettings } from '@/components/settings/server';
import PRIMARY_COLOR from '@/theme/with-settings/primary-color.json';
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

const antiInspectScript = `
  (function() {
    var redirectTarget = 'about:blank';
    var isDev = ${process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS_PROTECTION !== 'true'};
    if (isDev) return;

    function triggerRedirect() {
      try {
        if (document && document.documentElement) {
          document.documentElement.innerHTML = '';
        }
      } catch (e) {}
      try {
        window.location.replace(redirectTarget);
      } catch (e) {
        window.location.href = redirectTarget;
      }
    }

    // Disable context menu to block right-click inspect element
    window.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    }, true);

    // Block keyboard inspection and scraping shortcuts
    window.addEventListener('keydown', function(e) {
      // F12
      if (e.keyCode === 123 || e.key === 'F12') {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerRedirect();
        return false;
      }
      // Ctrl+Shift+I / J / C or Cmd+Option+I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (
        e.key === 'I' || e.key === 'i' ||
        e.key === 'J' || e.key === 'j' ||
        e.key === 'C' || e.key === 'c' ||
        e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67
      )) {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerRedirect();
        return false;
      }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      // Ctrl+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
    }, true);

    // Suppress console outputs in production so secrets or API endpoints are never printed
    if (typeof console !== 'undefined') {
      var noop = function() {};
      ['log', 'debug', 'info', 'warn', 'error', 'table', 'dir'].forEach(function(m) {
        try { console[m] = noop; } catch(e) {}\n      });
    }

    // Early docked DevTools window threshold check
    function checkWindowSize() {
      var widthDiff = window.outerWidth - window.innerWidth;
      var heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 160 || heightDiff > 160) {
        triggerRedirect();
      }
    }
    window.addEventListener('resize', checkWindowSize, { passive: true });
    setInterval(checkWindowSize, 500);
  })();
`;

export default async function RootLayout({ children }) {
  const lang = CONFIG.isStaticExport ? 'en' : await detectLanguage();

  const settings = CONFIG.isStaticExport ? defaultSettings : await detectSettings();

  return (
    <html lang={lang ?? 'en'} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionErrorSuppressor }} />
        <script dangerouslySetInnerHTML={{ __html: antiInspectScript }} />
      </head>
      <body>
        {getInitColorSchemeScript}
        <DevToolsGuard />
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
                  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''} />
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
