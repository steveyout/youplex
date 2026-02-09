import { CONFIG } from 'config-global';

import { ShadowsView } from 'sections/_examples/foundation/shadows-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Shadows | Foundations - ${CONFIG.site.name}` };

export default function Page() {
  return <ShadowsView />;
}
