// config/providers.js

export const providers = [
  {
    id: 'vidsrc',
    name: 'VidSrc',
    baseUrl: 'https://vidsrc.me/embed',
    enabled: true,
  },
  {
    id: 'vidsrc_xyz',
    name: 'VidSrc.xyz',
    baseUrl: 'https://vidsrc.xyz/embed',
    enabled: true,
  },
  {
    id: '2embed',
    name: '2Embed',
    baseUrl: 'https://www.2embed.cc/embed',
    enabled: true,
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    baseUrl: 'https://multiembed.mov/directstream.php',
    enabled: true,
  },
];

export const DEFAULT_PROVIDER_ID = 'vidsrc';

/**
 * Helper to build the URL based on media type
 * Supports both Movies and TV Shows
 */
export const getEmbedUrl = (providerId, type, tmdbId, season = 1, episode = 1) => {
  const selected = providers.find((p) => p.id === providerId);
  if (!selected) return '';

  if (type === 'movie') {
    return `${selected.baseUrl}/movie?tmdb=${tmdbId}`;
  } else {
    // For TV shows, we append season and episode
    return `${selected.baseUrl}/tv?tmdb=${tmdbId}&sea=${season}&epi=${episode}`;
  }
};
