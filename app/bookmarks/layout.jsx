import { MainLayout } from '@/layouts/main';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'My Bookmarks & Watchlist - Youplex',
  description: 'Your saved movies and TV shows watchlist on Youplex.',
};

export default function Layout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
