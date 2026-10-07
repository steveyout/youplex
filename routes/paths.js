import { paramCase } from '@/utils/change-case';

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  movies: '/movies',
  tv: '/tv',
  liveTv: '/live-tv',
  search: '/search',
  bookmarks: '/bookmarks',
  history: '/history',
  torrents: 'https://torrents.youplex.site/',
  discord: 'https://discord.gg/5eWu9Vz6tQ',
  telegram: 'https://t.me/youplexannouncments',
  dashboard: {
    root: '/movies',
    post: {
      root: '/movies',
      details: (title) => paths.movies,
      edit: (title) => paths.movies,
    },
  },
  post: {
    root: '/movies',
    details: (type, id, title = 'video') => paths.watch.details(type, id, title),
  },
  watch: {
    root: '/watch',
    play: (type, id, title = 'video', sn = 1, ep = 1) => {
      const base = '/watch/' + type + '/' + paramCase(title) + '/play?id=' + id;
      return type === 'tv' ? base + '&season=' + sn + '&episode=' + ep : base;
    },
    details: (type, id, title = 'video', sn = 1, ep = 1) => {
      const base = `/watch/${type}/${paramCase(title)}?id=${id}`;
      // For TV shows, we append season and episode to the query string
      return type === 'tv' ? `${base}&sn=${sn}&ep=${ep}` : base;
    },
  },
};
