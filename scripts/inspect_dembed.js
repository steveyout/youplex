const { fetchWithDns } = require('../lib/livetv/fetch');

async function inspectDembed() {
  const res = await fetchWithDns('https://dembed.st/premiumtv/daddy.php?id=51', {
    headers: { Referer: 'https://thedaddy.pk/', Accept: 'text/html,*/*' },
  });
  const html = await res.text();
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  scripts.forEach((s, idx) => {
    console.log(`\n--- SCRIPT ${idx} (${s.length} chars) ---`);
    console.log(s.slice(0, 1000));
    if (s.length > 1000) {
      console.log('... [tail] ...');
      console.log(s.slice(-1000));
    }
  });
}

inspectDembed();
