import { CONFIG } from 'config-global';

import { TreeView } from 'sections/_examples/mui/tree-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Tree view | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <TreeView />;
}
