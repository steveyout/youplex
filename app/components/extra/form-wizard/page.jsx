import { CONFIG } from 'config-global';

import { FormWizardView } from 'sections/_examples/extra/form-wizard-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Form wizard | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <FormWizardView />;
}
