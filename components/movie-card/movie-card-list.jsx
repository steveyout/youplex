import React from 'react';
import Grid from '@mui/material/Grid';
import MovieCard from './movie-card';

// ----------------------------------------------------------------------

export default function MovieCardList({ movies }) {
  return (
    <Grid container spacing={3}>
      {movies.map((movie) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={movie.id}>
          <MovieCard movie={movie} />
        </Grid>
      ))}
    </Grid>
  );
}
