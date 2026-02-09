import { CONFIG } from 'config-global';

import { TabsView } from 'sections/_examples/mui/tabs-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Tabs | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <TabsView />;
}
