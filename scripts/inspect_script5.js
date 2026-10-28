const { fetchWithDns } = require('../lib/livetv/fetch');

async function inspectScript5() {
  const res = await fetchWithDns('https://dembed.st/premiumtv/daddy.php?id=51', {
    headers: { Referer: 'https://thedaddy.pk/', Accept: 'text/html,*/*' },
  });
  const html = await res.text();
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  console.log('Script 5 length:', scripts[5].length);
  // print first 4000 chars of script 5
  console.log(scripts[5].slice(0, 4000));
}

inspectScript5();
