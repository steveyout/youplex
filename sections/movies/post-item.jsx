import { paths } from '@/routes/paths';
import { Image } from '@/components/image';
import { Label } from '@/components/label';
import { fDate } from '@/utils/format-time';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { maxLine, varAlpha } from '@/theme/styles';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

// Helper to construct TMDB image URLs
const getPosterUrl = (path) =>
  path ? `${process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL}${path}` : '/assets/placeholder.jpg';

// ----------------------------------------------------------------------

export function PostItem({ post }) {
  const theme = useTheme();

  const { id, title, name, release_date, first_air_date, poster_path, vote_average, media_type } = post;

  // TV shows use 'name', movies use 'title'
  const displayTitle = title || name;
  const displayDate = release_date || first_air_date;
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id,displayTitle);

  return (
    <Card sx={{ '&:hover .poster-overlay': { opacity: 1 } }}>
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        {vote_average > 0 && (
          <Label
            variant="filled"
            color={(vote_average >= 7 && 'success') || (vote_average >= 5 && 'warning') || 'error'}
            sx={{
              top: 8,
              right: 8,
              zIndex: 9,
              position: 'absolute',
            }}
          >
            {vote_average.toFixed(1)}
          </Label>
        )}

        <Image
          alt={displayTitle}
          src={getPosterUrl(poster_path)}
          ratio="2/3" // standard watch poster ratio
        />
      </Box>

      <CardContent sx={{ pt: 2, pb: 2 }}>
        <Typography variant="caption" component="div" sx={{ mb: 0.5, color: 'text.disabled' }}>
          {displayDate ? fDate(displayDate) : 'Unknown Date'}
        </Typography>

        <Link
          component={RouterLink}
          href={linkTo}
          color="inherit"
          variant="subtitle2"
          sx={{ ...maxLine({ line: 1, persistent: theme.typography.subtitle2 }) }}
        >
          {displayTitle}
        </Link>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1, typography: 'caption', color: 'text.secondary' }}>
          <Iconify icon="solar:videocamera-record-bold" width={14} />
          <Box component="span" sx={{ textTransform: 'capitalize' }}>{type}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function PostItemLatest({ post }) {
  const theme = useTheme();

  const { id, title, name, release_date, first_air_date, backdrop_path, vote_average, media_type } = post;

  const displayTitle = title || name;
  const displayDate = release_date || first_air_date;
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id,displayTitle);

  // For "Latest/Featured", we usually use the backdrop (wide image) instead of poster
  const backdropUrl = backdrop_path
    ? `https://image.tmdb.org/t/p/original${backdrop_path}`
    : getPosterUrl(post.poster_path);

  return (
    <Card sx={{ height: 360 }}>
      <Label
        variant="filled"
        color="info"
        sx={{
          top: 16,
          right: 16,
          zIndex: 9,
          position: 'absolute',
          textTransform: 'uppercase'
        }}
      >
        Trending
      </Label>

      <Image
        alt={displayTitle}
        src={backdropUrl}
        sx={{ height: 1 }}
        slotProps={{ overlay: { bgcolor: varAlpha(theme.vars.palette.grey['900Channel'], 0.48) } }}
      />

      <CardContent
        sx={{
          width: 1,
          zIndex: 9,
          bottom: 0,
          position: 'absolute',
          color: 'common.white',
        }}
      >
        <Typography variant="caption" component="div" sx={{ mb: 1, opacity: 0.64 }}>
          {displayDate ? fDate(displayDate) : 'Recently Released'}
        </Typography>

        <Link
          component={RouterLink}
          href={linkTo}
          color="inherit"
          variant="h5"
          sx={{ ...maxLine({ line: 2, persistent: theme.typography.h5 }) }}
        >
          {displayTitle}
        </Link>

        <Stack direction="row" spacing={2} sx={{ mt: 2, typography: 'subtitle2' }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="eva:star-fill" sx={{ color: 'warning.main' }} />
            {vote_average.toFixed(1)}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ opacity: 0.8 }}>
            <Iconify icon="solar:play-bold" />
            Watch Now
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
