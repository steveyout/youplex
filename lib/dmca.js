import BLOCKED_URLS from '../config/dmca-blocked.json';

/**
 * Checks if a given item (by ID, pathname, or title slug) is blocked under DMCA.
 *
 * @param {Object} options
 * @param {string|number} [options.id] - The media ID (TMDB ID)
 * @param {string} [options.pathname] - The request URL pathname (e.g. /watch/movie/spider-man-brand-new-day)
 * @param {string} [options.title] - The title slug (e.g. spider-man-brand-new-day)
 * @param {string} [options.type] - Media type ('movie' or 'tv')
 * @returns {boolean}
 */
export function isContentDmcaBlocked({ id, pathname, title, type } = {}) {
  const currentId = id != null ? String(id).trim() : null;
  const currentPath = pathname ? pathname.replace(/\/+$/, '').toLowerCase() : null;
  const currentTitleSlug = title ? String(title).toLowerCase().trim() : null;

  return BLOCKED_URLS.some((item) => {
    // 1. Check ID match
    if (item.id && currentId && String(item.id) === currentId) {
      return true;
    }

    // 2. Check Pathname match (exact or subpath like /play)
    if (item.pathname) {
      const blockedPath = item.pathname.replace(/\/+$/, '').toLowerCase();

      if (currentPath) {
        if (currentPath === blockedPath || currentPath.startsWith(`${blockedPath}/`)) {
          return true;
        }
      }

      // 3. Check title slug against the last segment of the blocked pathname
      const blockedSegments = blockedPath.split('/').filter(Boolean);
      const blockedType = blockedSegments[1]; // 'movie' or 'tv'
      const blockedSlug = blockedSegments[blockedSegments.length - 1];

      if (currentTitleSlug && blockedSlug) {
        if (currentTitleSlug === blockedSlug) {
          if (!type || !blockedType || type.toLowerCase() === blockedType) {
            return true;
          }
        }
      }
    }

    return false;
  });
}

export { BLOCKED_URLS };
export default isContentDmcaBlocked;
