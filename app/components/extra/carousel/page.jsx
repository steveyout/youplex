import { CONFIG } from 'config-global';

import { CarouselView } from 'sections/_examples/extra/carousel-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Carousel | Components - ${CONFIG.site.name}` };

export default function Page() {
  return <CarouselView />;
}
