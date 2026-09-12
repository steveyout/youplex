import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';

import { SliderRow } from '@/components/slider-row/slider-row';

import { PostItemSkeleton } from './post-skeleton';
import { PostItem, PostItemLatest } from './post-item';

// ----------------------------------------------------------------------

export function PostList({ posts, loading, startIndex = 0 }) {
  const renderLoading = (
    <Box
      gap={3}
      display="grid"
      gridTemplateColumns={{
        xs: 'repeat(2, 1fr)',
        sm: 'repeat(3, 1fr)',
        md: 'repeat(5, 1fr)',
        lg: 'repeat(6, 1fr)',
      }}
    >
      <PostItemSkeleton amount={12} />
    </Box>
  );

  const renderMobileScroll = (
    <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1 }}>
      <SliderRow itemWidth={{ xs: 148, sm: 175 }} gap={1.75}>
        {posts.map((post, index) => (
          <Box key={post.id}>
            <PostItem post={post} index={startIndex + index} />
          </Box>
        ))}
      </SliderRow>
    </Box>
  );

  const renderFeatured = (
    <Grid container spacing={3}>
      {posts.slice(0, 4).map((post, index) => (
        <Grid key={post.id} xs={12} sm={6} md={6} lg={3}>
          <PostItemLatest post={post} index={startIndex + index} />
        </Grid>
      ))}
    </Grid>
  );

  const renderStandard = (
    <Grid container spacing={2.5}>
      {posts.slice(4, posts.length).map((post, index) => (
        <Grid key={post.id} xs={6} sm={4} md={4} lg={2}>
          <PostItem post={post} index={startIndex + index + 4} />
        </Grid>
      ))}
    </Grid>
  );

  const renderDesktop = (
    <Stack spacing={3} sx={{ display: { xs: 'none', md: 'block' } }}>
      {posts.length > 0 && renderFeatured}
      {posts.length > 4 && renderStandard}
    </Stack>
  );

  return (
    <>
      {loading ? renderLoading : (
        <>
          {renderMobileScroll}
          {renderDesktop}
        </>
      )}
    </>
  );
}
