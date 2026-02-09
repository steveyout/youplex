import { CONFIG } from 'config-global';

import { ImageView } from 'sections/_examples/extra/image-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Image | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <ImageView />;
}
