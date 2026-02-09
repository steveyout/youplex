import { CONFIG } from 'config-global';

import { View500 } from 'sections/error';

// ----------------------------------------------------------------------

export const metadata = { title: `500 Internal server error! | Error - ${CONFIG.site.name}` };

export default function Page() {
  return <View500 />;
}
