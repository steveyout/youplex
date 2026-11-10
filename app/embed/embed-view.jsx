'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';

import { Iconify } from '@/components/iconify';
import { Logo } from '@/components/logo';

// ----------------------------------------------------------------------

const BRAND_RED = '#FF3030';
const BG_MAIN = '#0a0a0a';
const BG_SURFACE = '#111111';
const BG_SURFACE_ELEVATED = '#161616';
const BORDER_DIM = '#222222';
const BORDER_HIGHLIGHT = '#333333';
const TEXT_MUTED = '#9ca3af';
const TEXT_DIM = '#6b7280';

// ----------------------------------------------------------------------

const FEATURES = [
  {
    icon: 'solar:code-square-bold',
    title: 'Drop Integration',
    desc: 'Standard HTML5 iframe player API',
  },
  {
    icon: 'solar:videocamera-record-bold',
    title: '4K & Adaptive',
    desc: 'Auto-scaling bitrate 480p to 4K',
  },
  {
    icon: 'solar:subtitles-bold',
    title: 'Full Subtitles',
    desc: 'Multi-lingual synced subtitles',
  },
  {
    icon: 'solar:star-fall-bold',
    title: 'TV & Anime',
    desc: 'Season/episode routing & next ep',
  },
  {
    icon: 'solar:bolt-bold',
    title: 'Very Fast',
    desc: 'Global edge proxy routing & HLS',
  },
  {
    icon: 'solar:shield-check-bold',
    title: 'High Reliability',
    desc: 'Resilient multi-source failover streaming',
  },
];

const PARAMETERS = [
  {
    name: 'autoplay',
    type: 'boolean',
    default: 'true',
    desc: 'Starts stream automatically when media is fully loaded.',
  },
  {
    name: 'startAt',
    type: 'number',
    default: '0',
    desc: 'Starts the video at the specified timestamp in seconds.',
  },
  {
    name: 'theme',
    type: 'string',
    default: 'ff3030',
    desc: 'Changes the player accent color (hex code format without #).',
  },
  {
    name: 'color',
    type: 'string',
    default: 'ff3030',
    desc: 'Alias for theme. Sets primary UI accent color.',
  },
  {
    name: 'nextEpisode',
    type: 'boolean',
    default: 'false',
    desc: 'Automatically advances to the next episode when the TV stream ends.',
  },
  {
    name: 'title',
    type: 'string',
    default: 'auto',
    desc: 'Override media title displayed on the player overlay.',
  },
  {
    name: 'poster',
    type: 'string',
    default: 'auto',
    desc: 'Override the default backdrop/poster image URL shown.',
  },
  {
    name: 'lang',
    type: 'string',
    default: 'en',
    desc: 'Sets the default subtitle/audio language code (e.g. en, es, fr).',
  },
  {
    name: 'disableInfo',
    type: 'boolean',
    default: 'false',
    desc: 'Hides top overlay title, season, and episode metadata.',
  },
  {
    name: 'disableControls',
    type: 'boolean',
    default: 'false',
    desc: 'Renders ultra-minimal controls for compact embed containers.',
  },
];

const ERROR_CODES = [
  {
    code: '404 NOT_FOUND',
    color: '#f87171',
    desc: 'The specified TMDB or IMDB ID was not found in our indexing catalog.',
  },
  {
    code: '429 RATE_LIMIT',
    color: '#facc15',
    desc: 'Too many requests from your IP address. Please slow down requests.',
  },
  {
    code: '500 GATEWAY_ERROR',
    color: '#ef4444',
    desc: 'Upstream video scrapers temporarily unreachable. Automatic failover will engage.',
  },
];

// ----------------------------------------------------------------------

