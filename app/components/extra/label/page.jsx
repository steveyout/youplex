import { CONFIG } from 'config-global';

import { LabelView } from 'sections/_examples/extra/label-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Label | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <LabelView />;
}
