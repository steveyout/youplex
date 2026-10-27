import packageJson from './package.json';
import { isAdsEnabled, isSitewideAdsEnabled, isPlayerAdsEnabled } from './components/ads/ad-config';

// ----------------------------------------------------------------------

export const CONFIG = {
  site: {
    name: process.env.APP_NAME ?? 'Youplex',
    serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
    assetURL: process.env.NEXT_PUBLIC_ASSET_URL ?? '',
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
    version: packageJson.version,
    syncBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://backend.pstream.site',
  },
  ads: {
    enabled: isAdsEnabled,
    sitewide: isSitewideAdsEnabled,
    player: isPlayerAdsEnabled,
  },
  isStaticExport: JSON.parse(`${process.env.BUILD_STATIC_EXPORT}`),
};
