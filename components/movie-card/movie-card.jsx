import React from 'react';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import { Box, Stack } from '@mui/material';

// ----------------------------------------------------------------------

export default function MovieCard({ movie }) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      }}
    >
      <CardMedia
        component="img"
        height="300"
        image={movie.poster_path}
        alt={movie.title}
        sx={{
          objectFit: 'cover',
          borderRadius: '2px 2px 0 0',
        }}
      />
      <CardContent sx={{ padding: 2 }}>
        <Typography variant="h6" component="div" gutterBottom>
          {movie.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {movie.overview}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
          <Rating name="read-only" value={movie.vote_average / 2} readOnly />
          <Typography variant="body2" color="text.secondary">
            {movie.vote_average}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
