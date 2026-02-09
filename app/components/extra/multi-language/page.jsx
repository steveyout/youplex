import { CONFIG } from 'config-global';
import { getServerTranslations } from 'locales/server';

import { MultiLanguageView } from 'sections/_examples/extra/multi-language-view';
import { navData } from 'sections/_examples/extra/multi-language-view/config-nav';

// ----------------------------------------------------------------------

export const metadata = { title: `Multi language | Components - ${CONFIG.site.name}` };

export default async function Page() {
  let ssrNavData;

  if (!CONFIG.isStaticExport) {
    const { t } = await getServerTranslations('navbar');
    const data = navData(t);

    ssrNavData = data;
  }

  return <MultiLanguageView ssrNavData={ssrNavData} />;
}
