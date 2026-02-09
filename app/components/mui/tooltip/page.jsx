import { CONFIG } from 'config-global';

import { TooltipView } from 'sections/_examples/mui/tooltip-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Tooltip | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <TooltipView />;
}
