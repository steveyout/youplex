'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Autoplay from 'embla-carousel-autoplay';
import { Carousel, useCarousel, CarouselDotButtons, CarouselArrowBasicButtons } from '@/components/carousel';

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
        // ── Main hero container ──
        position: 'relative',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)',
        height: { xs: '560px', sm: '650px', md: '720px', lg: '780px' }, // ← tune these values
        minHeight: { xs: '520px', md: '680px' },
        mb: 0,
        overflow: 'hidden',
        isolation: 'isolate',           // helps with stacking context / z-index
      }}
    >
      {/* Carousel takes 100% height */}
      <Carousel
        carousel={carousel}
        sx={{
          height: '100%',
          margin: 0,
          '& .mnl__carousel__container': {
            height: '100%',
            margin: 0,
            padding: 0,
          },
          '& .mnl__carousel__slide': {
            height: '100%',
            minHeight: '100%',
            margin: 0,
            padding: 0,
          },
        }}
      >
        {items.map((item) => (
          <HeroBannerItem key={item.id} item={item} />
        ))}
      </Carousel>

      {/* Navigation overlay – small strip at bottom */}
      <Box
        sx={{
          position: 'absolute',
          inset: 'auto 0 0 0',           // bottom:0, left:0, right:0
          height: { xs: '60px', md: '70px' },
          pointerEvents: 'none',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          pb: { xs: 1, md: 1.5 },
        }}
      >
        {/* Dots – centered */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pb: { xs: 1, md: 1.5 },
            pointerEvents: 'auto',
          }}
        >
          <CarouselDotButtons {...carousel.dots} />
        </Box>

        {/* Arrows – bottom right, desktop only */}
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 16, md: 24 },
            right: { xs: 16, md: 32 },
            pointerEvents: 'auto',
            display: { xs: 'none', md: 'block' },
          }}
        >
          <CarouselArrowBasicButtons {...carousel.arrows} />
        </Box>
      </Box>
    </Box>
  );
}

function HeroBannerItem({ item }) {
  const title = item.title || item.name || 'Untitled';
  const overview = item.overview || '';
  const backdropUrl = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : '/fallback-backdrop.jpg';

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        background: `url(${backdropUrl}) center center / cover no-repeat`,
        backgroundColor: 'grey.900',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.15) 100%)',
          zIndex: 1,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, #0a0a0a 0%, rgba(10,10,10,0.65) 35%, transparent 70%)',
          zIndex: 1,
        },
      }}
    >
      <Stack
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 'lg',
          mx: 'auto',
          width: '100%',
          px: { xs: 3, md: 6, lg: 8 },
          py: { xs: 0, md: 4 },
        }}
        spacing={{ xs: 2.5, md: 4 }}
      >
        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            maxWidth: 880,
            textShadow: '0 5px 25px rgba(0,0,0,0.85)',
            fontSize: { xs: '2.6rem', sm: '3.5rem', md: '4.5rem', lg: '5.2rem' },
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'grey.100',
            maxWidth: 640,
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            display: '-webkit-box',
            overflow: 'hidden',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
            fontSize: { xs: '1.05rem', md: '1.2rem' },
          }}
        >
          {overview}
        </Typography>

        <Stack direction="row" spacing={2.5} sx={{ pt: { xs: 1, md: 2 } }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              px: { xs: 4, md: 6 },
              py: { xs: 1.4, md: 1.6 },
              fontSize: '1.1rem',
              fontWeight: 700,
              borderRadius: 3,
              textTransform: 'none',
            }}
          >
            Play Now
          </Button>

          <Button
            variant="outlined"
            size="large"
            sx={{
              px: { xs: 4, md: 6 },
              py: { xs: 1.4, md: 1.6 },
              fontSize: '1.1rem',
              fontWeight: 700,
              borderRadius: 3,
              color: 'white',
              borderColor: 'whiteAlpha.500',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'white',
                background: 'rgba(255,255,255,0.18)',
              },
            }}
          >
            More Info
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}