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

// Helper to safely extract release year
function getSafeYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getFullYear();
  if (typeof dateStr === 'string' && /^\d{4}/.test(dateStr)) return dateStr.slice(0, 4);
  return null;
}

// ----------------------------------------------------------------------

export function RatingPill({ rating, size = 'small', sx }) {
  if (!rating || rating <= 0) return null;
  const isHigh = rating >= 7;
  const isMedium = rating >= 5;

  const bg = isHigh ? '#10B981' : isMedium ? '#F59E0B' : '#EF4444';
  const glow = isHigh
    ? 'rgba(16, 185, 129, 0.45)'
    : isMedium
    ? 'rgba(245, 158, 11, 0.45)'
    : 'rgba(239, 68, 68, 0.45)';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        px: size === 'small' ? 0.85 : 1,
        py: size === 'small' ? 0.25 : 0.4,
        borderRadius: 999,
        fontWeight: 800,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        lineHeight: 1,
        color: '#FFFFFF',
        bgcolor: bg,
        border: '1px solid rgba(255, 255, 255, 0.32)',
        boxShadow: {
          xs: '0 1px 4px rgba(0, 0, 0, 0.6)',
          md: `0 2px 10px ${glow}, 0 1px 4px rgba(0, 0, 0, 0.6)`,
        },
        ...sx,
      }}
    >
      <Iconify icon="solar:star-bold" width={size === 'small' ? 11 : 13} sx={{ color: '#FFFFFF' }} />
      <Box component="span" sx={{ color: '#FFFFFF', fontWeight: 800 }}>
        {Number(rating).toFixed(1)}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function PostItem({ post, index = 0 }) {
  const theme = useTheme();

  const { id, title, name, release_date, first_air_date, poster_path, vote_average, media_type } = post;

  // TV shows use 'name', movies use 'title'
  const displayTitle = title || name || 'Untitled';
  const displayDate = release_date || first_air_date;
  const releaseYear = getSafeYear(displayDate);
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id, displayTitle);

  return (
    <Link
      component={RouterLink}
      href={linkTo}
      scroll={true}
      sx={{
        display: 'block',
        height: '100%',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
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
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          contain: 'paint layout',
          contentVisibility: 'auto',
          containIntrinsicSize: '150px 225px',
          transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
            duration: 0.25,
            easing: theme.transitions.easing.easeOut,
          }),
          // Only trigger heavy hover transforms on real pointer/desktop devices:
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': {
              transform: 'translateY(-6px)',
              borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.35),
              boxShadow: `0 18px 36px -12px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.32)}, 0 0 0 1px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.16)}`,
            },
            '&:hover .youplex-poster-img': { transform: 'scale(1.05)' },
            '&:hover .youplex-poster-overlay': { opacity: 1 },
            '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
          },
          // Instant, smooth tap feedback on mobile without jank:
          '@media (hover: none)': {
            '&:active': {
              transform: 'scale(0.97)',
              transition: 'transform 0.1s ease',
            },
          },
        }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden', width: 1, aspectRatio: '2/3', bgcolor: 'grey.900' }}>
          {vote_average > 0 && (
            <RatingPill
              rating={vote_average}
              size="small"
              sx={{
                top: 8,
                right: 8,
                zIndex: 9,
                position: 'absolute',
              }}
            />
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
                bgcolor: 'rgba(8, 12, 18, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
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
              transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}
          >
            <Image
              alt={displayTitle}
              src={getPosterUrl(poster_path)}
              ratio="2/3"
              sx={{ width: 1, height: 1 }}
            />
          </Box>

          {/* Hover gradient overlay (desktop only) */}
          <Box
            className="youplex-poster-overlay"
            sx={{
              display: { xs: 'none', md: 'block' },
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              zIndex: 7,
              opacity: 0,
              position: 'absolute',
              transition: 'opacity 0.25s ease',
              background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
            }}
          />

          {/* Glass shine sweep on hover (desktop only) */}
          <Box
            className="youplex-card-shine"
            sx={{
              display: { xs: 'none', md: 'block' },
              top: 0,
              bottom: 0,
              left: '-60%',
              width: '55%',
              zIndex: 6,
              opacity: 0,
              position: 'absolute',
              pointerEvents: 'none',
              transform: 'skewX(-24deg)',
              transition: 'left 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)',
            }}
          />

          {/* Hover play button (desktop only) */}
          <Box
            className="youplex-card-fab"
            sx={{
              display: { xs: 'none', md: 'flex' },
              top: '50%',
              left: '50%',
              zIndex: 8,
              width: 48,
              height: 48,
              opacity: 0,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%) scale(0.7)',
              transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.92),
              color: 'common.white',
              boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.6)}`,
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
              <Box component="span" sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}>
                {fDate(displayDate, 'MMM YYYY')}
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
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = paths.watch.details(type, id, displayTitle);

  const backdropUrl = backdrop_path
    ? `https://image.tmdb.org/t/p/w780${backdrop_path}`
    : '/assets/placeholder-backdrop.jpg';

  return (
    <Link
      component={RouterLink}
      href={linkTo}
      scroll={true}
      sx={{
        display: 'block',
        height: '100%',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        '&:focus-visible': {
          borderRadius: 2.5,
          boxShadow: `0 0 0 2px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.8)}`,
        },
      }}
    >
      <Card
        sx={{
          height: { xs: 260, md: 300 },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2.5,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'grey.900',
          border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.1)}`,
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          contain: 'paint layout',
          contentVisibility: 'auto',
          containIntrinsicSize: '280px 300px',
          transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
            duration: 0.25,
            easing: theme.transitions.easing.easeOut,
          }),
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': {
              transform: 'translateY(-6px)',
              borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.35),
              boxShadow: `0 20px 40px -12px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.4)}`,
            },
            '&:hover .youplex-poster-img': { transform: 'scale(1.05)' },
            '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
          },
          '@media (hover: none)': {
            '&:active': {
              transform: 'scale(0.98)',
              transition: 'transform 0.1s ease',
            },
          },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ top: 16, right: 16, zIndex: 9, position: 'absolute' }}>
          {vote_average > 0 && (
            <RatingPill
              rating={vote_average}
              size="medium"
            />
          )}

          <Label
            variant="filled"
            color="primary"
            sx={{
              textTransform: 'uppercase',
              borderRadius: 999,
              fontWeight: 700,
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
            transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          <Image
            alt={displayTitle}
            src={backdropUrl}
            sx={{ width: 1, height: 1 }}
          />
        </Box>

        {/* Hover play button (desktop only) */}
        <Box
          className="youplex-card-fab"
          sx={{
            display: { xs: 'none', md: 'flex' },
            top: '50%',
            left: '50%',
            zIndex: 8,
            width: 56,
            height: 56,
            opacity: 0,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%) scale(0.7)',
            transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.92),
            color: 'common.white',
            boxShadow: `0 8px 28px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.7)}`,
          }}
        >
          <Iconify icon="solar:play-bold" width={26} sx={{ ml: 0.4 }} />
        </Box>

        {/* Glass shine sweep (desktop only) */}
        <Box
          className="youplex-card-shine"
          sx={{
            display: { xs: 'none', md: 'block' },
            top: 0,
            bottom: 0,
            left: '-60%',
            width: '55%',
            zIndex: 6,
            opacity: 0,
            position: 'absolute',
            pointerEvents: 'none',
            transform: 'skewX(-24deg)',
            transition: 'left 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)',
          }}
        />

        <Box
          sx={{
            p: 3,
            left: 0,
            width: 1,
            bottom: 0,
            zIndex: 7,
            position: 'absolute',
            color: 'common.white',
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
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {type === 'tv' ? 'Series' : 'Movie'}
            </Box>

            {displayDate && <span>&bull; {fDate(displayDate, 'MMMM D, YYYY')}</span>}
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

            {vote_average > 0 && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <RatingPill rating={vote_average} size="small" />
              </Stack>
            )}
          </Stack>
        </Box>
      </Card>
    </Link>
  );
}
