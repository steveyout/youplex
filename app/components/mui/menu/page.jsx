import { CONFIG } from 'config-global';

import { MenuView } from 'sections/_examples/mui/menu-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Menu | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <MenuView />;
}
