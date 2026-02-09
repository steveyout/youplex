import { CONFIG } from 'config-global';

import { ButtonView } from 'sections/_examples/mui/button-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Button | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <ButtonView />;
}
