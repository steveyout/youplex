import React from 'react';
import { paths } from '@/routes/paths';
import { Image } from '@/components/image';
import { fDate } from '@/utils/format-time';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { maxLine, varAlpha } from '@/theme/styles';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import { Box, Link, Stack } from '@mui/material';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

const getPosterUrl = (path) =>
  path
    ? path.startsWith('http')
      ? path
      : `${process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500'}${path}`
    : '/assets/placeholder.jpg';

function getSafeYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getFullYear();
  if (typeof dateStr === 'string' && /^\d{4}/.test(dateStr)) return dateStr.slice(0, 4);
  return null;
}

export default function MovieCard({ movie, index = 0 }) {
  const theme = useTheme();

  const { id, title, name, release_date, first_air_date, poster_path, vote_average, media_type, overview } =
    movie || {};

  const displayTitle = title || name || 'Untitled';
  const displayDate = release_date || first_air_date;
  const releaseYear = getSafeYear(displayDate);
  const type = media_type || (release_date ? 'movie' : 'tv');

  const linkTo = id ? paths.watch.details(type, id, displayTitle) : '#';

  const isHighRating = vote_average >= 7;
  const isMedRating = vote_average >= 5;
  const ratingBg = isHighRating ? '#10B981' : isMedRating ? '#F59E0B' : '#EF4444';
  const ratingGlow = isHighRating
    ? 'rgba(16, 185, 129, 0.45)'
    : isMedRating
    ? 'rgba(245, 158, 11, 0.45)'
    : 'rgba(239, 68, 68, 0.45)';

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
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          contentVisibility: 'auto',
          transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
            duration: 0.28,
            easing: theme.transitions.easing.easeOut,
          }),
          '&:hover': {
            transform: 'translateY(-6px)',
            borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.28),
            boxShadow: `0 18px 36px -12px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.32)}, 0 0 0 1px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.16)}`,
          },
          '&:hover .youplex-poster-img': { transform: 'scale(1.05)' },
          '&:hover .youplex-poster-overlay': { opacity: 1 },
          '&:hover .youplex-card-fab': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          '&:hover .youplex-card-shine': { opacity: 1, left: '120%' },
        }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden', width: 1, aspectRatio: '2/3', bgcolor: 'grey.900' }}>
          {vote_average > 0 && (
            <Box
              sx={{
                top: 8,
                right: 8,
                zIndex: 9,
                position: 'absolute',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
                px: 0.85,
                py: 0.25,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: '0.72rem',
                lineHeight: 1,
                color: '#FFFFFF',
                bgcolor: ratingBg,
                boxShadow: `0 2px 10px ${ratingGlow}, 0 1px 3px rgba(0,0,0,0.6)`,
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <Iconify icon="solar:star-bold" width={11} sx={{ color: '#FFFFFF' }} />
              {Number(vote_average).toFixed(1)}
            </Box>
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
              transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
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
              transition: 'opacity 0.25s ease',
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
              transition: 'left 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease',
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
