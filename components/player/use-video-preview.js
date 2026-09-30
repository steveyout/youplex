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
 * 1. Live <canvas> element rendering (bypasses CORS toDataURL SecurityError completely).
 * 2. Canvas frame cache to store rendered frames for instant re-display during scrubbing.
 * 3. Continuous frame harvester that samples the main playing video on timeupdate/seeked/interval.
 * 4. Dedicated off-screen low-bitrate <video> that seeks to un-played timestamps.
 */
export function useVideoPreview({ videoSrc, hoverTime, isHovering }) {
  const previewCanvasRef = useRef(null);
  const previewVideoRef = useRef(null);
  const canvasCacheRef = useRef(new Map());
  const hlsInstanceRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const [hasFrame, setHasFrame] = useState(false);

  // 1. Off-screen video element in DOM layout for unplayed chunk seeking
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.setAttribute('data-preview-video', 'true');
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText =
      'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
    document.body.appendChild(video);
    previewVideoRef.current = video;

    const capturePreviewVideoFrame = () => {
      try {
        if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return;

        const sec = Math.floor(video.currentTime);
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 180;
        const cCtx = c.getContext('2d');
        if (cCtx) {
          cCtx.drawImage(video, 0, 0, 320, 180);
          canvasCacheRef.current.set(sec, c);
          for (let d = 1; d <= 2; d++) {
            if (!canvasCacheRef.current.has(sec - d)) canvasCacheRef.current.set(sec - d, c);
            if (!canvasCacheRef.current.has(sec + d)) canvasCacheRef.current.set(sec + d, c);
          }

          if (canvasCacheRef.current.size > 200) {
            const firstKey = canvasCacheRef.current.keys().next().value;
            canvasCacheRef.current.delete(firstKey);
          }

          if (previewCanvasRef.current) {
            const pCtx = previewCanvasRef.current.getContext('2d');
            if (pCtx) {
              pCtx.drawImage(c, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
              setHasFrame(true);
            }
          }
        }
      } catch {}
    };

    video.addEventListener('seeked', capturePreviewVideoFrame);
    video.addEventListener('canplay', capturePreviewVideoFrame);
    video.addEventListener('loadeddata', capturePreviewVideoFrame);

    return () => {
      video.removeEventListener('seeked', capturePreviewVideoFrame);
      video.removeEventListener('canplay', capturePreviewVideoFrame);
      video.removeEventListener('loadeddata', capturePreviewVideoFrame);

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
    if (!video || !videoSrc) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return undefined;
    }

    const isHls =
      videoSrc.includes('.m3u8') ||
      videoSrc.includes('/api/hls') ||
      videoSrc.includes('m3u8-proxy');

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
              capLevelToPlayerSize: true,
              maxBufferLength: 4,
              maxMaxBufferLength: 8,
              enableWorker: true,
            });
            hlsInstanceRef.current = hls;
            hls.loadSource(videoSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
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
      video.src = videoSrc;
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
        if (!mainVideo || mainVideo.videoWidth <= 0) return;

        const sec = Math.floor(mainVideo.currentTime);
        if (canvasCacheRef.current.has(sec)) return;

        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 180;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(mainVideo, 0, 0, 320, 180);
          canvasCacheRef.current.set(sec, c);
          if (canvasCacheRef.current.size > 200) {
            const firstKey = canvasCacheRef.current.keys().next().value;
            canvasCacheRef.current.delete(firstKey);
          }
        }
      } catch {}
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

  // 4. On hover: immediate paint from mainVideo or canvasCache, and debounce seek for previewVideo
  useEffect(() => {
    if (!isHovering || hoverTime == null || !Number.isFinite(hoverTime)) {
      return undefined;
    }

    const roundedTime = Math.floor(hoverTime);
    let painted = false;

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

    // A. If hovering within 5s of mainVideo's current playback position, draw live
    const mainVideo = getMainVideo();
    if (mainVideo && mainVideo.videoWidth > 0 && Math.abs(mainVideo.currentTime - hoverTime) < 5) {
      painted = drawToCanvas(mainVideo);
    }

    // B. Look up closest frame in canvasCache
    if (!painted && canvasCacheRef.current.size > 0) {
      let closestCanvas = null;
      let minDiff = Infinity;

      for (const [sec, c] of canvasCacheRef.current.entries()) {
        const diff = Math.abs(sec - roundedTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestCanvas = c;
        }
      }

      if (closestCanvas && minDiff < 90) {
        painted = drawToCanvas(closestCanvas);
      }
    }

    // C. Seek offscreen preview video for unplayed timestamps (debounced 120ms)
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    seekTimeoutRef.current = setTimeout(() => {
      const pVideo = previewVideoRef.current;
      if (!pVideo) return;
      try {
        pVideo.currentTime = Math.max(0, hoverTime);
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
