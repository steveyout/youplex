import { CONFIG } from 'config-global';

import { DndView } from 'sections/_examples/extra/dnd-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dnd | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <DndView />;
}
