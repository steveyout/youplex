'use client';

import { useEffect } from 'react';

// ----------------------------------------------------------------------

const HALLOWEEN_CLASSES = [
  'halloween',
  'halloween-screen-left-top',
  'halloween-screen-right-bottom',
  'halloween-eyes',
  'halloween-witches',
  'halloween-spider-drop',
  'halloween-tombstones',
];

export function Halloween() {
  useEffect(() => {
    let isMounted = true;

    // Dynamically import halloween.js strictly on the client
    import('halloween.js')
      .then((module) => {
        if (!isMounted) return;

        // Ensure halloween classes are present on body
        document.body.classList.add(...HALLOWEEN_CLASSES);

        // Trigger sync if exported
        const syncFn = module.default || module.halloween;
        if (typeof syncFn === 'function') {
          syncFn();
        }
      })
      .catch((error) => {
        console.warn('Failed to load halloween.js:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
