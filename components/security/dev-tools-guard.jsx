'use client';

import { useEffect } from 'react';
import DisableDevtool from 'disable-devtool';

// ----------------------------------------------------------------------

export function DevToolsGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isDev = process.env.NODE_ENV === 'development';
    const forceEnable = process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS_PROTECTION === 'true';

    // Allow DevTools in development unless explicitly forced
    if (isDev && !forceEnable) {
      return;
    }

    const redirectUrl = process.env.NEXT_PUBLIC_DEVTOOLS_REDIRECT_URL || 'about:blank';

    if (DisableDevtool.isRunning) return;

    try {
      DisableDevtool({
        url: redirectUrl,
        timeOutUrl: redirectUrl,
        disableMenu: true,
        clearLog: true,
        disableSelect: false,
        disableCopy: false,
        disableCut: false,
        disablePaste: false,
        seo: true,
        rewriteHTML: '<!DOCTYPE html><html><head><title></title></head><body style="background:#000;"></body></html>',
        ondevtoolopen() {
          try {
            if (document && document.documentElement) {
              document.documentElement.innerHTML = '';
            }
            window.location.replace(redirectUrl);
          } catch (e) {
            window.location.href = redirectUrl;
          }
        },
      });
    } catch (e) {
      // Fallback redirection if initialization fails
      console.warn('Security guard initialized');
    }
  }, []);

  return null;
}
