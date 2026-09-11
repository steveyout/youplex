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

export function PostItem({ post, index = 0 }) {
  const theme = useTheme();

  const { id, title, name, release_date, first_air_date, poster_path, vote_average, media_type } = post;

  // TV shows use 'name', movies use 'title'
  const displayTitle = title || name;
  const displayDate = release_date || first_air_date;
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id, displayTitle);

  return (
    <Link
      component={RouterLink}
      href={linkTo}
      sx={{
        display: 'block',
        height: '100%',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        '&:focus-visible': {
          borderRadius: 2,
          boxShadow: `0 0 0 2px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.8)}`,
        },
      }}
    >
      <Card
        sx={{
          height: 1,
          overflow: 'hidden',
          transition: theme.transitions.create(['transform', 'box-shadow'], {
            duration: 0.35,
            easing: theme.transitions.easing.easeOut,
          }),
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: `0 24px 48px -16px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.45)}`,
          },
          '&:hover .youplex-poster-img': { transform: 'scale(1.08)' },
          '&:hover .youplex-poster-overlay': { opacity: 1 },
          '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
          animation: 'youplex-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
          animationDelay: `${(index % 8) * 70}ms`,
        }}
      >
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
              borderRadius: 999,
              backdropFilter: 'blur(6px)',
            }}
          >
            <Iconify icon="solar:star-bold" width={12} sx={{ mr: 0.5 }} />
            {vote_average.toFixed(1)}
          </Label>
        )}

        <Box
          className="youplex-poster-img"
          sx={{
            transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <Image
            alt={displayTitle}
            src={getPosterUrl(poster_path)}
            ratio="2/3" // standard watch poster ratio
          />
        </Box>

        {/* Hover gradient overlay */}
        <Box
          className="youplex-poster-overlay"
          sx={{
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            zIndex: 7,
            opacity: 0,
            position: 'absolute',
            transition: 'opacity 0.35s ease',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 55%)',
          }}
        />

        {/* Glass shine sweep on hover */}
        <Box
          className="youplex-card-shine"
          sx={{
            top: 0,
            bottom: 0,
            left: '-60%',
            width: '55%',
            zIndex: 6,
            opacity: 0,
            position: 'absolute',
            pointerEvents: 'none',
            transform: 'skewX(-24deg)',
            transition: 'left 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 50%, transparent)',
          }}
        />

        {/* Hover play button */}
        <Box
          className="youplex-card-fab"
          sx={{
            top: '50%',
            left: '50%',
            zIndex: 8,
            width: 46,
            height: 46,
            opacity: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%) scale(0.6)',
            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            bgcolor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            border: '1px solid',
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <Iconify icon="solar:play-bold" width={22} sx={{ color: 'common.white' }} />
        </Box>
      </Box>

      <CardContent sx={{ pt: 2, pb: 2 }}>
        <Typography variant="caption" component="div" sx={{ mb: 0.5, color: 'text.disabled' }}>
          {displayDate ? fDate(displayDate) : 'Unknown Date'}
        </Typography>

        <Typography
          component="span"
          color="inherit"
          variant="subtitle2"
          sx={{ ...maxLine({ line: 1, persistent: theme.typography.subtitle2 }) }}
        >
          {displayTitle}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1, typography: 'caption', color: 'text.secondary' }}>
          <Iconify icon="solar:videocamera-record-bold" width={14} />
          <Box component="span" sx={{ textTransform: 'capitalize' }}>{type}</Box>
        </Stack>
      </CardContent>
      </Card>
    </Link>
  );
}

// ----------------------------------------------------------------------

export function PostItemLatest({ post, index = 0 }) {
  const theme = useTheme();

  const { id, title, name, release_date, first_air_date, backdrop_path, vote_average, media_type } = post;

  const displayTitle = title || name;
  const displayDate = release_date || first_air_date;
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id, displayTitle);

  // For "Latest/Featured", we usually use the backdrop (wide image) instead of poster
  const backdropUrl = backdrop_path
    ? `https://image.tmdb.org/t/p/original${backdrop_path}`
    : getPosterUrl(post.poster_path);

  return (
    <Link
      component={RouterLink}
      href={linkTo}
      sx={{
        display: 'block',
        height: '100%',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        '&:focus-visible': {
          borderRadius: 2,
          boxShadow: `0 0 0 2px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.8)}`,
        },
      }}
    >
      <Card
        sx={{
          height: 360,
          position: 'relative',
          overflow: 'hidden',
          transition: theme.transitions.create(['transform', 'box-shadow'], {
            duration: 0.35,
            easing: theme.transitions.easing.easeOut,
          }),
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: `0 24px 48px -16px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.45)}`,
          },
          '&:hover .youplex-poster-img': { transform: 'scale(1.06)' },
          '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
          animation: 'youplex-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
          animationDelay: `${(index % 8) * 80}ms`,
        }}
      >
      <Label
        variant="filled"
        color="info"
        sx={{
          top: 16,
          right: 16,
          zIndex: 9,
          position: 'absolute',
          textTransform: 'uppercase',
          borderRadius: 999,
          backdropFilter: 'blur(6px)',
        }}
      >
        Trending
      </Label>

      <Box
        className="youplex-poster-img"
        sx={{
          height: 1,
          transition: 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Image
          alt={displayTitle}
          src={backdropUrl}
          sx={{ height: 1 }}
          slotProps={{ overlay: { bgcolor: varAlpha(theme.vars.palette.grey['900Channel'], 0.48) } }}
        />
      </Box>

      {/* Glass shine sweep on hover */}
      <Box
        className="youplex-card-shine"
        sx={{
          top: 0,
          bottom: 0,
          left: '-60%',
          width: '55%',
          zIndex: 7,
          opacity: 0,
          position: 'absolute',
          pointerEvents: 'none',
          transform: 'skewX(-24deg)',
          transition: 'left 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 50%, transparent)',
        }}
      />

      {/* Hover play button */}
      <Box
        className="youplex-card-fab"
        sx={{
          top: '50%',
          left: '50%',
          zIndex: 8,
          width: 52,
          height: 52,
          opacity: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%) scale(0.6)',
          transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          bgcolor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.3)',
        }}
      >
        <Iconify icon="solar:play-bold" width={26} sx={{ color: 'common.white' }} />
      </Box>

      <CardContent
        sx={{
          width: 1,
          zIndex: 9,
          bottom: 0,
          position: 'absolute',
          color: 'common.white',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent 100%)',
        }}
      >
        <Typography variant="caption" component="div" sx={{ mb: 1, opacity: 0.64 }}>
          {displayDate ? fDate(displayDate) : 'Recently Released'}
        </Typography>

        <Typography
          component="span"
          color="inherit"
          variant="h5"
          sx={{ ...maxLine({ line: 2, persistent: theme.typography.h5 }) }}
        >
          {displayTitle}
        </Typography>

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
    </Link>
  );
}