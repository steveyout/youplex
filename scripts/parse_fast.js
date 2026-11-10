const fs = require('fs');

async function main() {
  console.log('Fetching Pluto TV playlist...');
  const res = await fetch('https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plutotv_us.m3u');
  const text = await res.text();
  const lines = text.split('\n');

  const channels = [];
  const categoryMap = {
    'Movies': 'movies',
    'Entertainment': 'entertainment',
    'News + Opinion': 'news',
    'Sports': 'sports',
    'Comedy': 'entertainment',
    'Classic TV': 'entertainment',
    'Crime': 'movies',
    'True Crime': 'movies',
    'Reality': 'entertainment',
    'Game Shows': 'entertainment',
    'Daytime TV': 'entertainment',
    'Food': 'entertainment',
    'Home + DIY': 'entertainment',
    'Animals + Nature': 'documentary',
    'Sci-Fi': 'movies',
    'Anime': 'animation',
    'Drama': 'movies',
    'Kids': 'kids',
    'Music': 'music',
    'Latino': 'entertainment',
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF')) {
      const idMatch = line.match(/channel-id="([^"]+)"/);
      const nameMatch = line.match(/tvg-name="([^"]+)"/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const streamUrl = lines[i + 1]?.trim();

      if (idMatch && streamUrl && streamUrl.startsWith('http')) {
        const id = idMatch[1];
        const name = nameMatch ? nameMatch[1] : line.split(',')[1]?.trim() || 'Channel';
        const rawGroup = groupMatch ? groupMatch[1] : 'Entertainment';
        const category = categoryMap[rawGroup] || 'entertainment';

        channels.push({
          id: `pluto-${id}`,
          originalId: id,
          name,
          category,
          group: rawGroup,
          logo: logoMatch ? logoMatch[1] : null,
          streamUrl,
          provider: 'pluto',
          country: 'usa',
          firstLetter: name[0].toUpperCase(),
        });
      }
    }
  }

  console.log(`Parsed ${channels.length} Pluto TV channels.`);
  console.log('Sample channel:', channels[0]);

  // Now fetch curated top channels from IPTV-org (News, Sports, Docs)
  console.log('Fetching IPTV-org news playlist...');
  const newsRes = await fetch('https://iptv-org.github.io/iptv/categories/news.m3u');
  const newsText = await newsRes.text();
  const newsLines = newsText.split('\n');
  const curatedIptv = [
    { name: 'Sky News', category: 'news' },
    { name: 'Al Jazeera', category: 'news' },
    { name: 'ABC News', category: 'news' },
    { name: 'CBS News', category: 'news' },
    { name: 'France 24', category: 'news' },
    { name: 'DW News', category: 'news' },
    { name: 'Euronews', category: 'news' },
    { name: 'Bloomberg', category: 'news' },
    { name: 'Red Bull TV', category: 'sports' },
    { name: 'NASA TV', category: 'documentary' },
  ];

  let iptvCount = 0;
  for (const target of curatedIptv) {
    for (let i = 0; i < newsLines.length; i++) {
      if (newsLines[i].startsWith('#EXTINF') && newsLines[i].includes(target.name)) {
        const logoMatch = newsLines[i].match(/tvg-logo="([^"]+)"/);
        const streamUrl = newsLines[i + 1]?.trim();
        if (streamUrl && streamUrl.startsWith('http')) {
          const id = `iptv-${target.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          channels.push({
            id,
            originalId: id,
            name: target.name,
            category: target.category,
            group: 'News',
            logo: logoMatch ? logoMatch[1] : null,
            streamUrl,
            provider: 'iptv-org',
            country: 'international',
            firstLetter: target.name[0].toUpperCase(),
          });
          iptvCount++;
          break;
        }
      }
    }
  }

  console.log(`Added ${iptvCount} curated IPTV-org channels.`);
  console.log(`Total native channels: ${channels.length}`);

  const output = {
    totalChannels: channels.length,
    lastUpdated: new Date().toISOString(),
    channels,
  };

  fs.writeFileSync('lib/data/fast-channels.json', JSON.stringify(output, null, 2), 'utf8');
  console.log('Saved to lib/data/fast-channels.json successfully!');
}

main().catch(console.error);
