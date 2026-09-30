'use client';

import { useMemo } from 'react';

/**
 * Normalizes chapters for a movie or episode.
 * Chapters are ONLY created if:
 * 1. Explicit chapters are provided by the stream/track metadata (real chapters).
 * 2. Real timeline segments (intro/recap/credits from IntroDB) exist.
 *
 * Fake or arbitrary narrative arc chapters (e.g. "The Setup", "Inciting Incident")
 * are strictly omitted so playback always matches the actual movie.
 *
 * @param {Object} options
 * @param {number} [options.duration] - Total media duration in seconds
 * @param {Array} [options.timelineSegments] - Intro/recap/credits segments
 * @param {Array} [options.explicitChapters] - Real chapters from stream if supplied
 * @param {string} [options.type] - 'movie' or 'tv'
 * @returns {Array} List of normalized chapter objects
 */
export function buildChapters({
  duration = 0,
  timelineSegments = [],
  explicitChapters = null,
  type = 'movie',
} = {}) {
  const maxSec = typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (maxSec <= 0) return [];

  // 1. If explicit real chapters are provided (e.g. from VTT chapter track or metadata), use them
  if (Array.isArray(explicitChapters) && explicitChapters.length > 0) {
    return explicitChapters
      .filter((c) => c && typeof c.start === 'number')
      .map((c, idx) => ({
        id: c.id || `explicit-ch-${idx}`,
        index: idx + 1,
        title: c.title || `Chapter ${idx + 1}`,
        rawTitle: c.title || `Chapter ${idx + 1}`,
        start: Math.max(0, Math.min(maxSec, c.start)),
        end: Math.max(c.start, Math.min(maxSec, c.end != null ? c.end : maxSec)),
        type: c.type || 'chapter',
        badge: c.title ? c.title.slice(0, 16) : `CH ${idx + 1}`,
        isRealChapter: true,
        isSegment: false,
      }));
  }

  // 2. If real timelineSegments (Intro/Recap/Credits from IntroDB) exist, map ONLY those real segments
  const segments = [];
  if (Array.isArray(timelineSegments) && timelineSegments.length > 0) {
    for (const seg of timelineSegments) {
      if (!seg || typeof seg.start !== 'number' || typeof seg.end !== 'number') continue;
      const sStart = Math.max(0, Math.min(maxSec, seg.start));
      const sEnd = Math.max(sStart, Math.min(maxSec, seg.end));
      if (sEnd <= sStart) continue;

      const isIntro = seg.type === 'intro';
      const isRecap = seg.type === 'recap';
      const isCredits = seg.type === 'credits' || seg.type === 'outro';

      const label = isIntro
        ? 'Opening / Intro'
        : isRecap
        ? 'Recap'
        : isCredits
        ? 'End Credits'
        : seg.label || 'Segment';

      const badge = isIntro
        ? 'INTRO'
        : isRecap
        ? 'RECAP'
        : isCredits
        ? 'CREDITS'
        : 'SEGMENT';

      segments.push({
        id: `seg-${seg.type}-${sStart}`,
        title: label,
        rawTitle: label,
        start: sStart,
        end: sEnd,
        type: seg.type,
        badge,
        isRealChapter: false,
        isSegment: true,
      });
    }
  }

  // Sort by start time
  segments.sort((a, b) => a.start - b.start);
  return segments;
}

/**
 * React hook to compute and access chapters
 */
export function useMovieChapters({
  duration = 0,
  timelineSegments = [],
  explicitChapters = null,
  type = 'movie',
} = {}) {
  const chapters = useMemo(
    () => buildChapters({ duration, timelineSegments, explicitChapters, type }),
    [duration, timelineSegments, explicitChapters, type]
  );

  const getChapterAtTime = (time) => {
    if (!chapters || chapters.length === 0) return null;
    const t = Math.max(0, Number(time) || 0);
    return chapters.find((ch) => t >= ch.start && t < ch.end) || null;
  };

  return {
    chapters,
    getChapterAtTime,
    hasChapters: chapters.length > 0,
  };
}
