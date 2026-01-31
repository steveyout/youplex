import { SimpleLayout } from 'src/layouts/simple';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  return <SimpleLayout content={{ compact: true }}>{children}</SimpleLayout>;
}
