'use client';

import { useParams } from 'next/navigation';
import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

export default function TvEpisodeEmbedPage() {
  const params = useParams();
  const id = params?.id;
  const season = params?.season || 1;
  const episode = params?.episode || 1;

  return <EmbedPlayerView type="tv" id={id} season={season} episode={episode} />;
}
