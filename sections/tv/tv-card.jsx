'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { paths } from '@/routes/paths';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { useTvFocus } from './tv-focus-context';

// ----------------------------------------------------------------------

const getPosterUrl = (path) =>
  path ? `https://image.tmdb.org/t/p/w500${path}` : '/assets/placeholder.jpg';

export function TvCard({ post, rowIndex, colIndex }) {
  const router = useRouter();
  const { focusRow, focusCol } = useTvFocus();
  const cardRef = useRef(null);

  const isFocused = focusRow === rowIndex && focusCol === colIndex;

  const displayTitle = post.title || post.name || 'Untitled';
  const type = post.media_type || (post.release_date ? 'movie' : 'tv');
  const linkTo = paths.watch.details(type, post.id, displayTitle);

  // Auto-scroll focused card into view
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [isFocused]);

  // Handle Enter key
  useEffect(() => {
    if (!isFocused) return;

    const handleKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        router.push(linkTo);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFocused, linkTo, router]);

  return (
    <Box
      ref={cardRef}
      sx={{
        flexShrink: 0,
        width: { xs: 160, md: 200 },
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        borderRadius: 2,
        overflow: 'hidden',
        outline: 'none',
        position: 'relative',
        ...(isFocused && {
          transform: 'scale(1.12)',
          zIndex: 10,
          boxShadow: '0 0 0 3px #00e676, 0 8px 40px rgba(0,230,118,0.35)',
        }),
      }}
      onClick={() => router.push(linkTo)}
    >
      <Box
        component="img"
        src={getPosterUrl(post.poster_path)}
        alt={displayTitle}
        sx={{
          width: '100%',
          aspectRatio: '2/3',
          objectFit: 'cover',
          display: 'block',
          borderRadius: 2,
        }}
      />

      <Typography
        variant="subtitle2"
        noWrap
        sx={{
          mt: 1,
          px: 0.5,
          color: isFocused ? '#00e676' : 'grey.300',
          fontSize: { xs: '0.85rem', md: '1rem' },
          fontWeight: isFocused ? 700 : 500,
          transition: 'color 0.2s ease',
        }}
      >
        {displayTitle}
      </Typography>
    </Box>
  );
}
