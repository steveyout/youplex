import { CONFIG } from 'config-global';

import { UtilitiesView } from 'sections/_examples/extra/utilities-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Utilities | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <UtilitiesView />;
}
