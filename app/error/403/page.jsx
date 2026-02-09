import { CONFIG } from 'config-global';

import { View403 } from 'sections/error';

// ----------------------------------------------------------------------

export const metadata = { title: `403 forbidden! | Error - ${CONFIG.site.name}` };

export default function Page() {
  return <View403 />;
}
