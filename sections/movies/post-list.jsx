import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';


import { PostItemSkeleton } from './post-skeleton';
import { PostItem, PostItemLatest } from './post-item';

// ----------------------------------------------------------------------

export function PostList({ posts, loading }) {
  const renderLoading = (
    <Box
      gap={3}
      display="grid"
      gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
    >
      <PostItemSkeleton />
    </Box>
  );

  const renderList = (
    <Grid container spacing={3}>
      {posts.slice(0, 3).map((post, index) => (
        <Grid
          key={post.id}
          xs={12}
          sm={6}
          md={4}
          lg={index === 0 ? 6 : 3}
          sx={{ display: { xs: 'none', lg: 'block' } }}
        >
          <PostItemLatest post={post} index={index} />
        </Grid>
      ))}

      {posts.slice(0, 3).map((post) => (
        <Grid key={post.id} xs={12} sm={6} md={4} lg={3} sx={{ display: { lg: 'none' } }}>
          <PostItem post={post} />
        </Grid>
      ))}

      {posts.slice(3, posts.length).map((post) => (
        <Grid key={post.id} xs={12} sm={6} md={4} lg={3}>
          <PostItem post={post} />
        </Grid>
      ))}
    </Grid>
  );

  return (
    <>
      {loading ? renderLoading : renderList}
    </>
  );
}
