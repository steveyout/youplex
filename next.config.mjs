const isStaticExport = 'false';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Disable in dev to speed up workflow
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  trailingSlash: false,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    BUILD_STATIC_EXPORT: isStaticExport,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: '**.tmdb.org',
      },
    ],
  },
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/lab': {
      transform: '@mui/lab/{{member}}',
    },
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  ...(isStaticExport === 'true' && {
    output: 'export',
  }),
};

export default withPWA(nextConfig);
