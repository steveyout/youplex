// ----------------------------------------------------------------------
// Ads Feature Flags & Configuration
// ----------------------------------------------------------------------

/**
 * Checks whether ads are globally enabled across the site and player.
 * Set NEXT_PUBLIC_DISABLE_ADS=true or NEXT_PUBLIC_ENABLE_ADS=false in .env to disable all ads.
 */
export function isAdsEnabled() {
  if (
    process.env.NEXT_PUBLIC_DISABLE_ADS === 'true' ||
    process.env.DISABLE_ADS === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_ADS === 'false' ||
    process.env.ENABLE_ADS === 'false'
  ) {
    return false;
  }
  return true;
}

/**
 * Checks whether sitewide banner ads (e.g. floating skyscrapers, banner blocks) are enabled.
 * Set NEXT_PUBLIC_DISABLE_SITEWIDE_ADS=true or NEXT_PUBLIC_ENABLE_SITEWIDE_ADS=false in .env.
 */
export function isSitewideAdsEnabled() {
  if (!isAdsEnabled()) return false;
  if (
    process.env.NEXT_PUBLIC_DISABLE_SITEWIDE_ADS === 'true' ||
    process.env.DISABLE_SITEWIDE_ADS === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_SITEWIDE_ADS === 'false' ||
    process.env.ENABLE_SITEWIDE_ADS === 'false'
  ) {
    return false;
  }
  return true;
}

/**
 * Checks whether player & embed ads (e.g. popunders, player sponsor scripts) are enabled.
 * Set NEXT_PUBLIC_DISABLE_PLAYER_ADS=true or NEXT_PUBLIC_ENABLE_PLAYER_ADS=false in .env.
 */
export function isPlayerAdsEnabled() {
  if (!isAdsEnabled()) return false;
  if (
    process.env.NEXT_PUBLIC_DISABLE_PLAYER_ADS === 'true' ||
    process.env.DISABLE_PLAYER_ADS === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_PLAYER_ADS === 'false' ||
    process.env.ENABLE_PLAYER_ADS === 'false'
  ) {
    return false;
  }
  return true;
}
