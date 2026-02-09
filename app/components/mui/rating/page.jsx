import { CONFIG } from 'config-global';

import { RatingView } from 'sections/_examples/mui/rating-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Rating | MUI - ${CONFIG.site.name}` };

export default function Page() {
  return <RatingView />;
}
