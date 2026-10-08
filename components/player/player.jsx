'use client';

import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/captions.css';

import { Iconify } from '@/components/iconify';
import { getIntroTimestamps } from '@/actions/api';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Track, Captions, MediaPlayer, MediaProvider } from '@vidstack/react';
import { getEmbedUrl, DEFAULT_PROVIDER_ID, providers as defaultProviders } from '@/config/providers';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import NativeControls from './native-controls';

// ----------------------------------------------------------------------

const MODE_KEY = 'youplex-playback-mode';

const BRAND_COLOR = '#FF3030';

/**
 * Disguise real extractor names in the UI with a fixed pool of neutral alias
 * words. The alias for a provider is derived from a stable hash of its id.
 */
const EXTRACTOR_ALIASES = [
  'Aurora',
  'Nova',
  'Polaris',
  'Orbit',
  'Zenith',
  'Vega',
  'Atlas',
  'Phoenix',
  'Pulsar',
  'Meridian',
  'Quasar',
  'Titan',
  'Solstice',
  'Comet',
  'Drift',
  'Eclipse',
];

function hashId(value) {
  const text = String(value ?? '');
  return Array.from(text).reduce((hash, ch) => Math.imul(hash, 31) + ch.charCodeAt(0), 0);
}

function extractorAlias(id) {
  const hash = Math.abs(hashId(id));
  return EXTRACTOR_ALIASES[hash % EXTRACTOR_ALIASES.length];
}

/**
 * Map direct stream objects into Vidstack source format.
 * If alreadyProxied is true, the URL is used directly.
 */
function isUrlProxied(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('/api/hls') ||
    url.startsWith('/proxy') ||
    url.startsWith('/api/subtitles') ||
    url.includes('proxy.youplex.site') ||
    url.includes('/api/hls?') ||
    url.includes('/proxy?') ||
    url.includes('m3u8-proxy')
  );
}

function toProxyUrl(source) {
  if (!source?.url) return '';
  const { url } = source;

  // Subtitles always need CORS headers and proper VTT formatting
  if (source.isSubtitle || url.endsWith('.vtt') || url.endsWith('.srt') || url.includes('.vtt?') || url.includes('.srt?')) {
    if (url.startsWith('/api/subtitles') || (url.startsWith('/') && !url.startsWith('/proxy'))) return url;
    return `/api/subtitles?url=${encodeURIComponent(url)}`;
  }

  if (isUrlProxied(url)) {
    return url;
  }

  const params = new URLSearchParams({ url });
  if (source.headers?.referer) params.set('referer', source.headers.referer);
  if (source.headers?.origin) params.set('origin', source.headers.origin);
  const ua = source.headers?.['user-agent'] || source.headers?.['User-Agent'];
  if (ua) params.set('ua', ua);
  return `/api/hls?${params.toString()}`;
}

function toVidstackSrcs(sources) {
  const list = Array.isArray(sources) ? sources : sources?.sources;
  if (!list || !Array.isArray(list) || list.length === 0) return [];

  return list
    .filter((s) => Boolean(s?.url))
    .map((s) => {
      const srcUrl = isUrlProxied(s.url) ? s.url : toProxyUrl(s);

      if (
        s.type === 'hls' ||
        Boolean(s.isM3U8) ||
        srcUrl.includes('.m3u8') ||
        srcUrl.includes('m3u8-proxy') ||
        srcUrl.includes('/api/hls') ||
        s.type === 'application/x-mpegurl'
      ) {
        return { src: srcUrl, type: 'application/x-mpegurl' };
      }
      return { src: srcUrl, type: 'video/mp4' };
    });
}

const EMPTY_ARRAY = Object.freeze([]);


