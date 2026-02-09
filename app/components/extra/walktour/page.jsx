import { CONFIG } from 'config-global';

import { WalktourView } from 'sections/_examples/extra/walktour-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Walktour | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <WalktourView />;
}
