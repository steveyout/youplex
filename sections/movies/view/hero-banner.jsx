'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/navigation';

import { paths } from '@/routes/paths';
import { Carousel, useCarousel, CarouselDotButtons, CarouselArrowBasicButtons } from '@/components/carousel';

// ----------------------------------------------------------------------

export function HeroBanner({ items }) {
  const carousel = useCarousel(
    {
      loop: true,
      duration: 40,
    },
    [Autoplay({ delay: 6000, stopOnInteraction: false })]
  );

  if (!items || items.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: '420px', sm: '480px', md: '520px', lg: '560px' },
        mb: 3,
        overflow: 'hidden',
        borderRadius: { xs: 0, md: 3 },
        isolation: 'isolate',
      }}
    >
      <Carousel
        carousel={carousel}
        sx={{
          height: '100%',
          '& .mnl__carousel__container': { height: '100%' },
          '& .mnl__carousel__slide': { height: '100%' },
        }}
      >
        {items.map((item) => (
          <HeroBannerItem key={item.id} item={item} />
        ))}
      </Carousel>

      {/* Navigation overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          <CarouselDotButtons {...carousel.dots} />
        </Box>

        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 32,
            pointerEvents: 'auto',
            display: { xs: 'none', lg: 'block' },
          }}
        >
          <CarouselArrowBasicButtons {...carousel.arrows} />
        </Box>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

function HeroBannerItem({ item }) {
  const router = useRouter();

  const title = item.title || item.name || 'Untitled';
  const overview = item.overview || '';

  // Determine if it's a movie or tv show for the path
  const type = item.title ? 'movie' : 'tv';

  const backdropUrl = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : '/fallback-backdrop.jpg';

  const handlePlay = () => {
    router.push(paths.watch.details(type, item.id));
  };

  const handleMoreInfo = () => {
    router.push(paths.watch.details(type, item.id));
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        background: `url(${backdropUrl}) center 20% / cover no-repeat`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.4) 50%, transparent 100%)',
          zIndex: 1,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, #0a0a0a 0%, rgba(10,10,10,0.4) 40%, transparent 80%)',
          zIndex: 1,
        },
      }}
    >
      <Stack
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          px: { xs: 2, md: 6 },
          mt: { xs: 4, md: 0 },
        }}
        spacing={2}
      >
        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            maxWidth: 600,
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem', lg: '3.6rem' },
            lineHeight: 1.1,
            fontWeight: 800,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: 'grey.300',
            maxWidth: 500,
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            display: '-webkit-box',
            overflow: 'hidden',
            fontSize: { xs: '0.9rem', md: '1rem' },
          }}
        >
          {overview}
        </Typography>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handlePlay}
            sx={{
              px: 3,
              borderRadius: 1.5,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Play Now
          </Button>

          <Button
            variant="soft"
            color="inherit"
            size="medium"
            onClick={handleMoreInfo}
            sx={{
              px: 3,
              borderRadius: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              }
            }}
          >
            More Info
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
