'use client';

import { useRef, useState, useEffect } from 'react';

function getMainVideo() {
  if (typeof document === 'undefined') return null;
  return (
    document.querySelector(
      'media-player video, [data-media-player] video, .vds-video, video:not([data-preview-video])'
    ) || document.querySelector('video')
  );
}

/**
 * Hook to provide Netflix/YouTube-style video chunk thumbnail preview on progress bar hover.
 *
 * Uses:
 * 1. Live <canvas> element rendering.
 * 2. Canvas frame cache to store rendered frames for instant re-display during scrubbing.
 * 3. Continuous frame harvester that samples the main playing video.
 * 4. Dedicated off-screen low-bitrate <video> that seeks to un-played timestamps.
 */
export function useVideoPreview({ videoSrc, hoverTime, isHovering }) {
  const previewCanvasRef = useRef(null);
  const previewVideoRef = useRef(null);
  const canvasCacheRef = useRef(new Map());
  const hlsInstanceRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const currentHoverTimeRef = useRef(hoverTime);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    currentHoverTimeRef.current = hoverTime;
  }, [hoverTime]);

  // 1. Off-screen video element in DOM layout for unplayed chunk seeking
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.width = 320;
    video.height = 180;
    video.setAttribute('data-preview-video', 'true');
    video.setAttribute('aria-hidden', 'true');
    // Inside viewport with tiny opacity so browser hardware video decoder stays active
    video.style.cssText =
      'position:fixed;top:0;left:0;width:4px;height:4px;opacity:0.02;pointer-events:none;z-index:-99999;';
    document.body.appendChild(video);
    previewVideoRef.current = video;

    const capturePreviewVideoFrame = () => {
      try {
        if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;

        const sec = Math.floor(video.currentTime);
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 180;
        const cCtx = c.getContext('2d');
        if (cCtx) {
          cCtx.drawImage(video, 0, 0, 320, 180);
          canvasCacheRef.current.set(sec, c);
          for (let d = 1; d <= 5; d++) {
            if (!canvasCacheRef.current.has(sec - d)) canvasCacheRef.current.set(sec - d, c);
            if (!canvasCacheRef.current.has(sec + d)) canvasCacheRef.current.set(sec + d, c);
          }

          if (canvasCacheRef.current.size > 300) {
            const firstKey = canvasCacheRef.current.keys().next().value;
            canvasCacheRef.current.delete(firstKey);
          }

          // Only paint if user is currently hovering near this timestamp!
          const targetTime = currentHoverTimeRef.current;
          if (
            targetTime != null &&
            Number.isFinite(targetTime) &&
            Math.abs(targetTime - video.currentTime) <= 20
          ) {
            if (previewCanvasRef.current) {
              const pCtx = previewCanvasRef.current.getContext('2d');
              if (pCtx) {
                pCtx.drawImage(c, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
                setHasFrame(true);
              }
            }
          }
        }
      } catch (err) {
        // ignore cross-origin canvas security errors
      }
    };

    video.addEventListener('seeked', capturePreviewVideoFrame);
    video.addEventListener('canplay', capturePreviewVideoFrame);
    video.addEventListener('loadeddata', capturePreviewVideoFrame);
    video.addEventListener('timeupdate', capturePreviewVideoFrame);

    return () => {
      video.removeEventListener('seeked', capturePreviewVideoFrame);
      video.removeEventListener('canplay', capturePreviewVideoFrame);
      video.removeEventListener('loadeddata', capturePreviewVideoFrame);
      video.removeEventListener('timeupdate', capturePreviewVideoFrame);

      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      previewVideoRef.current = null;
    };
  }, []);

  // 2. Attach video source to preview video
  useEffect(() => {
    const video = previewVideoRef.current;
    const resolvedSrc = videoSrc || (typeof document !== 'undefined' ? getMainVideo()?.currentSrc : null);

    if (!video || !resolvedSrc) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return undefined;
    }

    const isHls =
      resolvedSrc.includes('.m3u8') ||
      resolvedSrc.includes('/api/hls') ||
      resolvedSrc.includes('m3u8-proxy');

    let isSubscribed = true;

    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (!isSubscribed) return;
          if (Hls.isSupported()) {
            if (hlsInstanceRef.current) {
              hlsInstanceRef.current.destroy();
            }
            const hls = new Hls({
              autoStartLoad: true,
              startLevel: 0,
              maxBufferLength: 10,
              maxMaxBufferLength: 20,
              enableWorker: true,
              lowLatencyMode: false,
            });
            hlsInstanceRef.current = hls;
            hls.loadSource(resolvedSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
              if (data?.levels?.length > 0) {
                hls.currentLevel = 0;
              }
              hls.startLoad();
            });
          }
        })
        .catch(() => {});
    } else {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      video.src = resolvedSrc;
      video.load();
    }

    return () => {
      isSubscribed = false;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [videoSrc]);

  // 3. Harvest frames from main video (on timeupdate, seeked, loadeddata, and interval)
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const sampleFrame = () => {
      try {
        const mainVideo = getMainVideo();
        if (!mainVideo || mainVideo.readyState < 2 || mainVideo.videoWidth <= 0) return;

        const sec = Math.floor(mainVideo.currentTime);
        if (canvasCacheRef.current.has(sec)) return;

        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 180;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(mainVideo, 0, 0, 320, 180);
          canvasCacheRef.current.set(sec, c);
          if (canvasCacheRef.current.size > 250) {
            const firstKey = canvasCacheRef.current.keys().next().value;
            canvasCacheRef.current.delete(firstKey);
          }
        }
      } catch (err) {
        // ignore cross-origin error
      }
    };

    const attachListeners = () => {
      const mainVideo = getMainVideo();
      if (!mainVideo) return;
      mainVideo.addEventListener('timeupdate', sampleFrame);
      mainVideo.addEventListener('seeked', sampleFrame);
      mainVideo.addEventListener('loadeddata', sampleFrame);
      mainVideo.addEventListener('canplay', sampleFrame);
      sampleFrame();
    };

    attachListeners();
    const interval = setInterval(() => {
      attachListeners();
      sampleFrame();
    }, 1000);

    return () => {
      clearInterval(interval);
      const mainVideo = getMainVideo();
      if (mainVideo) {
        mainVideo.removeEventListener('timeupdate', sampleFrame);
        mainVideo.removeEventListener('seeked', sampleFrame);
        mainVideo.removeEventListener('loadeddata', sampleFrame);
        mainVideo.removeEventListener('canplay', sampleFrame);
      }
    };
  }, []);

  // 4. On hover: ONLY paint if frame is close (within 15s) or clear canvas
  useEffect(() => {
    if (!isHovering || hoverTime == null || !Number.isFinite(hoverTime)) {
      setHasFrame(false);
      return undefined;
    }

    const roundedTime = Math.floor(hoverTime);

    const drawToCanvas = (source) => {
      const canvas = previewCanvasRef.current;
      if (!canvas || !source) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      try {
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        setHasFrame(true);
        return true;
      } catch {
        return false;
      }
    };

    // A. Check canvas frame cache for a frame CLOSE to hoverTime (within 15s)
    let painted = false;
    if (canvasCacheRef.current.size > 0) {
      let closestCanvas = null;
      let minDiff = Infinity;

      for (const [sec, c] of canvasCacheRef.current.entries()) {
        const diff = Math.abs(sec - roundedTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestCanvas = c;
        }
      }

      // ONLY use the cached frame if it is actually within 15 seconds
      if (closestCanvas && minDiff <= 15) {
        painted = drawToCanvas(closestCanvas);
      }
    }

    // B. If no close cached frame, check if mainVideo is within 6 seconds
    if (!painted) {
      const mainVideo = getMainVideo();
      if (
        mainVideo &&
        mainVideo.readyState >= 2 &&
        mainVideo.videoWidth > 0 &&
        Math.abs(mainVideo.currentTime - hoverTime) <= 6
      ) {
        painted = drawToCanvas(mainVideo);
      }
    }

    // C. If no frame is close, set hasFrame to false and clear canvas so scene still / backdrop shows cleanly
    if (!painted) {
      setHasFrame(false);
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // D. Seek offscreen preview video for the target timestamp (debounced 120ms)
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    seekTimeoutRef.current = setTimeout(() => {
      const pVideo = previewVideoRef.current;
      if (!pVideo) return;
      try {
        if (hlsInstanceRef.current && typeof hlsInstanceRef.current.startLoad === 'function') {
          hlsInstanceRef.current.startLoad(Math.max(0, hoverTime));
        }
        if (typeof pVideo.fastSeek === 'function') {
          pVideo.fastSeek(Math.max(0, hoverTime));
        } else {
          pVideo.currentTime = Math.max(0, hoverTime);
        }
      } catch {}
    }, 120);

    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, [isHovering, hoverTime]);

  return {
    previewCanvasRef,
    hasFrame,
  };
}
