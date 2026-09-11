/**
 * Provider registry — lazy singleton.
 *
 * Import config from config.js, wrap each entry in createProvider(),
 * and expose a singleton registry the API route and player can use.
 */

import { SCRAPER_CONFIG } from './config';
import { createProvider } from './provider';

class ProviderRegistry {
  constructor() {
    /** @type {import('./provider').createProvider[]} */
    this.providers = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return this;
    this.providers = SCRAPER_CONFIG.map((entry) => {
      const p = createProvider(entry);
      return { ...p, priority: entry.priority ?? 100 };
    });
    this.providers.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    this.initialized = true;
    return this;
  }

  /** @param {string} mediaType */
  getEnabledProviders(mediaType) {
    return this.providers.filter((p) => p.enabled && p.supportsContent(mediaType));
  }

  /** @param {string} name */
  getByName(name) {
    return this.providers.find((p) => p.name === name) ?? null;
  }
}

/** Module-level singleton — works in Node.js + edge runtime. */
export const registry = new ProviderRegistry().init();