const { fetchWithDns } = require('../lib/livetv/fetch');

async function inspectHtml() {
  const res = await fetchWithDns('https://dembed.st/premiumtv/daddy.php?id=51', {
    headers: { Referer: 'https://thedaddy.pk/', Accept: 'text/html,*/*' },
  });
  const html = await res.text();
  // Strip out the huge script 0 string to see the structure
  const clean = html.replace(/window\['ZpQw9XkLmN8c3vR3'\]='[^']+';/g, '/* HUGE_TOKEN */');
  console.log(clean.slice(0, 3000));
}

inspectHtml();
