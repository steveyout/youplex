const { fetchWithDns } = require('../lib/livetv/fetch');

async function inspectHtml() {
  const res = await fetchWithDns('https://dembed.st/premiumtv/daddy.php?id=51', {
    headers: { Referer: 'https://thedaddy.pk/', Accept: 'text/html,*/*' },
  });
  const html = await res.text();
  const clean = html.replace(/window\['ZpQw9XkLmN8c3vR3'\]='[^']+';/g, '/* HUGE_TOKEN */');
  // Find all script tags
  const scripts = clean.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  console.log('Scripts count:', scripts.length);
  scripts.forEach((s, idx) => {
    console.log(`Script ${idx} length: ${s.length}, prefix: ${s.slice(0, 150).replace(/\n/g, ' ')}`);
  });
  // Find other tags
  const withoutScripts = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '<!-- SCRIPT -->');
  console.log('HTML without scripts:\n', withoutScripts);
}

inspectHtml();
