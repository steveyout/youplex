import { CONFIG } from 'config-global';

import { CheckboxView } from 'sections/_examples/mui/checkbox-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Checkbox | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <CheckboxView />;
}
