import dns from 'dns';
import { Agent } from 'undici';

// Configurable DNS servers to bypass ISP blocks/sinkholes (e.g. 192.168.100.1 returning ::1)
const DNS_SERVERS = (process.env.LIVETV_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const resolver = new dns.promises.Resolver();
resolver.setServers(DNS_SERVERS);

// In-memory DNS cache: hostname -> { ip: string, expiresAt: number }
const dnsCache = new Map();
const DNS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const isAll = options && options.all;

  // Don't intercept localhost or IP addresses
  if (hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    return dns.lookup(hostname, options, callback);
  }

  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    if (isAll) {
      return callback(null, [{ address: cached.ip, family: 4 }]);
    }
    return callback(null, cached.ip, 4);
  }

  resolver
    .resolve4(hostname)
    .then((addrs) => {
      if (!addrs || addrs.length === 0) {
        return dns.lookup(hostname, options, callback);
      }
      const ip = addrs[0];
      dnsCache.set(hostname, { ip, expiresAt: Date.now() + DNS_TTL_MS });

      if (isAll) {
        callback(null, addrs.map((a) => ({ address: a, family: 4 })));
      } else {
        callback(null, ip, 4);
      }
    })
    .catch(() => {
      // Fallback to default system lookup if public DNS fails
      dns.lookup(hostname, options, callback);
    });
}

export const livetvDispatcher = new Agent({
  connect: {
    lookup: customLookup,
    rejectUnauthorized: false,
  },
});

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function getBaseUrls() {
  const primary = (process.env.LIVETV_BASE_URL || 'https://thedaddy.pk').trim();
  const fallbacks = (process.env.LIVETV_FALLBACK_URLS || 'https://dlstreams.st,https://dlhd.so,https://thedaddy.to')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const urls = [primary, ...fallbacks.filter((u) => u !== primary)];
  return urls;
}

/**
 * Fetch helper using the DNS-bypassing dispatcher.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithDns(url, options = {}) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    dispatcher: livetvDispatcher,
  });
}
