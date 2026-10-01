'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import { useResponsive } from '@/hooks/use-responsive';

import { SliderRow } from '@/components/slider-row/slider-row';

import { PostItemSkeleton } from './post-skeleton';
import { PostItem, PostItemLatest } from './post-item';

// ----------------------------------------------------------------------

export function PostList({ posts = [], loading, startIndex = 0 }) {
  const isDesktop = useResponsive('up', 'md');

  if (loading) {
    return (
      <Box
        gap={2.5}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(5, 1fr)',
          lg: 'repeat(6, 1fr)',
        }}
      >
        <PostItemSkeleton amount={isDesktop ? 12 : 6} />
      </Box>
    );
  }

  // On mobile screens, render a fast single-pass touch slider row without duplicating DOM
  if (!isDesktop) {
    return (
      <Box sx={{ mb: 1 }}>
        <SliderRow itemWidth={{ xs: 140, sm: 168 }} gap={1.5}>
          {posts.map((post, index) => (
            <Box key={post.id}>
              <PostItem post={post} index={startIndex + index} />
            </Box>
          ))}
        </SliderRow>
      </Box>
    );
  }

  // On desktop screens, render the curated featured & standard grid
  const hasFeatured = posts.length >= 4;

  return (
    <Stack spacing={3}>
      {hasFeatured && (
        <Grid container spacing={3}>
          {posts.slice(0, 4).map((post, index) => (
            <Grid key={post.id} xs={12} sm={6} md={6} lg={3}>
              <PostItemLatest post={post} index={startIndex + index} />
            </Grid>
          ))}
        </Grid>
      )}

      {posts.length > (hasFeatured ? 4 : 0) && (
        <Grid container spacing={2.5}>
          {posts.slice(hasFeatured ? 4 : 0).map((post, index) => (
            <Grid key={post.id} xs={6} sm={4} md={4} lg={2}>
              <PostItem post={post} index={startIndex + index + (hasFeatured ? 4 : 0)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
