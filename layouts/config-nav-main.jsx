import { paths } from '@/routes/paths';
import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'Home',
    path: '/',
    icon: <Iconify width={22} icon="proicons:home" />,
  },
  {
    title: 'Search',
    path: paths.search,
    icon: <Iconify width={22} icon="ic:round-search" />,
  },
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
    title: 'Live TV',
    path: paths.liveTv,
    icon: <Iconify width={22} icon="solar:tv-bold-duotone" />,
  },
  {
    title: 'Library',
    path: paths.bookmarks,
    icon: <Iconify width={22} icon="solar:bookmark-square-minimalistic-bold-duotone" />,
    children: [
      {
        subheader: '',
        items: [
          {
            title: 'Bookmarks',
            path: paths.bookmarks,
            icon: <Iconify width={20} icon="solar:bookmark-bold-duotone" />,
          },
          {
            title: 'Watch History',
            path: paths.history,
            icon: <Iconify width={20} icon="solar:history-bold-duotone" />,
          },
        ],
      },
    ],
  },
  {
    title: 'Community',
    path: paths.discord,
    icon: <Iconify width={22} icon="solar:users-group-two-rounded-bold-duotone" />,
    children: [
      {
        subheader: '',
        items: [
          {
            title: 'Torrents',
            path: paths.torrents,
            icon: <Iconify width={20} icon="arcticons:torrents-csv-android" />,
          },
          {
            title: 'Discord',
            path: paths.discord,
            icon: <Iconify width={20} icon="ic:round-discord" />,
          },
        ],
      },
    ],
  },
];
