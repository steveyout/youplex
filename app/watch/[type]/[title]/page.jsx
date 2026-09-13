'use client';

import { useState, useEffect } from 'react';
import { fDate } from '@/utils/format-time';
import { Iconify } from '@/components/iconify';
import { PostItem } from '@/sections/movies/post-item';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getMovieOrShow, getRecommendations } from '@/actions/api';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export default function WatchPage() {
  const { type, title } = useParams();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  const [movieOrShow, setMovieOrShow] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    if (!id) {
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    getMovieOrShow(type, id)
      .then((data) => {
        if (active) setMovieOrShow(data);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Something went wrong while loading this title.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    getRecommendations(type, id)
      .then((data) => {
        if (active) setRecommendations(data?.results || []);
      })
      .catch(() => {
        if (active) setRecommendations([]);
      });

    return () => {
      active = false;
    };
  }, [type, id, season, episode]);

  if (isLoading) return <WatchSkeleton />;

  if (error || !movieOrShow) return <WatchError error={error} title={title} />;

  const firstSeason = movieOrShow.seasons?.find((item) => item.season_number > 0);
  const selectedSeason = season || (type === 'tv' ? String(firstSeason?.season_number || 1) : '');
  const selectedEpisode = episode || (type === 'tv' ? '1' : '');
  const params = new URLSearchParams({ id: id || '' });
  if (selectedSeason) params.set('season', selectedSeason);
  if (selectedEpisode && type === 'tv') params.set('episode', selectedEpisode);
  const playPath = `/watch/${type}/${title}/play?${params.toString()}`;

  return (
    <WatchContent
      movieOrShow={movieOrShow}
      type={type}
      id={id}
      playPath={playPath}
      recommendations={recommendations}
    />
  );
}

// ----------------------------------------------------------------------

function WatchSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={4}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Skeleton variant="rounded" sx={{ width: 220, height: 320, display: { xs: 'none', sm: 'block' } }} />
          <Stack spacing={1.5} sx={{ width: 1 }}>
            <Skeleton width="30%" height={28} />
            <Skeleton width="70%" height={52} />
            <Skeleton width="45%" height={20} />
            <Skeleton width="100%" height={20} />
            <Skeleton width="90%" height={20} />
          </Stack>
        </Stack>
        <Skeleton variant="rounded" sx={{ width: 1, aspectRatio: '16/9' }} />
      </Stack>
    </Container>
  );
}

// ----------------------------------------------------------------------

function WatchError({ error }) {
  return (
    <Container sx={{ py: 12, display: 'grid', placeItems: 'center' }}>
      <Stack alignItems="center" spacing={2} textAlign="center" sx={{ maxWidth: 420 }}>
        <Iconify icon="solar:shield-warning-bold" width={56} sx={{ color: 'text.disabled' }} />
        <Typography variant="h5">We couldn&apos;t load this title</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {error}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </Stack>
    </Container>
  );
}

// ----------------------------------------------------------------------

