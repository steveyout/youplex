import { CONFIG } from 'config-global';

import { ListView } from 'sections/_examples/mui/list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `List | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <ListView />;
}
