import { fetchWithDns, getBaseUrls } from '@/lib/livetv/fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SPORT_ICONS = {
  soccer: '⚽',
  football: '🏈',
  basketball: '🏀',
  tennis: '🎾',
  cricket: '🏏',
  hockey: '🏒',
  baseball: '⚾',
  golf: '⛳',
  motorsport: '🏎️',
  racing: '🏎️',
  boxing: '🥊',
  mma: '🥊',
  ufc: '🥊',
  wrestling: '🤼',
  wwe: '🤼',
  volleyball: '🏐',
  darts: '🎯',
  snooker: '🎱',
  badminton: '🏸',
  cycling: '🚴',
  tv: '📺',
  shows: '📺',
};

function iconFor(name) {
  const lower = (name || '').toLowerCase();
  const key = Object.keys(SPORT_ICONS).find((item) => lower.includes(item));
  return key ? SPORT_ICONS[key] : '📺';
}

function isoTime(time) {
  const match = (time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const now = new Date();
  now.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  return now.toISOString();
}

function checkIsLive(timeStr, now = new Date()) {
  const match = (timeStr || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const eventHours = parseInt(match[1], 10);
  const eventMins = parseInt(match[2], 10);
  const eventTotalMins = eventHours * 60 + eventMins;

  const curHours = now.getUTCHours();
  const curMins = now.getUTCMinutes();
  const curTotalMins = curHours * 60 + curMins;

  const diff = curTotalMins - eventTotalMins;
  // Live if scheduled within 15 mins from now, or started in the last 2.5 hours
  return diff >= -15 && diff <= 160;
}

export async function GET() {
  const baseUrls = getBaseUrls();
  let scheduleData = null;
  let lastError = null;

  for (const base of baseUrls) {
    try {
      const url = `${base}/schedule/schedule-generated.json`;
      const res = await fetchWithDns(url, {
        headers: {
          Referer: `${base}/`,
          Accept: 'application/json, text/plain, */*',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            scheduleData = parsed;
            break;
          }
        } catch {
          // Response was not JSON (e.g. HTML challenge/error page), try next mirror
        }
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!scheduleData || typeof scheduleData !== 'object') {
    console.warn('[Live TV schedule] Unable to fetch schedule:', lastError?.message);
    return Response.json({
      success: true,
      schedule: { categories: [] },
      warning: 'Schedule temporarily unavailable',
    });
  }

  try {
    const categoriesMap = new Map();
    const now = new Date();

    for (const [dateHeader, catGroup] of Object.entries(scheduleData)) {
      if (!catGroup || typeof catGroup !== 'object') continue;

      for (const [catRaw, eventList] of Object.entries(catGroup)) {
        if (!Array.isArray(eventList)) continue;

        const cleanCategory = catRaw.replace(/<[^>]*>/g, '').trim() || 'Other';
        if (!categoriesMap.has(cleanCategory)) {
          categoriesMap.set(cleanCategory, {
            name: cleanCategory,
            icon: iconFor(cleanCategory),
            events: [],
          });
        }

        const catObj = categoriesMap.get(cleanCategory);

        for (const item of eventList) {
          const title = (item.event || '').trim();
          if (!title) continue;

          const time = (item.time || '').trim();
          const rawChannels = [...(item.channels || []), ...(item.channels2 || [])];
          const channels = rawChannels
            .map((ch) => ({
              name: (ch.channel_name || '').trim(),
              channelId: String(ch.channel_id || '').trim(),
            }))
            .filter((ch) => ch.name && ch.channelId);

          const isLive = checkIsLive(time, now);
          const teamsMatch = title.match(/(.+?)\s+vs\.?\s+(.+)/i);

          const cleanCatSlug = cleanCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const cleanTitleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
          const id = `event-${cleanCatSlug}-${catObj.events.length}-${cleanTitleSlug}`;

          catObj.events.push({
            id,
            title,
            sport: cleanCategory,
            time,
            isoTime: isoTime(time),
            isLive,
            channels,
            ...(teamsMatch
              ? {
                  teams: {
                    home: teamsMatch[1].trim(),
                    away: teamsMatch[2].trim(),
                  },
                }
              : {}),
          });
        }
      }
    }

    const categories = Array.from(categoriesMap.values()).filter((c) => c.events.length > 0);
    const totalEvents = categories.reduce((sum, c) => sum + c.events.length, 0);
    const liveEvents = categories.reduce((sum, c) => sum + c.events.filter((e) => e.isLive).length, 0);

    return Response.json({
      success: true,
      schedule: { categories },
      stats: {
        totalEvents,
        liveEvents,
      },
    });
  } catch (error) {
    console.error('[Live TV schedule parsing error]', error);
    return Response.json({
      success: true,
      schedule: { categories: [] },
      warning: 'Schedule parsing failed',
    });
  }
}
