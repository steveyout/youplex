'use client';

import { LazyMotion } from 'framer-motion';

const loadFeaturesAsync = async () => import('./features').then((res) => res.default);

// ----------------------------------------------------------------------

export function MotionLazy({ children }) {
  return (
    <LazyMotion strict features={loadFeaturesAsync}>
      {children}
    </LazyMotion>
  );
}
