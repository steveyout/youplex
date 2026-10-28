const dns = require('dns');
const { Agent, fetch: undiciFetch } = require('undici');

function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const isAll = options && options.all;
  console.log(`[customLookup] hostname=${hostname}, isAll=${isAll}, options=`, options);

  const resolver = new dns.promises.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  resolver.resolve4(hostname).then((addrs) => {
    console.log(`[customLookup] resolve4 result:`, addrs);
    if (!addrs || addrs.length === 0) {
      return dns.lookup(hostname, options, callback);
    }
    const ip = addrs[0];
    if (isAll) {
      console.log(`[customLookup] returning isAll:`, addrs.map((a) => ({ address: a, family: 4 })));
      callback(null, addrs.map((a) => ({ address: a, family: 4 })));
    } else {
      console.log(`[customLookup] returning single:`, ip);
      callback(null, ip, 4);
    }
  }).catch((err) => {
    console.log(`[customLookup] resolve4 failed:`, err.message);
    dns.lookup(hostname, options, callback);
  });
}

const dispatcher = new Agent({
  connect: {
    lookup: customLookup,
    rejectUnauthorized: false,
  },
});

async function run() {
  try {
    const res = await undiciFetch('https://edge.cowedd4855ws.sbs/premium51/index.m3u8', {
      dispatcher,
      headers: {
        Referer: 'https://dembed.st/',
        Origin: 'https://dembed.st',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    console.log('STATUS:', res.status);
    const body = await res.text();
    console.log('BODY PREFIX:', body.slice(0, 300));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

run();
