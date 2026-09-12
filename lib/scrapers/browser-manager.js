/* eslint-disable global-require, import/no-unresolved */
/**
 * Playwright Browser Manager for headless stream sniffing & extraction.
 *
 * Features:
 * - Dynamic lazy loading (doesn't crash if Playwright binaries aren't installed in serverless).
 * - Ad & resource blocking (blocks images, fonts, css, ads, trackers for 10x faster execution).
 * - JWPlayer analytics & stream interceptor (sniffs .m3u8, .mp4, and 'mu=' params).
 * - Clean lifecycle management (auto-closes contexts & pages).
 */

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const runtimeRequire = eval('require');

class BrowserManager {
  constructor() {
    /** @type {any} */
    this.browser = null;
    /** @type {boolean|null} */
    this.isAvailable = null;
  }

  /**
   * Check if Playwright is available in the current environment.
   * @returns {boolean}
   */
  hasPlaywright() {
    if (this.isAvailable !== null) return this.isAvailable;
    try {
      const mod =
        (() => {
          try {
            return runtimeRequire('playwright-extra');
          } catch {
            try {
              return runtimeRequire('playwright');
            } catch {
              return runtimeRequire('playwright-core');
            }
          }
        })();

      this.isAvailable = Boolean(mod && (mod.chromium || mod.firefox));
      return this.isAvailable;
    } catch {
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Get or launch the singleton browser instance.
   */
  async getBrowser() {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (!this.hasPlaywright()) {
      throw new Error('Playwright is not available or browser binaries are not installed.');
    }

    let playwrightMod;
    try {
      playwrightMod = runtimeRequire('playwright-extra');
      try {
        const stealth = runtimeRequire('puppeteer-extra-plugin-stealth')();
        playwrightMod.chromium.use(stealth);
      } catch {
        // stealth plugin optional
      }
    } catch {
      try {
        playwrightMod = runtimeRequire('playwright');
      } catch {
        playwrightMod = runtimeRequire('playwright-core');
      }
    }

    const chromium = playwrightMod.chromium || playwrightMod.firefox;
    this.browser = await chromium.launch({
      headless: String(process.env.HEADLESS || 'true').toLowerCase() !== 'false',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--use-gl=swiftshader',
      ],
    });

    return this.browser;
  }

  /**
   * Create an isolated browser context with anti-detect, ad-blocking, and stealth headers.
   */
  async getNewContext() {
    const browser = await this.getBrowser();

    const context = await browser.newContext({
      userAgent: DEFAULT_UA,
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: {
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    // 1. Performance: Block images, stylesheets, fonts, and heavy media
    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'stylesheet' || type === 'font') {
        return route.abort();
      }

      const url = route.request().url();
      if (url.includes('youtube.com') || url.includes('googlevideo.com') || url.includes('doubleclick.net')) {
        return route.abort();
      }

      return route.continue();
    });

    // 2. Anti-detection scripts
    await context.addInitScript(() => {
      /* global window, navigator */
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // @ts-ignore
        window.chrome = { runtime: {} };
      } catch {
        // ignore in mock context
      }
    });

    return context;
  }

  /**
   * Run a sniffing extraction session.
   *
   * @param {Object} options
   * @param {string} options.targetUrl URL to navigate to
   * @param {string} [options.providerName] Name for debug logs
   * @param {number} [options.timeoutMs] Max duration to wait (default 25000ms)
   * @param {(page: any, sniffer: any) => Promise<void>} [options.customLogic] Custom click/interaction logic
   * @returns {Promise<{url: string, subtitles: Array<{url: string, label: string}>, headers: Record<string, string>}|null>}
   */
  async sniffStream({ targetUrl, providerName = 'Sniffer', timeoutMs = 25000, customLogic }) {
    if (!this.hasPlaywright()) {
      return null;
    }

    const context = await this.getNewContext();
    const page = await context.newPage();

    let foundUrl = null;
    const subtitleTracks = [];
    let capturedHeaders = {};

    try {
      const sniffer = (intercepted) => {
        try {
          const url = intercepted.url();
          let potentialUrl = null;

          // 1. JWPlayer Analytics Bypass (mu= trick)
          if (url.includes('jwpltx.com') && url.includes('mu=')) {
            try {
              const params = new URLSearchParams(url.split('?')[1]);
              const mu = params.get('mu');
              if (mu && (mu.includes('.m3u8') || mu.includes('.mp4'))) {
                potentialUrl = decodeURIComponent(mu);
              }
            } catch {
              // ignore
            }
          }

          // 2. MovieBox / PlayStream decoded parameter
          if (!potentialUrl && url.includes('playstream') && url.includes('q=')) {
            const qData = new URL(url).searchParams.get('q');
            if (qData) {
              try {
                const base64 = qData.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(Buffer.from(base64, 'base64').toString());
                if (decoded.url && !decoded.url.includes('-sd.mp4')) {
                  potentialUrl = decoded.url;
                }
              } catch {
                potentialUrl = url;
              }
            }
          }

          // 3. General HLS / MP4 stream detection
          if (!potentialUrl) {
            const isStream = url.includes('.m3u8') || url.includes('.mp4');
            const isAd = url.includes('ads') || url.includes('pixel') || url.includes('doubleclick');
            const isTrailer = url.includes('-sd.mp4') || url.includes('-ld.mp4') || url.includes('trailer');

            if (isStream && !isTrailer && !isAd) {
              potentialUrl = url;
            }
          }

          if (potentialUrl && !foundUrl) {
            foundUrl = potentialUrl;
            capturedHeaders = intercepted.headers();
          }

          // 4. Subtitle detection
          if (url.includes('.vtt') || url.includes('.srt')) {
            if (!subtitleTracks.find((s) => s.url === url)) {
              const langMatch = url.match(/([a-z]{2,3})\.(vtt|srt)/i);
              subtitleTracks.push({
                url,
                label: langMatch ? langMatch[1].toUpperCase() : 'CC',
              });
            }
          }
        } catch {
          // ignore error in sniffer
        }
      };

      page.on('request', sniffer);

      context.on('page', async (popup) => {
        try {
          await popup.close();
        } catch {
          // ignore
        }
      });

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      if (customLogic) {
        await customLogic(page, sniffer);
      }

      const maxLoops = Math.floor(timeoutMs / 1000);
      for (let i = 0; i < maxLoops; i++) {
        if (foundUrl) break;

        if (i % 8 === 0 && i > 0) {
          await page.mouse.click(640, 360).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!foundUrl) return null;

      const urlObj = new URL(foundUrl);

      return {
        url: foundUrl,
        subtitles: subtitleTracks,
        headers: {
          Referer: page.url(),
          Origin: urlObj.origin,
          'User-Agent': capturedHeaders['user-agent'] || DEFAULT_UA,
        },
      };
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }
}

export const browserManager = new BrowserManager();
