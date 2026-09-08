'use client';

import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/router';

import Player from '@/components/player/player'; // Corrected import path
import { getMovieOrShow } from '@/actions/api';

// ----------------------------------------------------------------------

export default function WatchPage() {
  const router = useRouter();
  const { type, title } = router.query;
  const [movieOrShow, setMovieOrShow] = useState(null);
  const [servers, setServers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMovieOrShow(type, title);
        setMovieOrShow(data);
        setServers(data.servers || []);
      } catch (error) {
        console.error('Failed to fetch movie/show:', error);
      }
    };

    fetchData();
  }, [type, title]);

  if (!movieOrShow) {
    return (
      <Container sx={{ my: 5 }}>
        <Typography variant="h6" component="div" gutterBottom>
          Loading...
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ my: 5 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="div" gutterBottom>
          {movieOrShow.title}
        </Typography>
        <Player src={movieOrShow.videoUrl} servers={servers} />
      </Stack>
    </Container>
  );
}
