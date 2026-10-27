'use client';

import { useParams } from 'next/navigation';
import { EmbedPlayerView } from '@/components/embed/embed-player-view';

// ----------------------------------------------------------------------

export default function MovieEmbedPage() {
  const params = useParams();
  const id = params?.id;

  return <EmbedPlayerView type="movie" id={id} />;
}
