'use client';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/navigation';

import { paths } from '@/routes/paths';
import { Iconify } from '@/components/iconify';
import { varAlpha } from '@/theme/styles';
import {
  Carousel,
  useCarousel,
  CarouselDotButtons,
  CarouselArrowBasicButtons,
} from '@/components/carousel';

// ----------------------------------------------------------------------

const contentVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.2 } },
};

const contentItemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

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
        {items.map((item, index) => (
          <HeroBannerItem
            key={item.id}
            item={item}
            isActive={index === carousel?.dots?.selectedIndex}
          />
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

function HeroBannerItem({ item, isActive }) {
  const theme = useTheme();
  const router = useRouter();

  const title = item.title || item.name || 'Untitled';
  const overview = item.overview || '';
  const rating = item.vote_average || 0;

  // Determine if it's a movie or tv show for the path
  const type = item.title ? 'movie' : 'tv';

  const backdropUrl = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : '/fallback-backdrop.jpg';

  const handleWatch = () => {
    router.push(paths.watch.details(type, item.id));
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Cinematic Ken Burns backdrop */}
      <Box
        className="youplex-kenburns"
        sx={{
          position: 'absolute',
          inset: -10,
          background: `url(${backdropUrl}) center 20% / cover no-repeat`,
        }}
      />

      {/* Grade overlays */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.12) 78%, rgba(10,10,10,0.45) 100%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(to right, #0a0a0a 0%, rgba(10,10,10,0.4) 40%, rgba(10,10,10,0.05) 70%, transparent 85%)',
        }}
      />

      <Stack
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          px: { xs: 2, md: 6 },
          mt: { xs: 4, md: 0 },
        }}
      >
        <m.div
          variants={contentVariants}
          initial="hidden"
          animate={isActive ? 'visible' : 'hidden'}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}
        >
          {/* Meta chips */}
          <m.div variants={contentItemVariants}>
            <Stack direction="row" spacing={1}>
              {rating > 0 && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.16)',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Iconify icon="solar:star-bold" width={15} sx={{ color: 'warning.main' }} />
                  <Typography sx={{ color: 'common.white', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>
                    {rating.toFixed(1)}
                  </Typography>
                </Stack>
              )}

              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'rgba(255,255,255,0.16)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Iconify
                  icon={type === 'movie' ? 'fluent:movies-and-tv-20-regular' : 'iconoir:tv'}
                  width={15}
                  sx={{ color: 'primary.light' }}
                />
                <Typography
                  sx={{
                    color: 'common.white',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    letterSpacing: 0.4,
                  }}
                >
                  {type}
                </Typography>
              </Stack>
            </Stack>
          </m.div>

          {/* Title */}
          <m.div variants={contentItemVariants}>
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
          </m.div>

          {/* Overview */}
          <m.div variants={contentItemVariants}>
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
          </m.div>

          {/* Actions */}
          <m.div variants={contentItemVariants}>
            <Stack direction="row" spacing={1.5}>
              <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                <Button
                  variant="contained"
                  className="youplex-shimmer"
                  onClick={handleWatch}
                  sx={{
                    px: 3.5,
                    py: 1.05,
                    borderRadius: 999,
                    fontWeight: 800,
                    textTransform: 'none',
                    color: 'common.white',
                    background: `linear-gradient(110deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.main} 35%, ${theme.vars.palette.primary.light} 50%, ${theme.vars.palette.primary.main} 65%, ${theme.vars.palette.primary.darker} 100%)`,
                    boxShadow: `0 12px 32px -8px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.75)}`,
                    '&:hover': {
                      boxShadow: `0 16px 40px -8px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.9)}`,
                    },
                  }}
                >
                  <Iconify icon="solar:play-bold" width={18} sx={{ mr: 0.75 }} />
                  Play Now
                </Button>
              </m.div>

              <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                <Button
                  variant="soft"
                  color="inherit"
                  onClick={handleWatch}
                  sx={{
                    px: 3.5,
                    py: 1.05,
                    borderRadius: 999,
                    fontWeight: 700,
                    textTransform: 'none',
                    color: 'common.white',
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.2)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.18)',
                      borderColor: 'rgba(255,255,255,0.32)',
                    },
                  }}
                >
                  More Info
                </Button>
              </m.div>
            </Stack>
          </m.div>
        </m.div>
      </Stack>
    </Box>
  );
}