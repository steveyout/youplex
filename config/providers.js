// config/providers.js

export const providers = [
  {
    id: 'cinemaos',
    name: 'Server 1 (CinemaOS)',
    baseUrl: 'https://cinemaos.tech',
    enabled: true,
  },
  {
    id: 'vidking',
    name: 'Server 2 (VidKing Premium)',
    baseUrl: 'https://www.vidking.net',
    enabled: true,
  },
  {
    id: 'vidlink',
    name: 'Server 3 (VidLink Pro)',
    baseUrl: 'https://vidlink.pro',
    enabled: true,
  },
  {
    id: 'vidsrc_to',
    name: 'Server 4 (VIP)',
    baseUrl: 'https://vidsrc.to/embed',
    enabled: true,
  },
  {
    id: 'vidnest',
    name: 'Server 5 (VidNest)',
    baseUrl: 'https://vidnest.fun',
    enabled: true,
  },
  {
    id: 'vidfast',
    name: 'Server 6 (VidFast)',
    baseUrl: 'https://vidfast.net',
    enabled: true,
  },
  {
    id: 'videasy',
    name: 'Server 7 (VidEasy)',
    baseUrl: 'https://player.videasy.net',
    enabled: true,
  },
  {
    id: 'vidsrc_me',
    name: 'Server 8 (Vidsrc Me)',
    baseUrl: 'https://vsembed.ru/embed',
    enabled: true,
  },
  {
    id: 'vidup',
    name: 'Server 9 (Vidup)',
    baseUrl: 'https://vidup.to',
    enabled: true,
  },
  {
    id: 'rivestream',
    name: 'Server 10 (Rive)',
    baseUrl: 'https://rivestream.org/embed',
    enabled: true,
  },
  {
    id: 'vidcore',
    name: 'Server 11 (VidCore)',
    baseUrl: 'https://vidcore.org',
    enabled: true,
  },
];

export const DEFAULT_PROVIDER_ID = 'cinemaos';

/**
 * Helper to build the URL based on media type
 * Supports both Movies and TV Shows
 */
export const getEmbedUrl = (
  providerId,
  type,
  tmdbId,
  season = 1,
  episode = 1,
  progressSeconds = 0
) => {
  const selected = providers.find((p) => p.id === providerId);
  if (!selected) return '';

  if (selected.id === 'cinemaos') {
    return type === 'movie'
      ? `${selected.baseUrl}/player/${tmdbId}`
      : `${selected.baseUrl}/player/${tmdbId}/${season}/${episode}`;
  }

  if (selected.id === 'vidking') {
    let url = '';
    if (type === 'movie') {
      url = `${selected.baseUrl}/embed/movie/${tmdbId}?color=e50914`;
    } else {
      url = `${selected.baseUrl}/embed/tv/${tmdbId}/${season}/${episode}?color=e50914&nextEpisode=true&episodeSelector=true`;
    }
    if (progressSeconds > 0) {
      url += `&progress=${progressSeconds}`;
    }
    return url;
  }

  if (selected.id === 'vidcore') {
    return type === 'movie'
      ? `${selected.baseUrl}/embed/movie/${tmdbId}`
      : `${selected.baseUrl}/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  // Fallbacks for other servers
  if (type === 'movie') {
    return `${selected.baseUrl}/movie/${tmdbId}`;
  }
  // For TV shows
  return `${selected.baseUrl}/tv/${tmdbId}/${season}/${episode}`;
};
