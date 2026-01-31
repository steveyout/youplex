'use client';

import { useRef, useMemo } from 'react';
import { useScroll } from 'framer-motion';

// ----------------------------------------------------------------------

export function useScrollProgress(target = 'document') {
  const elementRef = useRef(null);

  const options = { container: elementRef };

  const { scrollYProgress, scrollXProgress } = useScroll(
    target === 'container' ? options : undefined
  );

  const memoizedValue = useMemo(
    () => ({ elementRef, scrollXProgress, scrollYProgress }),
    [elementRef, scrollXProgress, scrollYProgress]
  );

  return memoizedValue;
}
