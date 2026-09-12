export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const icons = {
  soccer: '⚽', football: '🏈', basketball: '🏀', tennis: '🎾', cricket: '🏏',
  hockey: '🏒', baseball: '⚾', golf: '⛳', motorsport: '🏎️', boxing: '🥊',
  mma: '🥊', ufc: '🥊', wwe: '🤼', volleyball: '🏐',
};

function iconFor(name) {
  const key = Object.keys(icons).find((item) => name.toLowerCase().includes(item));
  return key ? icons[key] : '📺';
}

function isoTime(time) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const now = new Date();
  now.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  return now.toISOString();
}

function parseEvents(html, category) {
  const events = [];
  const eventPattern = /<div[^>]*class="[^"]*schedule__event[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*schedule__event|$)/gi;
  let match;
  while ((match = eventPattern.exec(html))) {
    const block = match[0];
    const time = block.match(/schedule__time[^>]*>([^<]*)</i)?.[1]?.trim() || '';
    const title = block.match(/schedule__eventTitle[^>]*>([^<]*)</i)?.[1]?.trim() || '';
    if (!title) continue;
    const dataTime = block.match(/data-time="([^"]*)"/i)?.[1] || '';
    const channels = [...block.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi)]
      .map((item) => ({ name: item[2].trim(), channelId: item[1].match(/id=(\d+)/)?.[1] || '', href: item[1] }))
      .filter((item) => item.name);
    const eventDate = dataTime && /^\d+$/.test(dataTime) ? new Date(Number(dataTime) * 1000) : new Date(isoTime(time));
    const isLive = /is-live|>LIVE</i.test(block)
      || (eventDate.toString() !== 'Invalid Date' && Date.now() - eventDate.getTime() >= 0 && Date.now() - eventDate.getTime() < 3600000);
    const teams = title.match(/(.+?)\s+vs\.?\s+(.+)/i);
    events.push({
      id: `event-${category}-${events.length}`,
      title,
      sport: category,
      time,
      isoTime: isoTime(time),
      isLive,
      channels,
      ...(teams ? { teams: { home: teams[1].trim(), away: teams[2].trim() } } : {}),
    });
  }
  return events;
}

export async function GET() {
  try {
    const response = await fetch('https://dlhd.st/', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
    const html = await response.text();
    const categories = [];
    const categoryPattern = /<div[^>]*class="card__meta"[^>]*>([^<]+)<\/div>/gi;
    const matches = [...html.matchAll(categoryPattern)];
    matches.forEach((match, index) => {
      const start = match.index;
      const end = matches[index + 1]?.index || html.length;
      const name = match[1].trim();
      const events = parseEvents(html.slice(start, end), name);
      if (events.length) categories.push({ name, icon: iconFor(name), events });
    });
    return Response.json({ success: true, schedule: { categories }, stats: {
      totalEvents: categories.reduce((sum, category) => sum + category.events.length, 0),
      liveEvents: categories.reduce((sum, category) => sum + category.events.filter((event) => event.isLive).length, 0),
    } });
  } catch (error) {
    console.error('[Live TV schedule]', error);
    return Response.json({ success: true, schedule: { categories: [] }, warning: 'Schedule temporarily unavailable' });
  }
}
