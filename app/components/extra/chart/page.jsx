import { CONFIG } from 'config-global';

import { ChartView } from 'sections/_examples/extra/chart-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Chart | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <ChartView />;
}