export default function EmbedDocumentationView({ isVidSrc: initialIsVidSrc = false, initialOrigin = '' }) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [isVidSrc, setIsVidSrc] = useState(initialIsVidSrc);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      const isVid = window.location.hostname.includes('vidsrc');
      setOrigin(currentOrigin);
      setIsVidSrc(isVid);
      document.title = isVid
        ? 'VidSrc — Free HD Movie & TV Show Streaming API and Player'
        : 'Youplex Embed API — Next-Gen Video Embedding & Streaming API';
    }
  }, []);

  const brand = isVidSrc ? 'VidSrc' : 'Youplex';
  const brandSource = isVidSrc ? 'vidsrc' : 'youplex';
  const baseUrl = origin || (isVidSrc ? 'https://vidsrc.work' : 'https://youplex.site');

  const eventsList = useMemo(
    () => [
      {
        name: `${brandSource}:play`,
        desc: 'Triggered immediately when the viewer starts or resumes stream playback.',
      },
      {
        name: `${brandSource}:pause`,
        desc: 'Triggered when the stream playback is paused by the viewer.',
      },
      {
        name: `${brandSource}:ended`,
        desc: 'Triggered when the media stream reaches completion.',
      },
    ],
    [brandSource]
  );

  const faqsList = useMemo(
    () => [
      {
        q: `What makes ${brand} the superior alternative to vidsrc.to and vidsrc.me?`,
        a: `${brand} (vidsrc.work) provides ultra-fast global CDN proxy delivery with 99.98% uptime, zero intrusive pop-up redirects, adaptive 4K and 1080p playback, multi-language subtitles in 40+ languages, and full backward-compatible support for both path and query parameters with instant TMDB and IMDb resolution.`,
      },
      {
        q: `Is the ${brand} Video Streaming API free?`,
        a: 'Yes, our embed API is 100% free to use for developers and webmasters. No API keys, accounts, or credit cards are required to start embedding.',
      },
      {
        q: 'Do I need a TMDB ID or IMDB ID?',
        a: 'You can use either! The API supports standard TMDB numeric IDs (e.g. 533535) as well as external IMDB IDs (e.g. tt0137523). IMDB IDs are automatically resolved server-side in real-time.',
      },
      {
        q: 'Can I use query parameters like /embed/movie?tmdb=... or ?imdb=...?',
        a: 'Yes! Unlike older mirrors, vidsrc.work fully supports both path endpoints (/embed/movie/550, /embed/tv/1399/1/1) and query endpoints (/embed/movie?tmdb=550, /embed/movie?imdb=tt0137523, /embed/tv?tmdb=1399&s=1&e=1), making it a true 1:1 drop-in replacement.',
      },
      {
        q: 'How do I embed TV shows with seasons and episodes?',
        a: 'You can use path format (/embed/tv/{id}/{season}/{episode}) or query format (/embed/tv?tmdb={id}&s={season}&e={episode}). Defaulting season and episode will play Season 1 Episode 1.',
      },
      {
        q: 'How are ads handled on the embedded player?',
        a: 'The embedded player maintains clean, buffer-free playback with zero disruptive redirects or fake play buttons, ensuring high visitor retention on your platform.',
      },
      {
        q: 'What video resolution and formats are supported?',
        a: 'Our player uses adaptive HLS (HTTP Live Streaming) resolution scaling from 480p up to crisp 4K HDR depending on source availability and viewer network speed.',
      },
      {
        q: `Can I use ${brand} in React, Next.js, Vue, or WordPress?`,
        a: `Yes. Because ${brand} provides standard HTML5 iframe endpoints, it can be embedded anywhere: React, Next.js, Vue, Nuxt, Angular, WordPress custom HTML blocks, or plain static HTML websites.`,
      },
      {
        q: 'Are subtitles and multiple audio tracks available?',
        a: 'Yes, the player automatically extracts and synchronizes subtitles in 40+ languages along with available dubbed audio streams.',
      },
      {
        q: 'What happens if an upstream stream provider goes offline?',
        a: 'Our player features intelligent sequential failover: if an upstream provider fails or returns a dead link, it automatically switches to the next available stream source seamlessly in milliseconds.',
      },
    ],
    [brand]
  );

  // Live Player State
  const [mediaType, setMediaType] = useState('movie'); // 'movie' | 'tv'
  const [tmdbInput, setTmdbInput] = useState('533535');
  const [seasonInput, setSeasonInput] = useState('1');
  const [episodeInput, setEpisodeInput] = useState('1');

  // Currently playing state in iframe
  const [activeStreamUrl, setActiveStreamUrl] = useState('');
  const [hasLoadedStream, setHasLoadedStream] = useState(false);

  // Copy feedback state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedDocUrl, setCopiedDocUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedExIndex, setCopiedExIndex] = useState(null);

  // Documentation navigation
  const [docTab, setDocTab] = useState('endpoints'); // 'endpoints' | 'parameters' | 'errors' | 'events'
  const [docMediaType, setDocMediaType] = useState('movie'); // 'movie' | 'tv'

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  // Build current player URL
  const currentEmbedUrl = useMemo(() => {
    const cleanId = tmdbInput.trim() || (mediaType === 'movie' ? '533535' : '1399');
    if (mediaType === 'movie') {
      return `${baseUrl}/embed/movie/${cleanId}`;
    }
    const s = seasonInput.trim() || '1';
    const e = episodeInput.trim() || '1';
    return `${baseUrl}/embed/tv/${cleanId}/${s}/${e}`;
  }, [baseUrl, mediaType, tmdbInput, seasonInput, episodeInput]);

  // Relative path for local in-page live player preview iframe
  const localEmbedPath = useMemo(() => {
    const cleanId = tmdbInput.trim() || (mediaType === 'movie' ? '533535' : '1399');
    if (mediaType === 'movie') {
      return `/embed/movie/${cleanId}`;
    }
    const s = seasonInput.trim() || '1';
    const e = episodeInput.trim() || '1';
    return `/embed/tv/${cleanId}/${s}/${e}`;
  }, [mediaType, tmdbInput, seasonInput, episodeInput]);

  const handlePlayStream = () => {
    setActiveStreamUrl(localEmbedPath);
    setHasLoadedStream(true);
  };

  const handleCopy = (text, typeSetter) => {
    if (!text || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(text);
    typeSetter(true);
    setTimeout(() => typeSetter(false), 2000);
  };

  const [codeLang, setCodeLang] = useState('html'); // 'html' | 'js' | 'react' | 'python' | 'curl' | 'php'
  const [urlFormat, setUrlFormat] = useState('path'); // 'path' | 'query' | 'direct'

  const currentSnippetUrl = useMemo(() => {
    const id = tmdbInput.trim() || (mediaType === 'movie' ? '533535' : '1399');
    const s = seasonInput.trim() || '1';
    const e = episodeInput.trim() || '1';
    if (urlFormat === 'query') {
      const isImdb = id.startsWith('tt');
      if (mediaType === 'movie') {
        return `${baseUrl}/embed/movie?${isImdb ? 'imdb' : 'tmdb'}=${id}`;
      }
      return `${baseUrl}/embed/tv?${isImdb ? 'imdb' : 'tmdb'}=${id}&s=${s}&e=${e}`;
    }
    if (urlFormat === 'direct') {
      if (mediaType === 'movie') {
        return `${baseUrl}/movie/${id}`;
      }
      return `${baseUrl}/tv/${id}/${s}/${e}`;
    }
    if (mediaType === 'movie') {
      return `${baseUrl}/embed/movie/${id}`;
    }
    return `${baseUrl}/embed/tv/${id}/${s}/${e}`;
  }, [baseUrl, mediaType, tmdbInput, seasonInput, episodeInput, urlFormat]);

  const generatedCode = useMemo(() => {
    if (codeLang === 'html') {
      return `<iframe\n  src="${currentSnippetUrl}"\n  width="100%"\n  height="100%"\n  frameborder="0"\n  allowfullscreen\n  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"\n></iframe>`;
    }
    if (codeLang === 'js') {
      return `// Dynamic VidSrc Embed Player Injector\nfunction mountVidSrcPlayer(containerId) {\n  const container = document.getElementById(containerId);\n  const iframe = document.createElement('iframe');\n  iframe.src = '${currentSnippetUrl}';\n  iframe.width = '100%';\n  iframe.height = '100%';\n  iframe.frameBorder = '0';\n  iframe.allowFullscreen = true;\n  iframe.allow = 'autoplay; fullscreen; picture-in-picture';\n  container.innerHTML = '';\n  container.appendChild(iframe);\n}\n\n// Usage:\nmountVidSrcPlayer('video-player-container');`;
    }
    if (codeLang === 'react') {
      return `import React from 'react';\n\nexport function VidSrcPlayer() {\n  return (\n    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000' }}>\n      <iframe\n        src="${currentSnippetUrl}"\n        title="VidSrc Video Player"\n        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}\n        allowFullScreen\n        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"\n      />\n    </div>\n  );\n}`;
    }
    if (codeLang === 'python') {
      return `import requests\n\n# VidSrc Stream URL\nstream_url = "${currentSnippetUrl}"\n\n# Test embed endpoint status\nresponse = requests.head(stream_url, allow_redirects=True)\nprint(f"VidSrc Status Code: {response.status_code}")\nprint(f"Direct Embed Link: {stream_url}")`;
    }
    if (codeLang === 'curl') {
      return `# Test VidSrc Embed HTTP headers and stream availability\ncurl -I -L "${currentSnippetUrl}"`;
    }
    if (codeLang === 'php') {
      return `<?php\n// Render VidSrc Player in PHP\n$embed_url = "${currentSnippetUrl}";\n?>\n<div class="video-container" style="position:relative;padding-top:56.25%;">\n  <iframe src="<?php echo htmlspecialchars($embed_url); ?>" \n          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" \n          allowfullscreen \n          allow="autoplay; fullscreen">\n  </iframe>\n</div>`;
    }
    return '';
  }, [codeLang, currentSnippetUrl]);

  const docEndpointText =
    docMediaType === 'movie'
      ? `${baseUrl}/embed/movie/{tmdb_id}`
      : `${baseUrl}/embed/tv/{tmdb_id}/{season}/{episode}`;

  const iframeSnippet =
    docMediaType === 'movie'
      ? `<iframe\n  src="${baseUrl}/embed/movie/533535"\n  width="100%"\n  height="100%"\n  frameborder="0"\n  allowfullscreen\n  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"\n></iframe>`
      : `<iframe\n  src="${baseUrl}/embed/tv/1399/1/1"\n  width="100%"\n  height="100%"\n  frameborder="0"\n  allowfullscreen\n  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"\n></iframe>`;

  const examplesList = useMemo(() => {
    if (docMediaType === 'movie') {
      return [
        {
          label: 'Standard Path Embed (TMDB ID):',
          url: `${baseUrl}/embed/movie/533535`,
          snippet: `/embed/movie/533535`,
        },
        {
          label: 'Query Parameter Embed (TMDB ID):',
          url: `${baseUrl}/embed/movie?tmdb=533535`,
          snippet: `/embed/movie?tmdb=533535`,
        },
        {
          label: 'External IMDb ID Resolution (tt0137523):',
          url: `${baseUrl}/embed/movie/tt0137523`,
          snippet: `/embed/movie/tt0137523`,
        },
        {
          label: 'Query Parameter Embed (IMDb ID):',
          url: `${baseUrl}/embed/movie?imdb=tt0137523`,
          snippet: `/embed/movie?imdb=tt0137523`,
        },
        {
          label: 'Direct Shortcut Embed:',
          url: `${baseUrl}/movie/533535`,
          snippet: `/movie/533535`,
        },
        {
          label: 'With custom theme accent color:',
          url: `${baseUrl}/embed/movie/533535?theme=ff3030`,
          snippet: `/embed/movie/533535?theme=ff3030`,
        },
        {
          label: 'With auto-play enabled:',
          url: `${baseUrl}/embed/movie/533535?autoplay=true`,
          snippet: `/embed/movie/533535?autoplay=true`,
        },
        {
          label: 'With startAt timestamp in seconds:',
          url: `${baseUrl}/embed/movie/533535?startAt=120`,
          snippet: `/embed/movie/533535?startAt=120`,
        },
      ];
    }
    return [
      {
        label: 'Standard Path TV Embed (Season 1 Episode 1):',
        url: `${baseUrl}/embed/tv/1399/1/1`,
        snippet: `/embed/tv/1399/1/1`,
      },
      {
        label: 'Query Parameter TV Embed (TMDB ID):',
        url: `${baseUrl}/embed/tv?tmdb=1399&s=1&e=1`,
        snippet: `/embed/tv?tmdb=1399&s=1&e=1`,
      },
      {
        label: 'External IMDb ID TV Embed (tt0944947):',
        url: `${baseUrl}/embed/tv/tt0944947/1/1`,
        snippet: `/embed/tv/tt0944947/1/1`,
      },
      {
        label: 'Query Parameter TV Embed (IMDb ID):',
        url: `${baseUrl}/embed/tv?imdb=tt0944947&s=1&e=1`,
        snippet: `/embed/tv?imdb=tt0944947&s=1&e=1`,
      },
      {
        label: 'Direct TV Shortcut Embed:',
        url: `${baseUrl}/tv/1399/1/1`,
        snippet: `/tv/1399/1/1`,
      },
      {
        label: 'With auto-next episode enabled:',
        url: `${baseUrl}/embed/tv/1399/1/1?nextEpisode=true`,
        snippet: `/embed/tv/1399/1/1?nextEpisode=true`,
      },
      {
        label: 'With custom theme color:',
        url: `${baseUrl}/embed/tv/1399/1/1?theme=ff3030`,
        snippet: `/embed/tv/1399/1/1?theme=ff3030`,
      },
    ];
  }, [baseUrl, docMediaType]);

  return (
    <Box
      sx={{
        bgcolor: BG_MAIN,
        color: 'common.white',
        minHeight: '100vh',
        pb: 12,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Sticky Header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          borderBottom: `1px solid ${BORDER_DIM}`,
          bgcolor: alpha(BG_MAIN, 0.85),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ height: 64 }}
          >
            {/* Logo */}
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    bgcolor: BRAND_RED,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 14px ${alpha(BRAND_RED, 0.4)}`,
                  }}
                >
                  <Iconify icon="solar:play-bold" width={18} sx={{ color: 'common.white', ml: 0.3 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'common.white', letterSpacing: -0.5 }}>
                  {brand} <Box component="span" sx={{ color: BRAND_RED }}>Embed</Box>
                </Typography>
              </Link>

              <Box
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: alpha('#ffffff', 0.06),
                  border: `1px solid ${BORDER_DIM}`,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: 11,
                  color: alpha('#ffffff', 0.7),
                  fontWeight: 600,
                  ml: 1,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                API v2.4 • Live
              </Box>
            </Stack>

            {/* Nav links */}
            <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 3 }}>
              <Link
                href="#live-player"
                style={{
                  color: TEXT_MUTED,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'color 0.2s',
                }}
              >
                Live Player
              </Link>
              <Link
                href="#documentation"
                style={{
                  color: TEXT_MUTED,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'color 0.2s',
                }}
              >
                Documentation
              </Link>
              <Link
                href="#faq"
                style={{
                  color: TEXT_MUTED,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'color 0.2s',
                }}
              >
                FAQs
              </Link>
              {!isVidSrc && (
                <Button
                  component={Link}
                  href="/"
                  size="small"
                  variant="outlined"
                  sx={{
                    color: 'common.white',
                    borderColor: BORDER_HIGHLIGHT,
                    bgcolor: BG_SURFACE,
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 1.25,
                    px: 1.75,
                    '&:hover': {
                      bgcolor: BG_SURFACE_ELEVATED,
                      borderColor: alpha('#ffffff', 0.3),
                    },
                  }}
                >
                  Main App →
                </Button>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 8 }, textAlign: 'center' }}>
        <Box
          component={Link}
          href="#documentation"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            borderRadius: 5,
            bgcolor: BG_SURFACE,
            border: `1px solid ${BORDER_DIM}`,
            color: BRAND_RED,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            mb: 4,
            transition: 'background-color 0.2s',
            '&:hover': { bgcolor: BG_SURFACE_ELEVATED },
          }}
        >
          <span>
            {isVidSrc
              ? '⚡ The #1 High-Speed Alternative to vidsrc.to & vidsrc.me'
              : `What's new on ${brand} Embed API - v2.4`}
          </span>
          <span>→</span>
        </Box>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.75rem', sm: '4rem', md: '5.2rem' },
            fontWeight: 900,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            mb: 2.5,
          }}
        >
          {isVidSrc ? (
            <>
              Next-Gen
              <br />
              <Box component="span" sx={{ color: BRAND_RED }}>
                VidSrc Stream API
              </Box>
            </>
          ) : (
            <>
              Seamless
              <br />
              <Box component="span" sx={{ color: BRAND_RED }}>
                Video Stream
              </Box>
            </>
          )}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: TEXT_MUTED,
            fontSize: { xs: 15, sm: 18 },
            maxWidth: 680,
            mx: 'auto',
            lineHeight: 1.6,
            fontWeight: 500,
            mb: 5,
          }}
        >
          {isVidSrc
            ? 'The official, ultra-fast drop-in embed replacement for vidsrc.to, vidsrc.me, and vidsrc.xyz. Engineered with 4K adaptive HLS, dual TMDB & IMDb resolution, 40+ language subtitles, and zero intrusive redirect ads.'
            : 'Unlock blazing-fast streaming with 99.9% uptime guarantee. Native HTML5 player, automatic multi-source failover, and zero buffering.'}
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            component={Link}
            href="#live-player"
            variant="contained"
            size="large"
            startIcon={<Iconify icon="solar:play-bold" width={18} />}
            sx={{
              bgcolor: BRAND_RED,
              color: 'common.white',
              fontWeight: 700,
              px: 3,
              borderRadius: 1.5,
              boxShadow: `0 8px 24px ${alpha(BRAND_RED, 0.4)}`,
              '&:hover': { bgcolor: '#e02828' },
            }}
          >
            Try Live Player
          </Button>
          <Button
            component={Link}
            href="#documentation"
            variant="outlined"
            size="large"
            sx={{
              borderColor: BORDER_HIGHLIGHT,
              bgcolor: BG_SURFACE,
              color: 'common.white',
              fontWeight: 700,
              px: 3,
              borderRadius: 1.5,
              '&:hover': { bgcolor: BG_SURFACE_ELEVATED, borderColor: alpha('#ffffff', 0.3) },
            }}
          >
            Read Docs
          </Button>
        </Stack>
      </Container>

      {/* Horizontal Features Grid */}
      <Container maxWidth="lg" sx={{ mb: { xs: 10, md: 16 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(6, 1fr)',
            },
            gap: { xs: 2, sm: 2.5 },
          }}
        >
          {FEATURES.map((item, idx) => (
            <Box
              key={idx}
              sx={{
                bgcolor: BG_SURFACE,
                border: `1px solid ${BORDER_DIM}`,
                borderRadius: 2,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: alpha(BRAND_RED, 0.5),
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.75,
                  bgcolor: alpha(BRAND_RED, 0.12),
                  border: `1px solid ${alpha(BRAND_RED, 0.25)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: BRAND_RED,
                  mb: 1.5,
                }}
              >
                <Iconify icon={item.icon} width={22} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
                {item.title}
              </Typography>
              <Typography variant="caption" sx={{ color: TEXT_DIM, fontSize: 11, lineHeight: 1.3 }}>
                {item.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Live Player Section */}
      <Container
        id="live-player"
        maxWidth="md"
        sx={{
          mb: { xs: 12, md: 18 },
          scrollMarginTop: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 900, color: BRAND_RED, mb: 1, textAlign: 'center' }}>
          Live Player Playground
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 3, textAlign: 'center' }}>
          Test real-time HD streams with TMDB or IMDb IDs. Choose a preset or enter your custom media ID below.
        </Typography>

        {/* Quick Test Presets */}
        <Box sx={{ width: '100%', maxWidth: 720, mb: 3 }}>
          <Typography variant="caption" sx={{ color: TEXT_DIM, fontWeight: 700, display: 'block', mb: 1.25, textAlign: 'center', letterSpacing: 0.8 }}>
            ONE-CLICK POPULAR PRESETS (TMDB &amp; IMDB)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap sx={{ gap: 1 }}>
            {[
              { label: 'Deadpool & Wolverine (533535)', type: 'movie', id: '533535' },
              { label: 'Fight Club (tt0137523)', type: 'movie', id: 'tt0137523' },
              { label: 'Interstellar (157336)', type: 'movie', id: '157336' },
              { label: 'Game of Thrones S1:E1 (tt0944947)', type: 'tv', id: 'tt0944947', s: '1', e: '1' },
              { label: 'Breaking Bad S1:E1 (1396)', type: 'tv', id: '1396', s: '1', e: '1' },
              { label: 'Stranger Things S1:E1 (66732)', type: 'tv', id: '66732', s: '1', e: '1' },
            ].map((preset, idx) => (
              <Button
                key={idx}
                size="small"
                onClick={() => {
                  setMediaType(preset.type);
                  setTmdbInput(preset.id);
                  if (preset.type === 'tv') {
                    setSeasonInput(preset.s || '1');
                    setEpisodeInput(preset.e || '1');
                  }
                  setActiveStreamUrl(
                    preset.type === 'movie'
                      ? `/embed/movie/${preset.id}`
                      : `/embed/tv/${preset.id}/${preset.s || '1'}/${preset.e || '1'}`
                  );
                  setHasLoadedStream(true);
                }}
                sx={{
                  bgcolor: BG_SURFACE,
                  color: TEXT_MUTED,
                  fontSize: 11,
                  border: `1px solid ${BORDER_DIM}`,
                  borderRadius: 1.25,
                  px: 1.25,
                  py: 0.5,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(BRAND_RED, 0.15),
                    borderColor: BRAND_RED,
                    color: 'common.white',
                  },
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Controls Bar */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 580,
            mb: 3,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1, px: 0.5 }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 0.8 }}>
              TYPE
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 0.8 }}>
              TMDB / IMDB ID
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            {/* Movie / Series Toggle */}
            <Box
              sx={{
                display: 'inline-flex',
                bgcolor: BG_SURFACE,
                border: `1px solid ${BORDER_DIM}`,
                borderRadius: 1.5,
                p: 0.5,
                flexShrink: 0,
              }}
            >
              <Button
                size="small"
                onClick={() => {
                  setMediaType('movie');
                  setTmdbInput('533535');
                }}
                sx={{
                  bgcolor: mediaType === 'movie' ? BRAND_RED : 'transparent',
                  color: mediaType === 'movie' ? 'common.white' : TEXT_MUTED,
                  fontWeight: 700,
                  fontSize: 12,
                  px: 2,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: mediaType === 'movie' ? BRAND_RED : alpha('#ffffff', 0.05),
                    color: 'common.white',
                  },
                }}
              >
                Movie
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setMediaType('tv');
                  setTmdbInput('1399'); // Game of Thrones
                }}
                sx={{
                  bgcolor: mediaType === 'tv' ? BRAND_RED : 'transparent',
                  color: mediaType === 'tv' ? 'common.white' : TEXT_MUTED,
                  fontWeight: 700,
                  fontSize: 12,
                  px: 2,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: mediaType === 'tv' ? BRAND_RED : alpha('#ffffff', 0.05),
                    color: 'common.white',
                  },
                }}
              >
                Series
              </Button>
            </Box>

            {/* Inputs */}
            <Stack direction="row" spacing={1} sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
              <Box
                component="input"
                type="text"
                value={tmdbInput}
                onChange={(e) => setTmdbInput(e.target.value)}
                placeholder="ID (e.g. 533535)"
                sx={{
                  flexGrow: 1,
                  bgcolor: BG_SURFACE,
                  border: `1px solid ${BORDER_DIM}`,
                  borderRadius: 1.5,
                  px: 2,
                  py: 1,
                  color: 'common.white',
                  fontFamily: 'monospace',
                  fontSize: 14,
                  outline: 'none',
                  '&:focus': { borderColor: BRAND_RED },
                }}
              />

              {mediaType === 'tv' && (
                <>
                  <Box
                    component="input"
                    type="number"
                    min="1"
                    value={seasonInput}
                    onChange={(e) => setSeasonInput(e.target.value)}
                    placeholder="S"
                    title="Season Number"
                    sx={{
                      width: 60,
                      bgcolor: BG_SURFACE,
                      border: `1px solid ${BORDER_DIM}`,
                      borderRadius: 1.5,
                      px: 1,
                      py: 1,
                      textAlign: 'center',
                      color: 'common.white',
                      fontFamily: 'monospace',
                      fontSize: 14,
                      outline: 'none',
                      '&:focus': { borderColor: BRAND_RED },
                    }}
                  />
                  <Box
                    component="input"
                    type="number"
                    min="1"
                    value={episodeInput}
                    onChange={(e) => setEpisodeInput(e.target.value)}
                    placeholder="E"
                    title="Episode Number"
                    sx={{
                      width: 60,
                      bgcolor: BG_SURFACE,
                      border: `1px solid ${BORDER_DIM}`,
                      borderRadius: 1.5,
                      px: 1,
                      py: 1,
                      textAlign: 'center',
                      color: 'common.white',
                      fontFamily: 'monospace',
                      fontSize: 14,
                      outline: 'none',
                      '&:focus': { borderColor: BRAND_RED },
                    }}
                  />
                </>
              )}
            </Stack>

            {/* Play Button */}
            <Button
              variant="contained"
              onClick={handlePlayStream}
              startIcon={<Iconify icon="solar:play-bold" width={16} />}
              sx={{
                bgcolor: BRAND_RED,
                color: 'common.white',
                fontWeight: 800,
                fontSize: 12,
                px: 3,
                py: 1.1,
                borderRadius: 1.5,
                flexShrink: 0,
                boxShadow: `0 4px 16px ${alpha(BRAND_RED, 0.4)}`,
                '&:hover': { bgcolor: '#e02828' },
              }}
            >
              PLAY
            </Button>
          </Stack>
        </Box>

        {/* URL Format Selector */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, width: '100%', maxWidth: 680, justifyContent: 'flex-start' }}>
          {[
            { id: 'path', label: 'Path Format (/embed/movie/...)' },
            { id: 'query', label: 'Query Format (?tmdb=...)' },
            { id: 'direct', label: 'Direct (/movie/...)' },
          ].map((fmt) => (
            <Button
              key={fmt.id}
              size="small"
              onClick={() => setUrlFormat(fmt.id)}
              sx={{
                bgcolor: urlFormat === fmt.id ? alpha(BRAND_RED, 0.18) : BG_SURFACE,
                color: urlFormat === fmt.id ? BRAND_RED : TEXT_MUTED,
                border: `1px solid ${urlFormat === fmt.id ? BRAND_RED : BORDER_DIM}`,
                borderRadius: 1,
                fontSize: 11,
                fontWeight: 700,
                px: 1.25,
                py: 0.35,
                '&:hover': {
                  bgcolor: urlFormat === fmt.id ? alpha(BRAND_RED, 0.25) : BG_SURFACE_ELEVATED,
                  color: 'common.white',
                },
              }}
            >
              {fmt.label}
            </Button>
          ))}
        </Stack>

        {/* Generated URL Box */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 680,
            bgcolor: BG_SURFACE,
            border: `1px solid ${BORDER_DIM}`,
            borderRadius: 1.5,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: 13,
              color: BRAND_RED,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pl: 1,
            }}
          >
            {currentSnippetUrl}
          </Typography>

          <Tooltip title={copiedUrl ? 'Copied!' : 'Copy URL'}>
            <IconButton
              size="small"
              onClick={() => handleCopy(currentSnippetUrl, setCopiedUrl)}
              sx={{ color: TEXT_MUTED, '&:hover': { color: 'common.white' }, ml: 1 }}
            >
              <Iconify icon={copiedUrl ? 'solar:check-read-bold' : 'solar:copy-bold'} width={18} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Player 16:9 Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 880,
            pt: '56.25%', // 16:9 aspect ratio
            bgcolor: '#000000',
            borderRadius: 2.5,
            overflow: 'hidden',
            border: `1px solid ${BORDER_DIM}`,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.85)',
          }}
        >
          {hasLoadedStream && activeStreamUrl ? (
            <Box
              component="iframe"
              src={activeStreamUrl}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
                zIndex: 2,
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={2}
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: BG_SURFACE,
                color: TEXT_MUTED,
                cursor: 'pointer',
              }}
              onClick={handlePlayStream}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: alpha(BRAND_RED, 0.15),
                  border: `2px solid ${alpha(BRAND_RED, 0.4)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: BRAND_RED,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.08)' },
                }}
              >
                <Iconify icon="solar:play-bold" width={28} sx={{ ml: 0.4 }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'common.white' }}>
                Ready to Stream
              </Typography>
              <Typography variant="caption" sx={{ color: TEXT_DIM }}>
                Click PLAY or this overlay to load player preview
              </Typography>
            </Stack>
          )}
        </Box>
      </Container>

      {/* Competitor Comparison Section */}
      <Container
        maxWidth="lg"
        sx={{
          mb: { xs: 12, md: 16 },
          scrollMarginTop: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            borderRadius: 5,
            bgcolor: alpha(BRAND_RED, 0.12),
            border: `1px solid ${alpha(BRAND_RED, 0.3)}`,
            color: BRAND_RED,
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1,
            mb: 2,
          }}
        >
          Competitive Advantage
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 900, color: 'common.white', mb: 1, textAlign: 'center' }}>
          Why Webmasters Choose <Box component="span" sx={{ color: BRAND_RED }}>VidSrc.work</Box>
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 5, textAlign: 'center', maxWidth: 640 }}>
          Direct feature-by-feature comparison against legacy embed providers including vidsrc.to and vidsrc.me.
        </Typography>

        <Box
          sx={{
            width: '100%',
            maxWidth: 960,
            bgcolor: BG_SURFACE,
            border: `1px solid ${BORDER_DIM}`,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              <Box component="thead">
                <Box component="tr" sx={{ borderBottom: `1px solid ${BORDER_DIM}`, bgcolor: BG_MAIN }}>
                  <Box component="th" sx={{ p: 2.5, fontWeight: 800, color: TEXT_DIM, letterSpacing: 0.8, fontSize: 11 }}>
                    FEATURE / CAPABILITY
                  </Box>
                  <Box component="th" sx={{ p: 2.5, fontWeight: 900, color: BRAND_RED, fontSize: 13 }}>
                    ⚡ VidSrc.work (Official)
                  </Box>
                  <Box component="th" sx={{ p: 2.5, fontWeight: 700, color: TEXT_MUTED }}>
                    vidsrc.to
                  </Box>
                  <Box component="th" sx={{ p: 2.5, fontWeight: 700, color: TEXT_MUTED }}>
                    vidsrc.me
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {[
                  {
                    feature: 'Stream Quality & Bitrate',
                    vidsrc: 'Adaptive 4K / 1080p Full HD',
                    to: 'Capped 720p / 1080p',
                    me: 'Compressed 720p',
                  },
                  {
                    feature: 'Intrusive Ad Experience',
                    vidsrc: 'Zero disruptive redirects / Clean player',
                    to: 'Aggressive tab popups & mobile redirects',
                    me: 'High bounce rate popups',
                  },
                  {
                    feature: 'Failover Reliability',
                    vidsrc: 'Instant automatic multi-source failover',
                    to: 'Manual reload on dead links',
                    me: 'Unreliable / frequent 404s',
                  },
                  {
                    feature: 'TMDB & IMDb Dual Resolution',
                    vidsrc: 'Real-time server-side ID resolver',
                    to: 'Partial IMDb support only',
                    me: 'Strict syntax required',
                  },
                  {
                    feature: 'API Syntax Flexibility',
                    vidsrc: 'Full Path (/movie/...) & Query (?tmdb=...) support',
                    to: 'Path only on most mirrors',
                    me: 'Inconsistent query parameters',
                  },
                  {
                    feature: 'Subtitles & Closed Captions',
                    vidsrc: '40+ Languages with auto-synchronization',
                    to: 'Limited languages (10-15)',
                    me: 'Desynchronized subtitle tracks',
                  },
                  {
                    feature: 'CDN Network & Uptime SLA',
                    vidsrc: '99.98% High-Availability Edge CDN',
                    to: 'Frequent domain drops & IP blocks',
                    me: 'Periodic 502/504 Bad Gateway',
                  },
                ].map((row, idx) => (
                  <Box
                    key={idx}
                    component="tr"
                    sx={{
                      borderBottom: idx < 6 ? `1px solid ${BORDER_DIM}` : 'none',
                      '&:hover': { bgcolor: BG_SURFACE_ELEVATED },
                    }}
                  >
                    <Box component="td" sx={{ p: 2.5, fontWeight: 600, color: 'common.white' }}>
                      {row.feature}
                    </Box>
                    <Box component="td" sx={{ p: 2.5, fontWeight: 700, color: '#4ade80' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Iconify icon="solar:check-circle-bold" width={16} />
                        <span>{row.vidsrc}</span>
                      </Stack>
                    </Box>
                    <Box component="td" sx={{ p: 2.5, color: TEXT_MUTED }}>
                      {row.to}
                    </Box>
                    <Box component="td" sx={{ p: 2.5, color: TEXT_MUTED }}>
                      {row.me}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* Documentation Section */}
      <Container
        id="documentation"
        maxWidth="lg"
        sx={{
          mb: { xs: 12, md: 18 },
          scrollMarginTop: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 900, color: BRAND_RED, mb: 1, textAlign: 'center' }}>
          Documentation
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 5, textAlign: 'center', maxWidth: 540 }}>
          Get started with integrating {brand} into your product using our native player API.
        </Typography>

        {/* Documentation Outer Card */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 960,
            bgcolor: BG_SURFACE,
            border: `1px solid ${BORDER_DIM}`,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Main Navigation Tabs */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              p: 2,
              borderBottom: `1px solid ${BORDER_DIM}`,
              bgcolor: BG_MAIN,
            }}
          >
            {[
              { id: 'endpoints', label: 'Endpoints', icon: 'solar:server-bold' },
              { id: 'parameters', label: 'Parameters', icon: 'solar:slider-vertical-bold' },
              { id: 'errors', label: 'Error Codes', icon: 'solar:danger-triangle-bold' },
              { id: 'events', label: 'Events', icon: 'solar:bell-bold' },
            ].map((tab) => {
              const active = docTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  size="small"
                  onClick={() => setDocTab(tab.id)}
                  startIcon={<Iconify icon={tab.icon} width={16} />}
                  sx={{
                    bgcolor: active ? BRAND_RED : 'transparent',
                    color: active ? 'common.white' : TEXT_MUTED,
                    border: `1px solid ${active ? BRAND_RED : BORDER_DIM}`,
                    fontWeight: 700,
                    fontSize: 12,
                    px: 2,
                    py: 0.8,
                    borderRadius: 1.25,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: active ? BRAND_RED : BG_SURFACE_ELEVATED,
                      color: 'common.white',
                    },
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </Box>

          {/* Panel 1: Endpoints */}
          {docTab === 'endpoints' && (
            <Box sx={{ p: { xs: 2.5, sm: 4, md: 5 } }}>
              {/* Media Sub-Toggle */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    bgcolor: BG_MAIN,
                    border: `1px solid ${BORDER_DIM}`,
                    borderRadius: 2,
                    p: 0.5,
                    width: '100%',
                    maxWidth: 360,
                  }}
                >
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => setDocMediaType('movie')}
                    sx={{
                      bgcolor: docMediaType === 'movie' ? BRAND_RED : 'transparent',
                      color: docMediaType === 'movie' ? 'common.white' : TEXT_MUTED,
                      fontWeight: 700,
                      fontSize: 12,
                      py: 1,
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: docMediaType === 'movie' ? BRAND_RED : alpha('#ffffff', 0.05),
                        color: 'common.white',
                      },
                    }}
                  >
                    Movie Embed
                  </Button>
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => setDocMediaType('tv')}
                    sx={{
                      bgcolor: docMediaType === 'tv' ? BRAND_RED : 'transparent',
                      color: docMediaType === 'tv' ? 'common.white' : TEXT_MUTED,
                      fontWeight: 700,
                      fontSize: 12,
                      py: 1,
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: docMediaType === 'tv' ? BRAND_RED : alpha('#ffffff', 0.05),
                        color: 'common.white',
                      },
                    }}
                  >
                    TV Show Embed
                  </Button>
                </Box>
              </Box>

              {/* Endpoint GET Box */}
              <Box sx={{ mb: 5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 1 }}>
                  HTTP ENDPOINT
                </Typography>
                <Box
                  sx={{
                    bgcolor: BG_SURFACE_ELEVATED,
                    border: `1px solid ${BORDER_DIM}`,
                    borderRadius: 2,
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ overflow: 'hidden' }}>
                    <Box
                      sx={{
                        bgcolor: alpha('#22c55e', 0.15),
                        color: '#4ade80',
                        border: `1px solid ${alpha('#22c55e', 0.3)}`,
                        fontWeight: 900,
                        fontSize: 12,
                        px: 1.25,
                        py: 0.3,
                        borderRadius: 1,
                      }}
                    >
                      GET
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: { xs: 12, sm: 14 },
                        color: BRAND_RED,
                        wordBreak: 'break-all',
                      }}
                    >
                      {docEndpointText}
                    </Typography>
                  </Stack>

                  <Tooltip title={copiedDocUrl ? 'Copied!' : 'Copy Endpoint'}>
                    <IconButton
                      onClick={() => handleCopy(docEndpointText, setCopiedDocUrl)}
                      sx={{ color: TEXT_MUTED, '&:hover': { color: 'common.white' }, ml: 2 }}
                    >
                      <Iconify icon={copiedDocUrl ? 'solar:check-read-bold' : 'solar:copy-bold'} width={20} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Required Parameters */}
              <Box sx={{ mb: 5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 1.5, textAlign: 'center' }}>
                  REQUIRED PARAMETERS
                </Typography>
                <Box
                  sx={{
                    bgcolor: BG_SURFACE_ELEVATED,
                    border: `1px solid ${BORDER_DIM}`,
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                  }}
                >
                  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 1.5 }}>
                    <Box sx={{ bgcolor: BORDER_DIM, color: 'common.white', fontFamily: 'monospace', px: 1.5, py: 0.4, borderRadius: 1, fontSize: 12, fontWeight: 700 }}>
                      id
                    </Box>
                    {docMediaType === 'tv' && (
                      <>
                        <Box sx={{ bgcolor: BORDER_DIM, color: 'common.white', fontFamily: 'monospace', px: 1.5, py: 0.4, borderRadius: 1, fontSize: 12, fontWeight: 700 }}>
                          season
                        </Box>
                        <Box sx={{ bgcolor: BORDER_DIM, color: 'common.white', fontFamily: 'monospace', px: 1.5, py: 0.4, borderRadius: 1, fontSize: 12, fontWeight: 700 }}>
                          episode
                        </Box>
                      </>
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: TEXT_MUTED, fontSize: 13 }}>
                    {docMediaType === 'movie'
                      ? 'TMDB numeric Movie ID (e.g. 533535) or external IMDB ID (e.g. tt1234567)'
                      : 'TMDB Show ID, Season number (integer >= 1), and Episode number (integer >= 1)'}
                  </Typography>
                </Box>
              </Box>

              {/* Examples */}
              <Box sx={{ mb: 5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 1.5, textAlign: 'center' }}>
                  QUERY EXAMPLES
                </Typography>
                <Stack spacing={1.5}>
                  {examplesList.map((ex, index) => (
                    <Box
                      key={index}
                      sx={{
                        bgcolor: BG_SURFACE_ELEVATED,
                        border: `1px solid ${BORDER_DIM}`,
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ fontSize: 13, fontFamily: 'monospace', color: TEXT_MUTED }}>
                        <Typography component="span" sx={{ color: TEXT_DIM, fontSize: 12, display: 'block', mb: 0.25 }}>
                          {ex.label}
                        </Typography>
                        <Typography component="span" sx={{ color: 'common.white', wordBreak: 'break-all' }}>
                          {ex.url}
                        </Typography>
                      </Box>

                      <Button
                        size="small"
                        onClick={() => {
                          handleCopy(ex.url, () => {
                            setCopiedExIndex(index);
                            setTimeout(() => setCopiedExIndex(null), 2000);
                          });
                        }}
                        startIcon={<Iconify icon={copiedExIndex === index ? 'solar:check-read-bold' : 'solar:copy-bold'} width={14} />}
                        sx={{
                          color: BRAND_RED,
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          '&:hover': { bgcolor: alpha(BRAND_RED, 0.1) },
                        }}
                      >
                        {copiedExIndex === index ? 'Copied' : 'Copy'}
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Multi-Language Code Generator */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 1.5, textAlign: 'center' }}>
                  DEVELOPER INTEGRATION SNIPPETS
                </Typography>

                {/* Language Tabs */}
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ mb: 1.5 }}>
                  {[
                    { id: 'html', label: 'HTML Iframe' },
                    { id: 'js', label: 'JavaScript' },
                    { id: 'react', label: 'React / Next.js' },
                    { id: 'python', label: 'Python' },
                    { id: 'curl', label: 'cURL' },
                    { id: 'php', label: 'PHP' },
                  ].map((lang) => (
                    <Button
                      key={lang.id}
                      size="small"
                      onClick={() => setCodeLang(lang.id)}
                      sx={{
                        bgcolor: codeLang === lang.id ? alpha(BRAND_RED, 0.18) : BG_MAIN,
                        color: codeLang === lang.id ? BRAND_RED : TEXT_MUTED,
                        border: `1px solid ${codeLang === lang.id ? BRAND_RED : BORDER_DIM}`,
                        borderRadius: 1,
                        fontSize: 11,
                        fontWeight: 700,
                        px: 1.5,
                        py: 0.4,
                        '&:hover': {
                          bgcolor: codeLang === lang.id ? alpha(BRAND_RED, 0.25) : BG_SURFACE_ELEVATED,
                          color: 'common.white',
                        },
                      }}
                    >
                      {lang.label}
                    </Button>
                  ))}
                </Stack>

                <Box
                  sx={{
                    position: 'relative',
                    bgcolor: '#07090d',
                    border: `1px solid ${BORDER_DIM}`,
                    borderRadius: 2,
                    p: 3,
                    overflowX: 'auto',
                  }}
                >
                  <Tooltip title={copiedCode ? 'Copied!' : 'Copy Code'}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(generatedCode, setCopiedCode)}
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        bgcolor: BORDER_DIM,
                        color: 'common.white',
                        '&:hover': { bgcolor: BORDER_HIGHLIGHT },
                      }}
                    >
                      <Iconify icon={copiedCode ? 'solar:check-read-bold' : 'solar:copy-bold'} width={16} />
                    </IconButton>
                  </Tooltip>

                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      fontFamily: 'monospace',
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: '#d1d5db',
                    }}
                  >
                    <code>{generatedCode}</code>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Panel 2: Parameters */}
          {docTab === 'parameters' && (
            <Box sx={{ p: { xs: 2.5, sm: 4, md: 5 } }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 3, textAlign: 'center' }}>
                OPTIONAL QUERY PARAMETERS
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                {PARAMETERS.map((param, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: BG_SURFACE_ELEVATED,
                      border: `1px solid ${BORDER_DIM}`,
                      borderRadius: 2,
                      p: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          bgcolor: alpha(BRAND_RED, 0.15),
                          color: BRAND_RED,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 800,
                          px: 1.25,
                          py: 0.25,
                          borderRadius: 0.75,
                        }}
                      >
                        {param.name}
                      </Box>
                      <Typography variant="caption" sx={{ color: TEXT_DIM, fontFamily: 'monospace' }}>
                        {param.type} • default: {param.default}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5 }}>
                      {param.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Panel 3: Error Codes */}
          {docTab === 'errors' && (
            <Box sx={{ p: { xs: 2.5, sm: 4, md: 5 } }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 3, textAlign: 'center' }}>
                API ERROR CODES
              </Typography>
              <Stack spacing={2}>
                {ERROR_CODES.map((err, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: BG_SURFACE_ELEVATED,
                      border: `1px solid ${BORDER_DIM}`,
                      borderRadius: 2,
                      p: 2.5,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: 13,
                          color: err.color,
                          minWidth: 160,
                        }}
                      >
                        {err.code}
                      </Box>
                      <Typography variant="body2" sx={{ color: TEXT_MUTED, fontSize: 13 }}>
                        {err.desc}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Panel 4: Events (postMessage) */}
          {docTab === 'events' && (
            <Box sx={{ p: { xs: 2.5, sm: 4, md: 5 } }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 3, textAlign: 'center' }}>
                PLAYER POSTMESSAGE EVENTS
              </Typography>
              <Stack spacing={2} sx={{ mb: 4 }}>
                {eventsList.map((ev, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bgcolor: BG_SURFACE_ELEVATED,
                      border: `1px solid ${BORDER_DIM}`,
                      borderRadius: 2,
                      p: 2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        color: BRAND_RED,
                        fontWeight: 700,
                        fontSize: 14,
                        mb: 0.5,
                      }}
                    >
                      {ev.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: TEXT_MUTED, fontSize: 13 }}>
                      {ev.desc}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {/* Code Example for postMessage */}
              <Typography variant="caption" sx={{ fontWeight: 800, color: TEXT_DIM, letterSpacing: 1, display: 'block', mb: 1.5 }}>
                JAVASCRIPT EVENT LISTENER EXAMPLE
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: '#07090d',
                  border: `1px solid ${BORDER_DIM}`,
                  borderRadius: 2,
                  p: 2.5,
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: '#d1d5db',
                  lineHeight: 1.7,
                }}
              >
                <code>{`window.addEventListener('message', (event) => {\n  if (event.data?.source === '${brandSource}') {\n    console.log('${brand} Event:', event.data.event, event.data);\n    if (event.data.event === 'play') {\n      // Video started\n    } else if (event.data.event === 'ended') {\n      // Video finished\n    }\n  }\n});`}</code>
              </Box>
            </Box>
          )}
        </Box>
      </Container>

      {/* Frequently Asked Questions */}
      <Container
        id="faq"
        maxWidth="md"
        sx={{
          mb: { xs: 12, md: 16 },
          scrollMarginTop: 90,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 900, color: 'common.white', mb: 1, textAlign: 'center' }}>
          Frequently Asked Questions
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 5, textAlign: 'center' }}>
          Everything you need to know about the {brand} API integration.
        </Typography>

        <Stack spacing={2}>
          {faqsList.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Box
                key={idx}
                onClick={() => toggleFaq(idx)}
                sx={{
                  bgcolor: BG_SURFACE,
                  border: `1px solid ${isOpen ? alpha(BRAND_RED, 0.4) : BORDER_DIM}`,
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: BORDER_HIGHLIGHT },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ p: 2.5 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 } }}>
                    {faq.q}
                  </Typography>
                  <Iconify
                    icon="solar:alt-arrow-down-bold"
                    width={18}
                    sx={{
                      color: BRAND_RED,
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.25s',
                      flexShrink: 0,
                      ml: 2,
                    }}
                  />
                </Stack>
                <Collapse in={isOpen}>
                  <Box
                    sx={{
                      px: 2.5,
                      pb: 2.5,
                      pt: 1,
                      borderTop: `1px solid ${BORDER_DIM}`,
                      color: TEXT_MUTED,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {faq.a}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          borderTop: `1px solid ${BORDER_DIM}`,
          pt: 6,
          textAlign: 'center',
          color: TEXT_DIM,
          fontSize: 12,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: TEXT_MUTED }}>
            © {new Date().getFullYear()} {brand} Embed API. All Rights Reserved.
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', maxWidth: 650, mx: 'auto', lineHeight: 1.6 }}>
            {brand} Embed is a video aggregator and indexing service. We do not host, transcode, or store any
            copyright-protected video media on our servers. All media streams are dynamically scraped and
            indexed from public community links.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
