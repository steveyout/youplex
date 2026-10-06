'use client';

import './styles.css';

import NProgress from 'nprogress';
import { Suspense, useEffect } from 'react';

import { useRouter, usePathname, useSearchParams } from 'routes/hooks';

// ----------------------------------------------------------------------

export function ProgressBar() {
  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const handleAnchorClick = (event) => {
      const targetUrl = event.currentTarget.href;

      const currentUrl = window.location.href;

      if (targetUrl !== currentUrl) {
        NProgress.start();
      }
    };

    const handleMutation = () => {
      const anchorElements = document.querySelectorAll('a[href]');

      const filteredAnchors = Array.from(anchorElements).filter((element) => {
        const rel = element.getAttribute('rel');

        const href = element.getAttribute('href');

        const target = element.getAttribute('target');

        return href?.startsWith('/') && target !== '_blank' && rel !== 'noopener';
      });

      filteredAnchors.forEach((anchor) => anchor.addEventListener('click', handleAnchorClick));
    };

    const mutationObserver = new MutationObserver(handleMutation);

    mutationObserver.observe(document, { childList: true, subtree: true });

    window.history.pushState = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray) => {
        NProgress.done();
        return target.apply(thisArg, argArray);
      },
    });
  });

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
