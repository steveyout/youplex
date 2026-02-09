import { CONFIG } from 'config-global';

import { ComingSoonView } from 'sections/coming-soon/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Coming soon - ${CONFIG.site.name}` };

export default function Page() {
  return <ComingSoonView />;
}
