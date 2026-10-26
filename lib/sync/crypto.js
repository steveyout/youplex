'use client';

import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import forge from 'node-forge';

// ----------------------------------------------------------------------

function uint8ArrayToBuffer(array) {
  return forge.util.createBuffer(
    Array.from(array)
      .map((byte) => String.fromCharCode(byte))
      .join('')
  );
}

export function bytesToBase64(bytes) {
  return forge.util.encode64(String.fromCharCode(...bytes));
}

export function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes)
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/, '');
}

export function base64ToBuffer(data) {
  const binary = forge.util.decode64(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64ToStringBuffer(data) {
  return forge.util.createBuffer(forge.util.decode64(data));
}

export function stringBufferToBase64(buffer) {
  return forge.util.encode64(buffer.getBytes());
}

/**
 * Validates a 12-word BIP39 mnemonic or a custom secure passphrase
 */
export function verifyValidMnemonic(mnemonic) {
  if (!mnemonic || typeof mnemonic !== 'string') return false;
  const trimmed = mnemonic.trim();
  if (validateMnemonic(trimmed, wordlist)) {
    return true;
  }
  const validPassphraseRegex = /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=:;"'<>[\]{}|\\/`~]+$/;
  return trimmed.length >= 8 && validPassphraseRegex.test(trimmed);
}

/**
 * Generates a new 12-word cryptographic passphrase
 */
export function genMnemonic() {
  return generateMnemonic(wordlist);
}

async function seedFromMnemonic(mnemonic) {
  return pbkdf2Async(sha256, mnemonic.trim(), 'mnemonic', {
    c: 2048,
    dkLen: 32,
  });
}

/**
 * Derives Ed25519 keypair from a 32-byte seed
 */
export async function keysFromSeed(seed) {
  const seedBuffer = Buffer.isBuffer(seed) ? seed : Buffer.from(seed);
  const { privateKey, publicKey } = forge.pki.ed25519.generateKeyPair({
    seed: seedBuffer,
  });

  return {
    privateKey: new Uint8Array(privateKey),
    publicKey: new Uint8Array(publicKey),
    seed: new Uint8Array(seedBuffer),
  };
}

/**
 * Generates keys from mnemonic passphrase
 */
export async function keysFromMnemonic(mnemonic) {
  const seed = await seedFromMnemonic(mnemonic);
  return keysFromSeed(seed);
}

/**
 * Signs a challenge string using the private Ed25519 key
 */
export async function signChallenge(keys, challengeCode) {
  const signature = forge.pki.ed25519.sign({
    message: forge.util.createBuffer(challengeCode, 'utf8'),
    privateKey: keys.privateKey,
  });
  return bytesToBase64Url(new Uint8Array(signature));
}

/**
 * Encrypts string payload (e.g. device name) using AES-GCM
 */
export async function encryptData(data, secret) {
  if (secret.byteLength !== 32) {
    throw new Error('Secret must be at least 256-bit');
  }

  const iv = await new Promise((resolve, reject) => {
    forge.random.getBytes(16, (err, bytes) => {
      if (err) reject(err);
      else resolve(bytes);
    });
  });

  const cipher = forge.cipher.createCipher('AES-GCM', uint8ArrayToBuffer(secret));
  cipher.start({
    iv,
    tagLength: 128,
  });
  cipher.update(forge.util.createBuffer(data, 'utf8'));
  cipher.finish();

  const encryptedData = cipher.output;
  const { tag } = cipher.mode;

  return `${forge.util.encode64(iv)}.${stringBufferToBase64(encryptedData)}.${stringBufferToBase64(tag)}`;
}

/**
 * Decrypts AES-GCM encrypted payload
 */
export function decryptData(data, secret) {
  if (secret.byteLength !== 32) {
    throw new Error('Secret must be 256-bit');
  }

  const [iv, encryptedData, tag] = data.split('.');
  const decipher = forge.cipher.createDecipher('AES-GCM', uint8ArrayToBuffer(secret));
  decipher.start({
    iv: base64ToStringBuffer(iv),
    tag: base64ToStringBuffer(tag),
    tagLength: 128,
  });
  decipher.update(base64ToStringBuffer(encryptedData));
  const pass = decipher.finish();

  if (!pass) {
    throw new Error('Error decrypting data');
  }

  return decipher.output.toString();
}

// ----------------------------------------------------------------------
// Passkey / WebAuthn utilities
// ----------------------------------------------------------------------

export function isPasskeySupported() {
  const isSecureContext =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

  return (
    isSecureContext &&
    typeof navigator !== 'undefined' &&
    'credentials' in navigator &&
    'create' in navigator.credentials &&
    'get' in navigator.credentials &&
    typeof PublicKeyCredential !== 'undefined'
  );
}

function base64UrlToArrayBuffer(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function createPasskey(userId, userName) {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }

  const userIdBuffer = new Uint8Array(8);
  crypto.getRandomValues(userIdBuffer);

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Youplex',
      id: window.location.hostname,
    },
    user: {
      id: userIdBuffer,
      name: userName || 'youplex-user',
      displayName: userName || 'Youplex User',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  if (!credential) {
    throw new Error('Failed to create passkey');
  }

  return {
    id: credential.id,
    rawId: credential.rawId,
  };
}

export async function authenticatePasskey(credentialId) {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const allowCredentials =
    credentialId && credentialId.length > 0
      ? [
          {
            id: base64UrlToArrayBuffer(credentialId),
            type: 'public-key',
          },
        ]
      : undefined;

  const publicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: 'preferred',
    allowCredentials,
    rpId: window.location.hostname,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  if (!assertion) {
    throw new Error('Failed to authenticate with passkey');
  }

  return {
    id: assertion.id,
    rawId: assertion.rawId,
  };
}

export async function keysFromCredentialId(credentialId) {
  const seed = await pbkdf2Async(sha256, credentialId, 'mnemonic', {
    c: 2048,
    dkLen: 32,
  });
  return keysFromSeed(seed);
}
