import { CONFIG } from 'config-global';

import { FormValidationView } from 'sections/_examples/extra/form-validation-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Form validation | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <FormValidationView />;
}
