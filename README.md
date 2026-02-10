# 🎬 Youplex

Youplex is a high-performance, SEO-optimized streaming discovery platform built with **Next.js 15** and **TMDB API**. Designed for speed and reliability, it features a full **PWA** experience, dynamic sitemaps, and multi-server provider integration.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![MUI](https://img.shields.io/badge/Material--UI-v6-blue?style=for-the-badge&logo=mui)
![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge&logo=pwa)
![PM2](https://img.shields.io/badge/PM2-Managed-green?style=for-the-badge&logo=pm2)

---

## ✨ Features

- 🚀 **Next.js 15 & Turbopack:** Blazing fast development and optimized production builds.
- 📱 **PWA Ready:** Installable on iOS and Android with a standalone native-app feel.
- 🔍 **Advanced Search:** Real-time multi-search for Movies and TV Series with poster previews and keyboard shortcuts (⌘K).
- 📺 **Multi-Server Support:** Integrated server switcher with support for VidLink Pro, VidSrc VIP, RiveStream, VidNest, and more.
- 🛠 **SEO Optimized:** Dynamic `sitemap.xml` and `robots.txt` generation using `force-dynamic` rendering to ensure Google always sees fresh content.
- 🌑 **Modern UI:** Built with Material UI (MUI) featuring a responsive, mobile-first design and professional accordion-based FAQs.

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Engine:** Turbopack
- **Styling:** Material UI (MUI) v6 & Emotion
- **Icons:** Iconify (Eva, Solar, Lucide sets)
- **Data Source:** TMDB API
- **Process Manager:** PM2
- **Package Manager:** Yarn

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- Yarn package manager
- TMDB API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/steveyout/youplex.git](https://github.com/steveyout/youplex.git)
   cd youplex
   ```
## Install dependencies:

```bash
yarn install
Environment Variables: Create a .env.local file in the root and add your keys:


NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
NEXT_PUBLIC_SITE_URL=[https://youplex.vercel.app](https://youplex.vercel.app)
Development: Run the development server with Turbopack:


yarn dev --turbo
```

## 🏗 Production Deployment (PM2)
# To run Youplex in a production environment (VPS/Dedicated Server):

Build the project:

```bash
yarn build
Start the process with PM2:


pm2 start yarn --name "youplex" -- start
Ensure Persistence:


pm2 startup
pm2 save

```
## 📁 Project Structure

```text
├── app/                          # Next.js App Router
│   ├── favicon/                  # PWA and browser icons
│   ├── layout.js                 # Root layout with SEO & PWA metadata
│   ├── loading.js                # Global streaming/loading states
│   ├── manifest.js               # Dynamic PWA Web Manifest
│   ├── robots.js                 # Search engine bot instructions
│   ├── sitemap.js                # Dynamic SEO sitemap (force-dynamic)
│   └── watch/                    # Streaming & Player routes
├── components/                   # Core UI Components
│   ├── iconify/                  # Iconify integration (eva, solar, etc.)
│   ├── logo/                     # Brand components
│   └── search/                   # Search logic and multi-results
├── config/                       # Global Configuration
│   ├── config-global.js          # Site name, URL, and API constants
│   └── providers.js              # Video server provider definitions
├── hooks/                        # Custom React Hooks
│   ├── use-boolean.js            # Toggle/Modal state management
│   └── use-debounce.js           # Search input optimization
├── routes/                       # Navigation Pathing
│   ├── hooks/                    # Router navigation helpers
│   └── paths.js                  # Centralized URL definitions
├── sections/                     # Page-Specific Features
│   ├── faqs/                     # FAQ list and accordion content
│   ├── player/                   # Video player and provider stack
│   └── search/                   # Search bar and keyboard shortcuts
├── theme/                        # MUI Theme System
│   ├── core/                     # Palette, typography, and shadows
│   └── custom-shadows.js         # Custom design tokens
├── public/                       # Static Assets
└── next.config.mjs               # Turbopack & PWA configuration
```

## 💬 Community & Support
Join our community to get updates, report bugs, or request new features:

📢 Telegram: Telegram channel [Telegram](https://t.me/youplexannouncments)

💬 Discord: Join our [Discord](https://discord.gg/5eWu9Vz6tQ)

## 🛡 License
Distributed under the MIT License.

Disclaimer: Youplex does not host any files on its servers. All content is provided by non-affiliated third-party providers.
