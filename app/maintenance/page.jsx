import { CONFIG } from 'config-global';

import { MaintenanceView } from 'sections/maintenance/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Maintenance - ${CONFIG.site.name}` };

export default function Page() {
  return <MaintenanceView />;
}
