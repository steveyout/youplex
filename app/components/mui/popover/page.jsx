import { CONFIG } from 'config-global';

import { PopoverView } from 'sections/_examples/mui/popover-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Popover | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <PopoverView />;
}
