import { CONFIG } from 'config-global';

import { TransferListView } from 'sections/_examples/mui/transfer-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Transfer list | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <TransferListView />;
}
