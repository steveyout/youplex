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
  const displayTitle = title || name || 'Untitled';
  const displayDate = release_date || first_air_date;
  const releaseYear = displayDate ? new Date(displayDate).getFullYear() : null;
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
        outline: 'none',
        '&:focus-visible': {
          borderRadius: 2.5,
          boxShadow: `0 0 0 2px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.8)}`,
        },
      }}
    >
      <Card
        sx={{
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2.5,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'background.paper',
          border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.08)}`,
          transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
            duration: 0.35,
            easing: theme.transitions.easing.easeOut,
          }),
          '&:hover': {
            transform: 'translateY(-6px)',
            borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.28),
            boxShadow: `0 20px 40px -14px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.32)}, 0 0 0 1px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.16)}`,
          },
          '&:hover .youplex-poster-img': { transform: 'scale(1.06)' },
          '&:hover .youplex-poster-overlay': { opacity: 1 },
          '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
          animation: 'youplex-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
          animationDelay: `${(index % 8) * 60}ms`,
        }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden', width: 1, aspectRatio: '2/3', bgcolor: 'grey.900' }}>
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
                fontWeight: 700,
                fontSize: '0.72rem',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                px: 0.8,
              }}
            >
              <Iconify icon="solar:star-bold" width={11} sx={{ mr: 0.4 }} />
              {vote_average.toFixed(1)}
            </Label>
          )}

          {releaseYear && (
            <Box
              sx={{
                top: 8,
                left: 8,
                zIndex: 9,
                position: 'absolute',
                px: 0.75,
                py: 0.2,
                borderRadius: 1,
                bgcolor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                color: 'common.white',
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {releaseYear}
            </Box>
          )}

          <Box
            className="youplex-poster-img"
            sx={{
              width: 1,
              height: 1,
              transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <Image
              alt={displayTitle}
              src={getPosterUrl(poster_path)}
              ratio="2/3"
              sx={{ width: 1, height: 1 }}
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
              background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
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
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)',
            }}
          />

          {/* Hover play button */}
          <Box
            className="youplex-card-fab"
            sx={{
              top: '50%',
              left: '50%',
              zIndex: 8,
              width: 48,
              height: 48,
              opacity: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%) scale(0.6)',
              transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.9),
              color: 'common.white',
              boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.6)}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Iconify icon="solar:play-bold" width={22} sx={{ ml: 0.3 }} />
          </Box>
        </Box>

        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Typography
            component="span"
            color="inherit"
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              lineHeight: 1.35,
              ...maxLine({ line: 1, persistent: theme.typography.subtitle2 }),
            }}
          >
            {displayTitle}
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75, typography: 'caption', color: 'text.secondary' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify
                icon={type === 'tv' ? 'solar:tv-bold' : 'solar:videocamera-record-bold'}
                width={13}
                sx={{ color: type === 'tv' ? 'info.main' : 'primary.main' }}
              />
              <Box component="span" sx={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 600, letterSpacing: 0.5 }}>
                {type === 'tv' ? 'Series' : 'Movie'}
              </Box>
            </Stack>

            {displayDate && (
              <Box component="span" sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                {fDate(displayDate, 'MMM yyyy')}
              </Box>
            )}
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

  const displayTitle = title || name || 'Untitled';
  const displayDate = release_date || first_air_date;
  const releaseYear = displayDate ? new Date(displayDate).getFullYear() : null;
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id, displayTitle);

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
        outline: 'none',
        '&:focus-visible': {
          borderRadius: 3,
          boxShadow: `0 0 0 2px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.8)}`,
        },
      }}
    >
      <Card
        sx={{
          height: 380,
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.1)}`,
          transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
            duration: 0.35,
            easing: theme.transitions.easing.easeOut,
          }),
          '&:hover': {
            transform: 'translateY(-6px)',
            borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.35),
            boxShadow: `0 24px 48px -14px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.4)}`,
          },
          '&:hover .youplex-poster-img': { transform: 'scale(1.06)' },
          '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
          animation: 'youplex-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
          animationDelay: `${(index % 8) * 80}ms`,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ top: 16, right: 16, zIndex: 9, position: 'absolute' }}>
          {vote_average > 0 && (
            <Label
              variant="filled"
              color={(vote_average >= 7 && 'success') || (vote_average >= 5 && 'warning') || 'error'}
              sx={{
                borderRadius: 999,
                fontWeight: 700,
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              <Iconify icon="solar:star-bold" width={12} sx={{ mr: 0.4 }} />
              {vote_average.toFixed(1)}
            </Label>
          )}

          <Label
            variant="filled"
            color="primary"
            sx={{
              textTransform: 'uppercase',
              borderRadius: 999,
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
              boxShadow: `0 4px 14px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.5)}`,
            }}
          >
            Featured
          </Label>
        </Stack>

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
            slotProps={{ overlay: { bgcolor: varAlpha(theme.vars.palette.grey['900Channel'], 0.42) } }}
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
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)',
          }}
        />

        {/* Hover play button */}
        <Box
          className="youplex-card-fab"
          sx={{
            top: '46%',
            left: '50%',
            zIndex: 8,
            width: 56,
            height: 56,
            opacity: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%) scale(0.6)',
            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            bgcolor: theme.vars.palette.primary.main,
            color: 'common.white',
            boxShadow: `0 10px 30px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.6)}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <Iconify icon="solar:play-bold" width={26} sx={{ ml: 0.3 }} />
        </Box>

        <CardContent
          sx={{
            width: 1,
            zIndex: 9,
            bottom: 0,
            position: 'absolute',
            color: 'common.white',
            p: 3,
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 65%, transparent 100%)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, opacity: 0.85, typography: 'caption' }}>
            <Box
              sx={{
                px: 0.8,
                py: 0.2,
                borderRadius: 0.75,
                bgcolor: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(6px)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {type === 'tv' ? 'Series' : 'Movie'}
            </Box>

            {releaseYear && <span>• {releaseYear}</span>}
            {displayDate && <span>• {fDate(displayDate, 'MMMM d, yyyy')}</span>}
          </Stack>

          <Typography
            component="span"
            color="inherit"
            variant="h5"
            sx={{ fontWeight: 700, ...maxLine({ line: 2, persistent: theme.typography.h5 }) }}
          >
            {displayTitle}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 2, typography: 'subtitle2' }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'primary.light', fontWeight: 700 }}>
              <Iconify icon="solar:play-circle-bold" width={18} />
              Watch Now
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Link>
  );
}