const SUBTITLE_LANGUAGE_MAP = {
  en: 'English', eng: 'English',
  es: 'Spanish', spa: 'Spanish',
  fr: 'French', fre: 'French', fra: 'French',
  de: 'German', ger: 'German', deu: 'German',
  it: 'Italian', ita: 'Italian',
  pt: 'Portuguese', por: 'Portuguese',
  ru: 'Russian', rus: 'Russian',
  ja: 'Japanese', jpn: 'Japanese',
  ko: 'Korean', kor: 'Korean',
  zh: 'Chinese', chi: 'Chinese', zho: 'Chinese',
  ar: 'Arabic', ara: 'Arabic',
  hi: 'Hindi', hin: 'Hindi',
  id: 'Indonesian', ind: 'Indonesian',
  tr: 'Turkish', tur: 'Turkish',
  nl: 'Dutch', dut: 'Dutch', nld: 'Dutch',
  pl: 'Polish', pol: 'Polish',
  sv: 'Swedish', swe: 'Swedish',
  da: 'Danish', dan: 'Danish',
  fi: 'Finnish', fin: 'Finnish',
  no: 'Norwegian', nor: 'Norwegian',
  cs: 'Czech', ces: 'Czech', cze: 'Czech',
  el: 'Greek', ell: 'Greek', gre: 'Greek',
  he: 'Hebrew', heb: 'Hebrew',
  hu: 'Hungarian', hun: 'Hungarian',
  ro: 'Romanian', ron: 'Romanian', rum: 'Romanian',
  th: 'Thai', tha: 'Thai',
  vi: 'Vietnamese', vie: 'Vietnamese',
  uk: 'Ukrainian', ukr: 'Ukrainian',
  ms: 'Malay', msa: 'Malay', may: 'Malay',
  fil: 'Filipino', tl: 'Tagalog',
};

function normalizeSubtitles(subtitles) {
  if (!Array.isArray(subtitles)) return [];

  const seenUrls = new Set();
  const rawList = [];

  for (const track of subtitles) {
    if (!track?.url || seenUrls.has(track.url)) continue;
    seenUrls.add(track.url);

    let langCode = (track.language || track.lang || '').toLowerCase().trim();
    let langName = SUBTITLE_LANGUAGE_MAP[langCode];
    if (!langName) {
      const raw = `${track.label || ''}`.toLowerCase();
      for (const [code, name] of Object.entries(SUBTITLE_LANGUAGE_MAP)) {
        if (raw.includes(name.toLowerCase())) {
          langCode = code;
          langName = name;
          break;
        }
      }
      if (!langName) langName = track.label || 'English';
    }

    const rawSearch = `${track.label || ''} ${track.url || ''}`.toLowerCase();
    const isCC = Boolean(
      track.isCC ||
      track.hearingImpaired ||
      /sdh|hearing[_\s]impaired|\[cc\]|\(cc\)/i.test(track.label || '') ||
      /sdh|hearing/i.test(track.url || '')
    );
    const isForced = Boolean(
      track.isForced ||
      /forced|forzar|foreign/i.test(track.label || '') ||
      /forced/i.test(track.url || '')
    );
    const isOpenSubs = Boolean(
      track.source === 'opensubtitles' ||
      /opensubtitles/i.test(track.label || '') ||
      /dl\.opensubtitles\.org/i.test(track.url || '')
    );

    const relMatch = (track.label || '').match(/(?:BluRay|BDRip|BRRip|WEB-DL|WEBRip|HDTV|HDRip|DVDRip|YIFY|PSA|RARBG)/i);
    const release = relMatch ? relMatch[0] : '';

    let category = 'stream_std';
    let baseLabel = '';

    if (isOpenSubs) {
      if (isForced) {
        category = 'os_forced';
        baseLabel = `${langName} [Forced] (OpenSubtitles)`;
      } else if (isCC) {
        category = 'os_sdh';
        baseLabel = `${langName} [SDH] (OpenSubtitles)`;
      } else if (release) {
        category = 'os_std';
        baseLabel = `${langName} [${release}] (OpenSubtitles)`;
      } else {
        category = 'os_std';
        baseLabel = `${langName} (OpenSubtitles)`;
      }
    } else {
      if (isForced) {
        category = 'stream_forced';
        baseLabel = `${langName} [Forced]`;
      } else if (isCC) {
        category = 'stream_sdh';
        baseLabel = `${langName} [SDH]`;
      } else {
        category = 'stream_std';
        baseLabel = `${langName} [Stream]`;
      }
    }

    rawList.push({
      ...track,
      langCode,
      langName,
      category,
      baseLabel,
      isEnglish: langName === 'English',
    });
  }

  // Cap counts per category to prevent 10+ ambiguous English options
  const categoryCounts = {};
  const filtered = [];

  for (const item of rawList) {
    const key = `${item.langName}_${item.category}`;
    const count = categoryCounts[key] || 0;
    // Keep max 2 stream_std for English, 1 for others; max 1 each for SDH, Forced, OpenSubtitles
    const maxAllowed = item.category === 'stream_std' && item.isEnglish ? 2 : 1;
    if (count < maxAllowed) {
      categoryCounts[key] = count + 1;
      let label = item.baseLabel;
      if (count > 0 && item.category === 'stream_std') {
        label = `${item.langName} [Stream ${count + 1}]`;
      }
      filtered.push({ ...item, displayLabel: label });
    }
  }

  // Sort: English first (Stream -> SDH -> Forced -> OpenSubtitles), then others alphabetically
  const catOrder = {
    stream_std: 1,
    stream_sdh: 2,
    stream_forced: 3,
    os_std: 4,
    os_sdh: 5,
    os_forced: 6,
  };

  filtered.sort((a, b) => {
    if (a.isEnglish && !b.isEnglish) return -1;
    if (!a.isEnglish && b.isEnglish) return 1;
    if (a.langName !== b.langName) return a.langName.localeCompare(b.langName);
    return (catOrder[a.category] || 99) - (catOrder[b.category] || 99);
  });

  return filtered;
}

