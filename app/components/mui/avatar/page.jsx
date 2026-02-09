import { CONFIG } from 'config-global';

import { AvatarView } from 'sections/_examples/mui/avatar-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Avatar | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <AvatarView />;
}
