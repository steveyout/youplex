import { CONFIG } from 'config-global';

import { SwitchView } from 'sections/_examples/mui/switch-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Switch | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <SwitchView />;
}
