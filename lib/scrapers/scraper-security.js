import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export const SCRAPER_SECRET =
  (typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_SCRAPER_SECRET || process.env?.SCRAPER_SECRET)) ||
  'yp_sw_v6_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c';

export const INTERNAL_API_KEY =
  (typeof process !== 'undefined' && process.env?.INTERNAL_API_KEY) ||
  'yp_internal_srv_8a7b6c5d4e3f2a1b';

function computeHmacHex(secret, message) {
  return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(message)));
}

function base64ToBytes(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export function signScraperRequest(type, id) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = computeHmacHex(SCRAPER_SECRET, `${type}:${id}:${ts}`).slice(0, 32);
  return {
    ts,
    sig,
    token: `${ts}.${sig}`,
  };
}

export function getScraperAuthHeaders(type, id) {
  const { token } = signScraperRequest(type, id);
  const headers = {
    'X-Scraper-Token': token,
  };
  if (typeof window === 'undefined' && INTERNAL_API_KEY) {
    headers['X-Internal-Key'] = INTERNAL_API_KEY;
  }
  return headers;
}

function deriveKeystreamBytes(secret, ivHex, length) {
  const out = new Uint8Array(length);
  let offset = 0;
  let counter = 0;
  while (offset < length) {
    const block = sha256(utf8ToBytes(`${secret}:${ivHex}:${counter}`));
    const copyLen = Math.min(block.length, length - offset);
    out.set(block.subarray(0, copyLen), offset);
    offset += copyLen;
    counter += 1;
  }
  return out;
}

export function decryptScraperPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.encrypted || !payload.enc) {
    return payload;
  }

  const { iv, data, tag } = payload.enc;
  if (!iv || !data || !tag) {
    throw new Error('Malformed encrypted scraper payload');
  }

  const expectedTag = computeHmacHex(SCRAPER_SECRET, `${iv}.${data}`).slice(0, 32);
  if (expectedTag !== tag) {
    throw new Error('Encrypted payload integrity check failed');
  }

  const cipherBytes = base64ToBytes(data);
  const keystream = deriveKeystreamBytes(SCRAPER_SECRET, iv, cipherBytes.length);
  const plainBytes = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i += 1) {
    plainBytes[i] = cipherBytes[i] ^ keystream[i];
  }

  const jsonStr = new TextDecoder().decode(plainBytes);
  const sensitive = JSON.parse(jsonStr);

  const restored = { ...payload, ...sensitive };
  delete restored.encrypted;
  delete restored.enc;
  return restored;
}
