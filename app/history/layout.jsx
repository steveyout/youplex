import { MainLayout } from '@/layouts/main';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Watch History - Youplex',
  description: 'Your watch history and continued watching on Youplex.',
};

export default function Layout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
