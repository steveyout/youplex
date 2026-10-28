'use client';

import { useEffect } from 'react';
import DisableDevtool from 'disable-devtool';

// ----------------------------------------------------------------------

export function DevToolsGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // DevTools protection is strictly opt-in and disabled by default
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS_PROTECTION === 'true';
    if (!isEnabled) {
      return;
    }

    // Never activate inside an iframe or on embed player routes
    const isIframe = window.self !== window.top;
    const isEmbedRoute = window.location.pathname.startsWith('/embed');
    if (isIframe || isEmbedRoute) {
      return;
    }

    const redirectUrl = process.env.NEXT_PUBLIC_DEVTOOLS_REDIRECT_URL || 'about:blank';

    if (DisableDevtool.isRunning) return;

    try {
      DisableDevtool({
        url: redirectUrl,
        timeOutUrl: redirectUrl,
        disableMenu: true,
        clearLog: false,
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
      console.warn('Security guard initialized');
    }
  }, []);

  return null;
}
