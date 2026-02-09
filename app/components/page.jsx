import { CONFIG } from 'config-global';

import { ComponentsView } from 'sections/_examples/view';

// ----------------------------------------------------------------------

export const metadata = { title: `All components | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <ComponentsView />;
}
