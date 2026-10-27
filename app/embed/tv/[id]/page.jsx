'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

export default function TvEmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params?.id;
  const season = searchParams.get('season') || 1;
  const episode = searchParams.get('episode') || 1;

  return <EmbedPlayerView type="tv" id={id} season={season} episode={episode} />;
}
