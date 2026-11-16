/**
 * Client-safe provider metadata for native player extractors.
 * Exposes all 40 active enabled scrapers from @p-stream/providers in exact priority order (mirrors streamwatch).
 * Uses real/official provider titles and emojis matching streamwatch.
 */

export const PROVIDER_CONFIG = [
  {
    id: 'yp-zoechip-1',
    label: '💎 Zoechip',
    priority: 0,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-zoechip-2',
    label: '🔮 ZoeStream',
    priority: 1,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-bingebang-1',
    label: '💥 BingeBang',
    priority: 2,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-bingebang-2',
    label: '🚀 BangStream',
    priority: 3,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-taroflix-1',
    label: '⭐ Starkio',
    priority: 4,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-taroflix-2',
    label: '🌟 Cipher',
    priority: 5,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinemaos-1',
    label: '🎬 Screenscape',
    priority: 6,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinemaos-2',
    label: '📽️ MovieBox',
    priority: 7,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-aether-1',
    label: '⚡ Aether',
    priority: 8,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-aether-2',
    label: '✨ Aetheris',
    priority: 9,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidlink-1',
    label: '🔗 VidLink',
    priority: 10,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidlink-2',
    label: '🌐 Nexus',
    priority: 11,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cno-1',
    label: '🪐 Titan',
    priority: 12,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cno-2',
    label: '🌌 Atlas',
    priority: 13,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinejoy-1',
    label: '🎆 Aurora',
    priority: 14,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinejoy-2',
    label: '🎇 Celestial',
    priority: 15,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-oneshows-1',
    label: '💫 Nova',
    priority: 16,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-oneshows-2',
    label: '🌠 Zenith',
    priority: 17,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinecat-1',
    label: '🐱 Shadow',
    priority: 18,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-cinecat-2',
    label: '🐾 Lynx',
    priority: 19,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-1',
    label: '▶️ Midnight',
    priority: 20,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-pressplayz-2',
    label: '⚡ Quantum',
    priority: 21,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-1',
    label: '🏹 Apex',
    priority: 22,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-arrowtv-2',
    label: '🎯 Valkyrie',
    priority: 23,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-1',
    label: '🌊 Nebula',
    priority: 24,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-rivestream-2',
    label: '💧 Arcane',
    priority: 25,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-kaizoku-1',
    label: '🏴‍☠️ Vortex',
    priority: 26,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-kaizoku-2',
    label: '⚔️ Ronin',
    priority: 27,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-chillflix-1',
    label: '❄️ Frost',
    priority: 28,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-chillflix-2',
    label: '🧊 Solstice',
    priority: 29,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-zetmoon-1',
    label: '🌙 Eclipse',
    priority: 30,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-zetmoon-2',
    label: '🌕 Lunar',
    priority: 31,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidcore-1',
    label: '🔋 Quasar',
    priority: 32,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'yp-vidcore-2',
    label: '⚙️ Hyperion',
    priority: 33,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'icefy',
    label: 'Icefy',
    priority: 34,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'tugaflix',
    label: 'Tugaflix',
    priority: 35,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fsonline',
    label: 'FSOnline',
    priority: 36,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'animeflv',
    label: 'AnimeFLV',
    priority: 37,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'cuevana3',
    label: 'Cuevana3',
    priority: 38,
    supportedContent: ['movie', 'tv'],
  },
  {
    id: 'fullhdfilmizle',
    label: 'FullHDFilmizle (Turkish)',
    priority: 39,
    supportedContent: ['movie'],
  },
];

export const CLIENT_SCRAPER_CONFIG = PROVIDER_CONFIG.map(({ id, label, supportedContent }) => ({
  id,
  label,
  supportedContent,
}));
