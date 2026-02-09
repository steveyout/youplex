import { SimpleLayout } from 'layouts/simple';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  return <SimpleLayout content={{ compact: true }}>{children}</SimpleLayout>;
}
