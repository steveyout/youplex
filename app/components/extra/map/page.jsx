import { CONFIG } from 'config-global';

import { MapView } from 'sections/_examples/extra/map-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Map | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <MapView />;
}