function WatchContent({ movieOrShow, type, id, playPath, recommendations = [] }) {
  const router = useRouter();
  const isTv = type === 'tv';
  const displayTitle = movieOrShow.title || movieOrShow.name || '';
  const releaseDate = movieOrShow.release_date || movieOrShow.first_air_date;
  const rating = movieOrShow.vote_average || 0;
  const {runtime} = movieOrShow;
  const runtimeLabel = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : null;
  const genres = movieOrShow.genres || [];
  const cast = movieOrShow.credits?.cast?.slice(0, 8) || [];
  const hasCredits = cast.length > 0;

  const backdrop = movieOrShow.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movieOrShow.backdrop_path}`
    : '';
  const poster = movieOrShow.poster_path
    ? `https://image.tmdb.org/t/p/w400${movieOrShow.poster_path}`
    : '';

  return (
    <>
      {/* Cinematic hero */}
      <Box sx={{ position: 'relative', overflow: 'hidden', pt: { xs: 2, md: 6 } }}>
        {backdrop && (
          <Box
            component="img"
            src={backdrop}
            alt=""
            sx={{ position: 'absolute', inset: 0, width: 1, height: 1, objectFit: 'cover' }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(5, 5, 5, 0.2) 0%, rgba(5, 5, 5, 0.95) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(5, 5, 5, 0.9) 0%, rgba(5, 5, 5, 0.3) 55%, rgba(5, 5, 5, 0.1) 100%)',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 4, md: 8 } }}>
          <Button
            size="small"
            startIcon={<Iconify icon="solar:alt-arrow-left-bold" width={16} />}
            onClick={() => router.back()}
            sx={{
              mb: { xs: 3, md: 5 },
              color: 'common.white',
              bgcolor: alpha('#ffffff', 0.12),
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: 'solid 1px',
              borderColor: alpha('#ffffff', 0.16),
              '&:hover': { bgcolor: alpha('#ffffff', 0.22) },
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Back
          </Button>

          <Stack
            className="youplex-fade-up"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 3, sm: 4, md: 5 }}
            alignItems={{ xs: 'center', sm: 'flex-start' }}
          >
            {poster && (
              <Box
                component="img"
                src={poster}
                alt={displayTitle}
                sx={{
                  width: { xs: 180, sm: 220, md: 260 },
                  flexShrink: 0,
                  borderRadius: 3,
                  bgcolor: 'common.black',
                  boxShadow: `0 24px 48px -12px ${alpha('#000000', 0.7)}`,
                  border: (theme) => `solid 1px ${alpha(theme.palette.common.white, 0.12)}`,
                }}
              />
            )}

            <Stack spacing={2.5} sx={{ width: 1, minWidth: 0, color: 'common.white' }}>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  label={isTv ? 'TV Series' : 'Movie'}
                  sx={{
                    color: 'common.white',
                    bgcolor: alpha('#ffffff', 0.12),
                    '& .MuiChip-label': { color: 'common.white' },
                    border: `solid 1px ${alpha('#ffffff', 0.16)}`,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                />
                {movieOrShow.status && (
                  <Chip
                    size="small"
                    label={movieOrShow.status}
                    sx={{
                      color: 'common.white',
                      bgcolor: alpha('#ffffff', 0.12),
                      '& .MuiChip-label': { color: 'common.white' },
                      border: `solid 1px ${alpha('#ffffff', 0.16)}`,
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  />
                )}
              </Stack>

              <Typography variant="h1" sx={{ fontSize: { xs: 40, sm: 56, md: 68 } }}>
                {displayTitle}
              </Typography>

              <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={{ xs: 1.5, sm: 2.5 }} useFlexGap>
                {rating > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.6}>
                    <Iconify icon="eva:star-fill" width={20} sx={{ color: 'warning.main' }} />
                    <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
                      {rating.toFixed(1)}
                    </Typography>
                  </Stack>
                )}
                {releaseDate && (
                  <MetaItem icon="solar:calendar-mark-bold" label={fDate(releaseDate)} />
                )}
                {runtimeLabel && <MetaItem icon="solar:clock-circle-bold" label={runtimeLabel} />}
                {isTv && movieOrShow.number_of_seasons > 0 && (
                  <MetaItem icon="solar:layers-bold" label={`${movieOrShow.number_of_seasons} season${movieOrShow.number_of_seasons > 1 ? 's' : ''}`} />
                )}
              </Stack>

              {movieOrShow.overview && (
                <Typography
                  variant="body1"
                  sx={{ color: alpha('#ffffff', 0.78), lineHeight: 1.8, maxWidth: 720 }}
                >
                  {movieOrShow.overview}
                </Typography>
              )}

              {genres.length > 0 && (
                <Stack direction="row" flexWrap="wrap" spacing={1}>
                  {genres.map((genre) => (
                    <Chip
                      key={genre.id}
                      size="small"
                      label={genre.name}
                      sx={{
                        color: alpha('#ffffff', 0.9),
                        bgcolor: alpha('#ffffff', 0.1),
                        border: `solid 1px ${alpha('#ffffff', 0.14)}`,
                      }}
                    />
                  ))}
                </Stack>
              )}

              {id && (
                <Button
                  size="large"
                  variant="contained"
                  startIcon={<Iconify icon="solar:play-bold" width={22} />}
                  onClick={() => router.push(playPath)}
                  sx={{ alignSelf: 'flex-start', mt: 1, borderRadius: 2, px: 4 }}
                >
                  Watch Now
                </Button>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Overview & cast */}
      <Container maxWidth="xl" sx={{ pb: { xs: 6, md: 10 } }}>
        <Stack spacing={5}>
          {movieOrShow.overview && (
            <Box>
              <SectionHeading title="About" />
              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.9, maxWidth: 820 }}>
                {movieOrShow.overview}
              </Typography>
            </Box>
          )}

          {hasCredits && (
            <Box>
              <SectionHeading title="Top Cast" />
              <Stack direction="row" flexWrap="wrap" spacing={2} useFlexGap>
                {cast.map((actor) => (
                  <Stack
                    key={actor.id}
                    alignItems="center"
                    spacing={1}
                    sx={{ width: 120, textAlign: 'center' }}
                  >
                    <Box
                      component="img"
                      src={
                        actor.profile_path
                          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                          : ''
                      }
                      alt={actor.name}
                      sx={{
                        width: 96,
                        height: 96,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        bgcolor: (theme) => theme.palette.background.neutral,
                        border: (theme) => `solid 1px ${theme.palette.divider}`,
                      }}
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
            </Box>
          )}
        </Stack>
      </Container>

      {/* Recommended */}
      {recommendations.length > 0 && (
        <Box sx={{ pb: { xs: 6, md: 10 }, bgcolor: 'background.neutral' }}>
          <Container maxWidth="xl" sx={{ pt: { xs: 4, md: 6 } }}>
            <SectionHeading title="Recommended" />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(6, 1fr)',
                },
                gap: 2,
              }}
            >
              {recommendations.slice(0, 12).map((post, index) => (
                <PostItem key={post.id} post={post} index={index} />
              ))}
            </Box>
          </Container>
        </Box>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

function MetaItem({ icon, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ color: alpha('#ffffff', 0.85) }}>
      <Iconify icon={icon} width={18} sx={{ color: alpha('#ffffff', 0.6) }} />
      <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
        {label}
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

function SectionHeading({ title }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
      <Box sx={{ width: 28, height: 4, borderRadius: 1, bgcolor: 'primary.main' }} />
      <Typography variant="h5">{title}</Typography>
    </Stack>
  );
}