export default function Player({
  src,
  servers = EMPTY_ARRAY,
  directSources = EMPTY_ARRAY,
  subtitles = EMPTY_ARRAY,
  extractorProviders = EMPTY_ARRAY,
  activeExtractorId = null,
  sourcesLoading = false,
  loading = false,
  sourcesError = null,
  scrapeFeedback = null,
  onSelectExtractor,
  onRetrySources,
  allowEmbedMode = true,
  title,
  season,
  episode,
  backdrop,
  sceneImages = EMPTY_ARRAY,
  poster,
  type,
  id,
  tmdbId,
  onBack,
  timelineSegments: initialTimelineSegments = EMPTY_ARRAY,
  hasNextEpisode = false,
  onNextEpisode = null,
  chapters = null,
  cast = EMPTY_ARRAY,
  seasons = EMPTY_ARRAY,
  seasonEpisodes = EMPTY_ARRAY,
  seasonEpisodesLoading = false,
  onSelectEpisode = null,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [playbackMode, setPlaybackMode] = useState('native');
  const [selectedEmbedId, setSelectedEmbedId] = useState(null);
  const normalizedSubtitles = useMemo(() => normalizeSubtitles(subtitles), [subtitles]);
  const [selectedExtractorId, setSelectedExtractorId] = useState(null);
  const [failedExtractorId, setFailedExtractorId] = useState(null);
  const [playbackError, setPlaybackError] = useState(null);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState(null);
  const [embedHeaderVisible, setEmbedHeaderVisible] = useState(false);
  const [embedSrvAnchor, setEmbedSrvAnchor] = useState(null);
  const [timelineSegments, setTimelineSegments] = useState(initialTimelineSegments);
  const [videoDurationMs, setVideoDurationMs] = useState(null);

  const autoRetryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  const resolvedTmdbId = tmdbId || id;
  const resolvedSeasonNum = season ? Number(season) : undefined;
  const resolvedEpisodeNum = episode ? Number(episode) : undefined;

  // Always ensure each movie/show starts from native player first and clear legacy stored embed mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(MODE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  // Always reset to native player whenever media changes (movie/show or episode)
  useEffect(() => {
    setPlaybackMode('native');
    setPlaybackError(null);
    setSelectedExtractorId(null);
    setFailedExtractorId(null);
    setSelectedEmbedId(null);
    setIsLoading(true);
    setPlaybackAttempt(0);
    autoRetryCountRef.current = 0;
    setIsAutoRetrying(false);
    setAutoSwitchNotice(null);
  }, [resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum]);

  // Load Google Cast Web SDK for Chromecast support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.querySelector('script[src*="cast_sender.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Reset retry counters on source / stream change
  useEffect(() => {
    autoRetryCountRef.current = 0;
    setIsAutoRetrying(false);
    setPlaybackError(null);
  }, [src, directSources, activeExtractorId, selectedExtractorId]);

  // Sync external initial timeline segments
  useEffect(() => {
    if (initialTimelineSegments && initialTimelineSegments.length > 0) {
      setTimelineSegments(initialTimelineSegments);
    }
  }, [initialTimelineSegments]);

  // Auto-fetch intro/outro timestamps if not passed from server
  const lastTimestampsKeyRef = useRef('');

  useEffect(() => {
    let active = true;

    if (initialTimelineSegments && initialTimelineSegments.length > 0) {
      setTimelineSegments(initialTimelineSegments);
    } else if (!resolvedTmdbId) {
      setTimelineSegments((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY));
    } else {
      const isTv = type === 'tv';
      const requestKey = `${resolvedTmdbId}:${type || 'movie'}:${isTv ? resolvedSeasonNum : 'm'}:${isTv ? resolvedEpisodeNum : 'm'}:${videoDurationMs || 'none'}`;
      if (lastTimestampsKeyRef.current !== requestKey) {
        lastTimestampsKeyRef.current = requestKey;

        getIntroTimestamps({
          tmdbId: resolvedTmdbId,
          type: type || 'movie',
          ...(isTv ? { season: resolvedSeasonNum, episode: resolvedEpisodeNum } : {}),
          ...(videoDurationMs ? { durationMs: videoDurationMs } : {}),
        })
          .then((res) => {
            if (active && res?.success && Array.isArray(res.segments)) {
              setTimelineSegments(res.segments);
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      active = false;
    };
  }, [resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum, videoDurationMs, initialTimelineSegments]);

  // Auto-fill segments with null end time (e.g. End Credits) once video duration is known
  useEffect(() => {
    if (videoDurationMs && Number(videoDurationMs) > 60000) {
      const durSec = Math.round(Number(videoDurationMs) / 1000);
      setTimelineSegments((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const needsUpdate = prev.some((s) => s.end == null);
        if (!needsUpdate) return prev;
        return prev.map((s) => (s.end == null ? { ...s, end: durSec } : s));
      });
    }
  }, [videoDurationMs]);

  // All native sources mapped to the Vidstack src array
  const nativeSrc = useMemo(() => toVidstackSrcs(directSources), [directSources]);
  const nativeReady = nativeSrc.length > 0;

  // Once native stream is mapped and ready, dismiss loading and ensure native mode is active
  useEffect(() => {
    if (nativeReady) {
      setIsLoading(false);
      setPlaybackMode('native');
      setPlaybackError(null);
    }
  }, [nativeReady]);
  const activeNativeSrc = nativeSrc[0]?.src;
  const resolvedMode = playbackMode;

  // Build server list based on mode
  const serverList = useMemo(() => {
    if (resolvedMode === 'native') {
      return extractorProviders.map((ep) => ({
        id: ep.id,
        name: (ep.label || extractorAlias(ep.id)).replace(/\\s*\\([^)]*\\)/g, '').trim(),
        kind: 'extractor',
      }));
    }
    const baseProviders = servers && servers.length > 0 ? servers : defaultProviders.filter((p) => p.enabled);
    return baseProviders.map((s) => ({
      id: s.id,
      name: (s.name || '').replace(/\\s*\\([^)]*\\)/g, '').trim(),
      kind: 'embed',
      url: resolvedTmdbId
        ? getEmbedUrl(s.id, type, resolvedTmdbId, resolvedSeasonNum, resolvedEpisodeNum)
        : s.url || src,
    }));
  }, [resolvedMode, extractorProviders, servers, resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum, src]);

  // Determine active embed URL
  const activeEmbedUrl = useMemo(() => {
    if (playbackMode === 'embed') {
      const targetId = selectedEmbedId || servers[0]?.id || DEFAULT_PROVIDER_ID;
      const matched = serverList.find((s) => s.id === targetId);
      if (matched?.url) return matched.url;

      if (resolvedTmdbId) {
        return getEmbedUrl(DEFAULT_PROVIDER_ID, type, resolvedTmdbId, resolvedSeasonNum, resolvedEpisodeNum);
      }
      return src;
    }
    return src;
  }, [playbackMode, selectedEmbedId, servers, serverList, resolvedTmdbId, type, resolvedSeasonNum, resolvedEpisodeNum, src]);

  const effectiveSelectedExtractor = selectedExtractorId ?? activeExtractorId;
  const embedAvailable = allowEmbedMode && (Boolean(activeEmbedUrl) || Boolean(src) || servers.length > 0);

  // Auto-clear embed loading indicator after 1500ms max so player is never stuck behind a loader
  useEffect(() => {
    let timer = null;
    if (resolvedMode === 'embed') {
      setIsLoading(false);
      timer = setTimeout(() => {
        setEmbedLoading(false);
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resolvedMode, activeEmbedUrl]);

  // Keep loader consistent with async background scraping state
  useEffect(() => {
    if (resolvedMode === 'native') {
      if (sourcesLoading) {
        setIsLoading(true);
      } else if (nativeReady) {
        setIsLoading(false);
      } else if (sourcesError) {
        setIsLoading(false);
      }
    }
  }, [sourcesLoading, nativeReady, sourcesError, resolvedMode]);

  // When native scraping finishes without any playable streams, auto-switch to Embed Player
  useEffect(() => {
    if (
      resolvedMode === 'native' &&
      !sourcesLoading &&
      !nativeReady &&
      !loading &&
      (sourcesError || (Array.isArray(directSources?.sources) && directSources.sources.length === 0))
    ) {
      if (allowEmbedMode && embedAvailable) {
        const timer = setTimeout(() => {
          setPlaybackMode('embed');
          setIsLoading(false);
          setEmbedLoading(true);
          setAutoSwitchNotice('Native stream unavailable. Switched to Embed Player.');
          setTimeout(() => setAutoSwitchNotice(null), 4000);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [resolvedMode, sourcesLoading, nativeReady, loading, sourcesError, directSources, allowEmbedMode, embedAvailable]);

  // Safety timer: Never allow spinning loader to persist indefinitely
  useEffect(() => {
    if (!isLoading) return undefined;
    const safetyTimer = setTimeout(() => {
      if (!sourcesLoading && !nativeReady) {
        setAutoSwitchNotice('Native stream is taking longer than usual.');
        setTimeout(() => setAutoSwitchNotice(null), 5000);
      }
      setIsLoading(false);
    }, 20000);
    return () => clearTimeout(safetyTimer);
  }, [
    isLoading,
    allowEmbedMode,
    embedAvailable,
    resolvedMode,
    sourcesLoading,
    loading,
    nativeReady,
    sourcesError,
    scrapeFeedback?.status,
  ]);

  useEffect(() => {
    autoRetryCountRef.current = 0;
    setIsAutoRetrying(false);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [activeNativeSrc, effectiveSelectedExtractor]);

  // Current server label
  const currentServerLabel = useMemo(() => {
    if (resolvedMode === 'native') {
      const active = extractorProviders.find((e) => e.id === effectiveSelectedExtractor);
      return active ? (active.label || extractorAlias(active.id)) : 'Native Player';
    }
    const embedServer = serverList.find((s) => s.id === selectedEmbedId);
    return embedServer?.name || serverList[0]?.name || (servers[0]?.name ?? 'Embed Server');
  }, [resolvedMode, serverList, selectedEmbedId, extractorProviders, effectiveSelectedExtractor, servers]);

  // Storyboard / Thumbnail VTT track if provided by extractor
  const thumbnailsUrl = useMemo(() => {
    let raw = directSources?.thumbnailTrack?.url || null;
    if (!raw && Array.isArray(directSources)) {
      const match = directSources.find((s) => Boolean(s?.thumbnailTrack?.url || s?.thumbnails));
      if (match) {
        raw = match.thumbnailTrack?.url || match.thumbnails;
      }
    }
    if (!raw) return null;
    return toProxyUrl({ url: raw, isSubtitle: true });
  }, [directSources]);

  const handleModeChange = useCallback((newMode) => {
    if (newMode && newMode !== playbackMode) {
      setPlaybackMode(newMode);
      setPlaybackError(null);
      setAutoSwitchNotice(null);
      if (newMode === 'native') {
        setIsLoading(true);
      } else {
        setIsLoading(false);
        setEmbedLoading(true);
      }
      setPlaybackAttempt((attempt) => attempt + 1);
    }
  }, [playbackMode]);

  const handleSelectServer = useCallback(
    async (server) => {
      if (!server) return;
      if (resolvedMode === 'native') {
        setSelectedExtractorId(server.id);
        setFailedExtractorId(null);
        setPlaybackError(null);
        setIsLoading(true);
        if (onSelectExtractor) {
          const success = await onSelectExtractor(server.id);
          if (!success) {
            setFailedExtractorId(server.id);
          }
        }
      } else {
        setSelectedEmbedId(server.id);
        setPlaybackError(null);
        setEmbedLoading(true);
        setPlaybackAttempt((attempt) => attempt + 1);
      }
    },
    [resolvedMode, onSelectExtractor]
  );

  const handleRetry = useCallback(() => {
    setPlaybackError(null);
    setIsLoading(true);
    setPlaybackAttempt((attempt) => attempt + 1);
    if (onRetrySources) {
      onRetrySources();
    }
  }, [onRetrySources]);

  const renderPlayer = () => {
    if (resolvedMode === 'native') {
      if (nativeReady && !playbackError) {
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              bgcolor: '#000',
              zIndex: playbackError ? 12 : 1,
              '& media-player': {
                width: '100%',
                height: '100%',
                '--video-aspect-ratio': 'unset',
              },
            }}
          >
            <MediaPlayer
              key={`native-player-${activeNativeSrc}-${playbackAttempt}`}
              src={nativeSrc}
              crossOrigin="anonymous"
              autoPlay
              playsInline
              title={title || ''}
              googleCast={{
                androidReceiverCompatible: true,
              }}
              onCanPlay={() => {
                setIsLoading(false);
                autoRetryCountRef.current = 0;
                setIsAutoRetrying(false);
                setPlaybackError(null);
              }}
              onLoadedData={() => {
                setIsLoading(false);
              }}
              onLoadedMetadata={() => {
                setIsLoading(false);
              }}
              onPlaying={() => {
                setIsLoading(false);
              }}
              onPlay={() => {
                setIsLoading(false);
              }}
              onEnd={() => {
                if (hasNextEpisode && typeof onNextEpisode === 'function') {
                  onNextEpisode();
                }
              }}
              onEnded={() => {
                if (hasNextEpisode && typeof onNextEpisode === 'function') {
                  onNextEpisode();
                }
              }}
              onDurationChange={(detail) => {
                const dur = typeof detail === 'number' ? detail : detail?.detail;
                if (typeof dur === 'number' && Number.isFinite(dur) && dur > 60) {
                  setVideoDurationMs(Math.round(dur * 1000));
                }
              }}
              onError={(detail) => {
                console.warn('Native player playback error:', detail);
                setIsLoading(false);

                // Auto-retry on transient playback failure
                if (autoRetryCountRef.current < 2) {
                  autoRetryCountRef.current += 1;
                  setIsAutoRetrying(true);
                  setAutoSwitchNotice('Stream interrupted. Retrying native playback...');
                  retryTimerRef.current = setTimeout(() => {
                    setIsAutoRetrying(false);
                    setAutoSwitchNotice(null);
                    setPlaybackAttempt((prev) => prev + 1);
                  }, 1500);
                  return;
                }

                setIsAutoRetrying(false);

                // Do not auto-switch to embed when native stream was found.
                // Keep the player on native and display error UI with options to switch or retry.
                setPlaybackError(
                  'The native stream encountered an error. You can retry, choose another extractor, or switch to Embed Player.'
                );
              }}
            >
              <MediaProvider>
                {normalizedSubtitles.map((track, index) => (
                  <Track
                    key={`${track.url}-${index}`}
                    src={toProxyUrl({ url: track.url, isSubtitle: true })}
                    type="vtt"
                    kind="subtitles"
                    label={track.displayLabel}
                    lang={track.langCode || 'en'}
                    default={index === 0 && Boolean(track.isEnglish)}
                  />
                ))}</MediaProvider>
              <Captions className="youplex-vds-captions vds-captions" />
              <NativeControls
                title={title}
                season={season}
                episode={episode}
                onBack={onBack}
                resolvedMode={resolvedMode}
                allowModeChange={allowEmbedMode}
                serverList={serverList}
                effectiveSelectedExtractor={effectiveSelectedExtractor}
                selectedEmbedId={selectedEmbedId}
                failedExtractorId={failedExtractorId}
                onSelectServer={handleSelectServer}
                handleSelectServer={handleSelectServer}
                currentServerLabel={currentServerLabel}
                sourcesLoading={sourcesLoading}
                videoSrc={activeNativeSrc}
                thumbnailsUrl={thumbnailsUrl}
                onModeChange={handleModeChange}
                timelineSegments={timelineSegments}
                hasNextEpisode={hasNextEpisode}
                onNextEpisode={onNextEpisode}
                backdrop={backdrop}
                sceneImages={sceneImages}
                poster={poster}
                type={type}
                id={id || tmdbId}
                tmdbId={tmdbId || id}
                chapters={chapters}
                cast={cast}
                seasons={seasons}
                seasonEpisodes={seasonEpisodes}
                seasonEpisodesLoading={seasonEpisodesLoading}
                onSelectEpisode={onSelectEpisode}
              />
            </MediaPlayer>
          </Box>
        );
      }
    }

    if (resolvedMode === 'embed') {
      return (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#000' }}>
          {/* Subtle Embed Controls overlay (top bar) */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              p: { xs: 1, sm: 1.5 },
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: embedHeaderVisible ? 1 : 0,
              pointerEvents: embedHeaderVisible ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {onBack && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={onBack}
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
                  sx={{
                    bgcolor: alpha('#ffffff', 0.15),
                    color: 'common.white',
                    fontSize: 12,
                    px: 1.25,
                    backdropFilter: 'blur(8px)',
                    '&:hover': { bgcolor: alpha('#ffffff', 0.25) },
                  }}
                >
                  Back
                </Button>
              )}
              {title && (
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{
                    color: 'common.white',
                    fontWeight: 600,
                    fontSize: { xs: 12, sm: 14 },
                    maxWidth: { xs: 140, sm: 260 },
                  }}
                >
                  {title} {season ? `• S${season} E${episode}` : ''}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* Embed Server Switcher button */}
              <Button
                size="small"
                variant="contained"
                onClick={(e) => setEmbedSrvAnchor(e.currentTarget)}
                startIcon={<Iconify icon="solar:server-square-bold" width={16} />}
                sx={{
                  bgcolor: alpha('#ffffff', 0.15),
                  color: 'common.white',
                  fontSize: 12,
                  px: 1.25,
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: alpha('#ffffff', 0.25) },
                }}
              >
                {currentServerLabel}
              </Button>

              <Menu
                anchorEl={embedSrvAnchor}
                open={Boolean(embedSrvAnchor)}
                onClose={() => setEmbedSrvAnchor(null)}
                slotProps={{
                  paper: {
                    sx: {
                      bgcolor: '#0d1117',
                      color: 'common.white',
                      border: `1px solid ${alpha('#ffffff', 0.15)}`,
                      minWidth: 160,
                    },
                  },
                }}
              >
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Select Embed Server
                </Typography>
                <Divider sx={{ borderColor: alpha('#ffffff', 0.1) }} />
                {serverList.map((srv) => {
                  const isSelected = (selectedEmbedId || serverList[0]?.id) === srv.id;
                  return (
                    <MenuItem
                      key={srv.id}
                      selected={isSelected}
                      onClick={() => {
                        setEmbedSrvAnchor(null);
                        handleSelectServer(srv);
                      }}
                      sx={{
                        fontSize: 13,
                        color: isSelected ? 'primary.main' : 'common.white',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {srv.name}
                    </MenuItem>
                  );
                })}
              </Menu>

              {/* Mode Toggle Button: Switch back to Native */}
              {allowEmbedMode && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleModeChange('native')}
                  startIcon={<Iconify icon="solar:play-stream-bold-duotone" width={16} />}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    fontSize: 12,
                    px: 1.25,
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  Native Player
                </Button>
              )}
            </Stack>
          </Box>

          {/* Embed Loading indicator (fade out quickly so iframe is never stuck) */}
          {embedLoading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#000',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <CircularProgress size={48} sx={{ color: 'primary.main' }} />
            </Box>
          )}

          <iframe
            key={`embed-${activeEmbedUrl}-${playbackAttempt}`}
            src={activeEmbedUrl}
            width="100%"
            height="100%"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Media player"
            onLoad={() => {
              setIsLoading(false);
              setEmbedLoading(false);
            }}
            onError={() => {
              setIsLoading(false);
              setEmbedLoading(false);
              setPlaybackError('The embed player failed to load. Try another server or switch to Native.');
            }}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, border: 0, overflow: 'hidden' }}
          />
        </Box>
      );
    }

    // Empty state - if native returned empty or error, offer instant embed switch or retry
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ position: 'relative', zIndex: 1, height: 1, color: 'text.disabled', p: 3 }}
      >
        <Iconify icon="solar:videocamera-broken" width={56} sx={{ color: alpha('#ffffff', 0.3) }} />
        <Typography variant="h6" sx={{ color: 'common.white' }}>
          {sourcesError ? 'Native stream unavailable' : 'No direct stream found'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 420 }}>
          {sourcesError
            ? 'Native scraper could not resolve a stream immediately. You can switch to our fast Embed server or search again.'
            : 'Direct stream could not be loaded. You can switch to embed servers instantly to watch now.'}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {allowEmbedMode && embedAvailable && (
            <Button
              variant="contained"
              onClick={() => handleModeChange('embed')}
              startIcon={<Iconify icon="solar:code-bold" />}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              Switch to Embed Player
            </Button>
          )}
          {onRetrySources && (
            <Button
              variant="outlined"
              onClick={handleRetry}
              startIcon={<Iconify icon="solar:refresh-bold" />}
              sx={{ color: 'common.white', borderColor: alpha('#ffffff', 0.2) }}
            >
              Retry Native
            </Button>
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <Box className="youplex-player" sx={{ width: 1 }}>
      {/* Player Canvas Box */}
      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: { xs: 'auto', sm: '16/9' },
          minHeight: { xs: '70vh', sm: 360, md: 480 },
          height: { xs: '75vh', sm: 'auto' },
          '@media (orientation: landscape) and (max-height: 500px)': {
            height: '100vh',
            minHeight: '100vh',
          },
          overflow: 'hidden',
          bgcolor: '#000',
          borderRadius: { xs: 0, sm: 3 },
          border: { xs: 'none', sm: `1px solid ${alpha('#ffffff', 0.12)}` },
          boxShadow: { xs: 'none', sm: `0 24px 60px -12px ${alpha('#000000', 0.9)}` },
          '--media-brand': BRAND_COLOR,
          '--media-font-family': '"Public Sans", sans-serif',
          '& media-player': {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          },
        }}
        onMouseEnter={() => {
          if (resolvedMode === 'embed') setEmbedHeaderVisible(true);
        }}
        onMouseLeave={() => {
          if (resolvedMode === 'embed') setEmbedHeaderVisible(false);
        }}
        onTouchStart={() => {
          if (resolvedMode === 'embed') {
            setEmbedHeaderVisible(true);
            setTimeout(() => setEmbedHeaderVisible(false), 4000);
          }
        }}
      >
        {renderPlayer()}

        {/* Transient auto-switch or retry notice banner */}
        {autoSwitchNotice && (
          <Box
            sx={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 15,
              px: 2,
              py: 0.8,
              borderRadius: 2,
              bgcolor: alpha('#111827', 0.92),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#FF3030', 0.3)}`,
              color: 'common.white',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              animation: 'youplex-fade-up 0.25s ease',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                boxShadow: '0 0 8px #FF3030',
              }}
            />
            {autoSwitchNotice}
          </Box>
        )}

        {/* Global Loading overlay (fade out when ready) */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(5, 7, 9, 0.82)',
              backdropFilter: 'blur(12px)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              pointerEvents: 'none',
              animation: 'fade-in 0.2s ease',
            }}
          >
            <CircularProgress size={52} thickness={4} sx={{ color: 'primary.main' }} />
            <Stack alignItems="center" spacing={0.5} sx={{ px: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ color: 'common.white', fontWeight: 600 }}>
                {scrapeFeedback?.message || 'Connecting to best media source...'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {sourcesLoading ? 'Scraping high-speed direct streams' : 'Buffering media stream'}
              </Typography>
            </Stack>

            {scrapeFeedback?.status === 'pending' && (
              <Box sx={{ width: 180, mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={scrapeFeedback.percentage}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: alpha('#ffffff', 0.1),
                    '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
