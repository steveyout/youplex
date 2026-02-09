import { CONFIG } from 'config-global';

import { LightboxView } from 'sections/_examples/extra/lightbox-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Lightbox | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <LightboxView />;
}
