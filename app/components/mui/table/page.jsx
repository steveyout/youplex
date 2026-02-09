import { CONFIG } from 'config-global';

import { TableView } from 'sections/_examples/mui/table-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Table | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <TableView />;
}
