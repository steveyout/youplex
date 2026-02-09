import { CONFIG } from 'config-global';

import { AutocompleteView } from 'sections/_examples/mui/autocomplete-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Autocomplete | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <AutocompleteView />;
}
