const { fetchWithDns } = require('../lib/livetv/fetch');

async function testToken() {
  const tokenUrl = 'https://edge.cowedd4855ws.sbs/api/playlist-token?slug=premium51';
  console.log('Testing token url:', tokenUrl);
  try {
    const res = await fetchWithDns(tokenUrl, {
      headers: {
        Referer: 'https://dembed.st/premiumtv/daddy.php?id=51',
        Origin: 'https://dembed.st',
        Accept: 'application/json, text/plain, */*',
      },
    });
    console.log('Token status:', res.status);
    const text = await res.text();
    console.log('Token body:', text);
  } catch (e) {
    console.error('Token fetch error:', e);
    if (e.cause) console.error('Cause:', e.cause);
  }
}

testToken();
