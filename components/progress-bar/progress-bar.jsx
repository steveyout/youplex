'use client';

import './styles.css';

import NProgress from 'nprogress';
import { Suspense, useEffect } from 'react';

import { useRouter, usePathname, useSearchParams } from 'routes/hooks';

// ----------------------------------------------------------------------

export function ProgressBar() {
  useEffect(() => {
    NProgress.configure({
      showSpinner: true,
      minimum: 0.12,
      trickleSpeed: 200,
    });

    const handleDocumentClick = (event) => {
      // Find closest anchor tag
      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      const rel = anchor.getAttribute('rel');

      // Only handle internal relative page routes
      if (
        href?.startsWith('/') &&
        !href.startsWith('//') &&
        target !== '_blank' &&
        rel !== 'noopener' &&
        !href.startsWith('/#')
      ) {
        const targetUrl = anchor.href;
        const currentUrl = window.location.href;

        if (targetUrl !== currentUrl && !event.defaultPrevented) {
          NProgress.start();
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true, passive: true });

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      NProgress.done();
      return originalPushState.apply(this, args);
    };

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      window.history.pushState = originalPushState;
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <NProgressDone />
    </Suspense>
  );
}

// ----------------------------------------------------------------------

function NProgressDone() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();

    // Ensure route navigation scrolls window directly to top
    if (typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [pathname, router, searchParams]);

  return null;
}
