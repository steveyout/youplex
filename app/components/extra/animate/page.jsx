import { CONFIG } from 'config-global';

import { AnimateView } from 'sections/_examples/extra/animate-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Animate | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <AnimateView />;
}
