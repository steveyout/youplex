import { paths } from '@/routes/paths';
import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

export const navData = [
  { title: 'Home', path: '/', icon: <Iconify width={22} icon="proicons:home" /> },
  {
    title: 'Movies',
    path: paths.movies,
    icon: <Iconify width={22} icon="fluent:movies-and-tv-20-regular" />,
  },
  {
    title: 'Tv',
    path: paths.tv,
    icon: <Iconify width={22} icon="iconoir:tv" />,
  },
  {
    title: 'Torrents',
    path: paths.torrents,
    icon: <Iconify width={22} icon="arcticons:torrents-csv-android" />,
  },

  {
    title: 'Discord',
    icon: <Iconify width={22} icon="ic:round-discord" />,
    path: paths.discord,
  },
];
