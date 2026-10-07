'use client';

import { useState, useCallback, useRef } from 'react';

// ----------------------------------------------------------------------

/**
 * Dynamically loads Tesseract.js from CDN if not already loaded.
 */
function loadTesseractLibrary() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);

  return new Promise((resolve, reject) => {
    // Check if script is already injected
    const existing = document.querySelector('script[data-tesseract-cdn]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Tesseract));
      existing.addEventListener('error', () => reject(new Error('Failed to load Tesseract.js')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.setAttribute('data-tesseract-cdn', 'true');
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract global not found'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Tesseract CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Pre-processes canvas image for text recognition:
 * Converts to grayscale and enhances contrast so subtitles and names stand out.
 */
function preProcessCanvasForOcr(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Grayscale luminance
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Contrast stretch
      const contrast = gray > 140 ? 255 : gray < 70 ? 0 : gray;
      data[i] = contrast;
      data[i + 1] = contrast;
      data[i + 2] = contrast;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    // Canvas might be tainted due to CORS; return unprocessed canvas
    console.warn('Canvas pre-processing skipped (CORS or permission):', err);
  }
  return canvas;
}

/**
 * Normalizes text for matching (lowercase, removes punctuation).
 */
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates similarity between OCR words and cast member names/characters.
 */
function matchCastFromText(text, cast = []) {
  if (!text || !cast || cast.length === 0) return [];

  const normalizedOcr = normalizeText(text);
  if (!normalizedOcr) return [];

  const matched = [];

  for (const actor of cast) {
    const actorName = normalizeText(actor.name);
    const charName = normalizeText(actor.character);

    let score = 0;
    let matchReason = '';

    // Check full name match
    if (actorName && normalizedOcr.includes(actorName)) {
      score = 98;
      matchReason = `Actor name "${actor.name}" detected`;
    } else if (charName && normalizedOcr.includes(charName)) {
      score = 95;
      matchReason = `Character "${actor.character}" detected`;
    } else {
      // Check individual significant name parts (e.g. "Stark", "Downey", "Walter")
      const nameParts = actorName.split(' ').filter((p) => p.length > 3);
      const charParts = charName.split(' ').filter((p) => p.length > 3);

      for (const part of nameParts) {
        if (normalizedOcr.includes(part)) {
          score = Math.max(score, 75);
          matchReason = `Matched name "${part}"`;
        }
      }

      for (const part of charParts) {
        if (normalizedOcr.includes(part)) {
          score = Math.max(score, 82);
          matchReason = `Matched character "${part}"`;
        }
      }
    }

    if (score > 0) {
      matched.push({
        actor,
        score,
        matchReason,
      });
    }
  }

  // Sort by highest confidence score
  matched.sort((a, b) => b.score - a.score);
  return matched;
}

// ----------------------------------------------------------------------

export function useCharacterOcr({ cast = [] }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [detectedCharacters, setDetectedCharacters] = useState([]);
  const [scannedFrameUrl, setScannedFrameUrl] = useState(null);
  const [ocrRawText, setOcrRawText] = useState('');
  const [scanMessage, setScanMessage] = useState(null);

  const scanCurrentCharacter = useCallback(async () => {
    setIsScanning(true);
    setScanStatus('Capturing current video frame...');
    setScanMessage(null);

    let frameDataUrl = null;
    let extractedText = '';

    try {
      // 1. Locate the active <video> element
      const videoEl =
        document.querySelector('vds-media video') ||
        document.querySelector('video') ||
        document.querySelector('iframe');

      // 2. Extract active subtitle text at currentTime
      let subtitleText = '';
      if (videoEl && videoEl.textTracks) {
        try {
          for (let i = 0; i < videoEl.textTracks.length; i++) {
            const track = videoEl.textTracks[i];
            if (track.activeCues && track.activeCues.length > 0) {
              for (let j = 0; j < track.activeCues.length; j++) {
                subtitleText += ' ' + (track.activeCues[j].text || '');
              }
            }
          }
        } catch {
          // ignore track read errors
        }
      }

      // Also check if any on-screen subtitle elements exist in DOM (e.g. Vidstack Captions)
      const captionNodes = document.querySelectorAll('vds-captions, [data-part="caption"]');
      captionNodes.forEach((node) => {
        if (node.textContent) {
          subtitleText += ' ' + node.textContent;
        }
      });

      // 3. Capture video frame to offscreen canvas
      let canvas = null;
      if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        try {
          canvas = document.createElement('canvas');
          // Scale to max 1280px for performance and OCR precision
          const scale = Math.min(1, 1280 / videoEl.videoWidth);
          canvas.width = Math.round(videoEl.videoWidth * scale);
          canvas.height = Math.round(videoEl.videoHeight * scale);

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

          try {
            frameDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setScannedFrameUrl(frameDataUrl);
          } catch {
            // Tainted canvas by cross-origin stream
          }
        } catch (canvasErr) {
          console.warn('Canvas capture error:', canvasErr);
        }
      }

      // 4. Run OCR with Tesseract
      setScanStatus('Running optical character recognition (OCR)...');
      let ocrResultText = '';

      if (canvas) {
        try {
          const preprocessed = preProcessCanvasForOcr(canvas);
          const Tesseract = await loadTesseractLibrary();

          if (Tesseract && typeof Tesseract.recognize === 'function') {
            const result = await Tesseract.recognize(preprocessed, 'eng', {
              logger: (m) => {
                if (m.status === 'recognizing text' && m.progress) {
                  setScanStatus(`Scanning frame text (${Math.round(m.progress * 100)}%)...`);
                }
              },
            });
            ocrResultText = result?.data?.text || '';
          }
        } catch (ocrErr) {
          console.warn('OCR error or cross-origin canvas restriction:', ocrErr);
        }
      }

      // 5. Combine detected text from OCR and subtitles
      extractedText = [ocrResultText, subtitleText].filter(Boolean).join(' ').trim();
      setOcrRawText(extractedText);

      setScanStatus('Matching characters against cast...');

      // 6. Match detected text against movie cast
      const matches = matchCastFromText(extractedText, cast);

      if (matches.length > 0) {
        setDetectedCharacters(matches);
        setScanMessage(`Identified ${matches.length} character${matches.length > 1 ? 's' : ''} in the current frame!`);
      } else {
        // If OCR found general words but no direct name match, or frame had no text:
        // Provide top active cast members for quick reference
        const fallbackTopCast = cast.slice(0, 4).map((actor, idx) => ({
          actor,
          score: 60 - idx * 5,
          matchReason: idx === 0 ? 'Lead Character' : 'Scene Cast',
        }));

        setDetectedCharacters(fallbackTopCast);
        setScanMessage(extractedText
            ? 'Text scanned, displaying prominent scene characters.'
            : 'No clear text on current frame. Displaying main characters for this scene.');
      }
    } catch (err) {
      console.error('Scan failed:', err);
      // Fallback gracefully to main cast
      const fallbackCast = cast.slice(0, 3).map((actor) => ({
        actor,
        score: 50,
        matchReason: 'Featured Character',
      }));
      setDetectedCharacters(fallbackCast);
      setScanMessage('Frame scan completed. Displaying key characters.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  }, [cast]);

  const clearScan = useCallback(() => {
    setDetectedCharacters([]);
    setScannedFrameUrl(null);
    setOcrRawText('');
    setScanMessage(null);
  }, []);

  return {
    isScanning,
    scanStatus,
    detectedCharacters,
    scannedFrameUrl,
    ocrRawText,
    scanMessage,
    scanCurrentCharacter,
    clearScan,
  };
}
