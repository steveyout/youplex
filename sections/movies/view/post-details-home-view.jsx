'use client';

import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { fDate } from '@/utils/format-time';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { PostItem } from '../post-item';
import VideoPlayer from '../VideoPlayer';

// ----------------------------------------------------------------------

export function PostDetailsHomeView({ post, latestPosts, videoParams }) {
  const theme = useTheme();
  const router = useRouter();

  const isTv = videoParams.type === 'tv';
  const displayTitle = post?.title || post?.name || '';
  const displayDate = post?.release_date || post?.first_air_date;
  const cast = post?.credits?.cast?.slice(0, 10) || [];

  // Logic for Seasons and Episodes
  const seasons = post?.seasons?.filter((s) => s.season_number > 0) || [];
  const currentSeasonData = post?.seasons?.find((s) => s.season_number === videoParams.season);
  const totalEpisodes = currentSeasonData?.episode_count || 0;

  const handleSeasonChange = (event) => {
    const newSeason = event.target.value;
    // When changing seasons, we default back to episode 1
    const path = paths.watch.details(videoParams.type, videoParams.id, displayTitle, newSeason, 1);
    router.push(path);
  };

  return (
    <>
      <Box sx={{ bgcolor: 'common.black', py: { xs: 2, md: 5 } }}>
        <Container maxWidth="xl">
          <VideoPlayer
            tmdbId={videoParams.id}
            type={videoParams.type}
            season={videoParams.season}
            episode={videoParams.episode}
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 5 }}>
        <CustomBreadcrumbs
          links={[
            { name: 'Home', href: '/' },
            { name: isTv ? 'TV Series' : 'Movies', href: '#' },
            { name: displayTitle },
          ]}
          sx={{ mb: 3 }}
        />

        <Grid container spacing={{ xs: 3, md: 5 }}>
          <Grid xs={12} md={8}>
            <Stack spacing={3}>
              <Typography variant="h3">{displayTitle}</Typography>

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                  {displayDate ? fDate(displayDate) : 'Unknown'}
                </Typography>
                <Chip label={videoParams.type.toUpperCase()} size="small" variant="outlined" />
                {post?.vote_average > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Iconify icon="eva:star-fill" sx={{ color: 'warning.main' }} />
                    <Typography variant="subtitle2">{post.vote_average.toFixed(1)}</Typography>
                  </Stack>
                )}
              </Stack>

              {/* Enhanced Season & Episode Selector */}
              {isTv && seasons.length > 0 && (
                <Card sx={{ bgcolor: 'background.neutral', border: `1px solid ${theme.palette.divider}` }}>
                  <CardHeader
                    title="Episodes"
                    sx={{ pb: 0 }}
                    action={
                      <TextField
                        select
                        size="small"
                        value={videoParams.season}
                        onChange={handleSeasonChange}
                        SelectProps={{ sx: { typography: 'subtitle2' } }}
                        sx={{ minWidth: 120 }}
                      >
                        {seasons.map((season) => (
                          <MenuItem key={season.id} value={season.season_number}>
                            Season {season.season_number}
                          </MenuItem>
                        ))}
                      </TextField>
                    }
                  />
                  <CardContent>
                    <Box
                      display="grid"
                      gap={1}
                      gridTemplateColumns={{
                        xs: 'repeat(4, 1fr)',
                        sm: 'repeat(6, 1fr)',
                        md: 'repeat(8, 1fr)',
                        lg: 'repeat(10, 1fr)',
                      }}
                    >
                      {[...Array(totalEpisodes)].map((_, index) => {
                        const epNumber = index + 1;
                        const isSelected = epNumber === videoParams.episode;

                        return (
                          <Button
                            key={epNumber}
                            component={RouterLink}
                            href={paths.watch.details(
                              videoParams.type,
                              videoParams.id,
                              displayTitle,
                              videoParams.season,
                              epNumber
                            )}
                            variant={isSelected ? 'contained' : 'soft'}
                            color={isSelected ? 'primary' : 'inherit'}
                            sx={{ minWidth: 0, p: 1, height: 40 }}
                          >
                            {epNumber}
                          </Button>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                {post?.overview}
              </Typography>

              <Stack direction="row" flexWrap="wrap" spacing={1}>
                {post?.genres?.map((genre) => (
                  <Chip key={genre.id} label={genre.name} variant="soft" />
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* Sidebar */}
          <Grid xs={12} md={4}>
            <Typography variant="h6" sx={{ mb: 2 }}>Top Cast</Typography>
            <Stack spacing={2}>
              {cast.map((actor) => (
                <Stack key={actor.id} direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    alt={actor.name}
                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                    sx={{ width: 48, height: 48 }}
                  />
                  <Stack>
                    <Typography variant="subtitle2">{actor.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {actor.character}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Recommendations */}
      {!!latestPosts?.length && (
        <Container sx={{ py: 10 }}>
          <Typography variant="h4" sx={{ mb: 5 }}>You May Also Like</Typography>
          <Grid container spacing={3}>
            {latestPosts.slice(0, 4).map((latestPost) => (
              <Grid key={latestPost.id} xs={12} sm={6} md={4} lg={3}>
                <PostItem post={latestPost} />
              </Grid>
            ))}
          </Grid>
        </Container>
      )}
    </>
  );
}
