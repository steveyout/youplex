'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { paths } from '@/routes/paths';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';

// ----------------------------------------------------------------------

export function DmcaNotice({ title, type }) {
  return (
    <Container
      maxWidth="md"
      sx={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        py: { xs: 8, md: 14 },
      }}
    >
      <Stack
        alignItems="center"
        spacing={3}
        textAlign="center"
        sx={{
          maxWidth: 540,
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
          border: (t) => `1px solid ${alpha(t.palette.divider, 0.18)}`,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette.error.main, 0.14),
            border: (t) => `1px solid ${alpha(t.palette.error.main, 0.3)}`,
            color: 'error.main',
          }}
        >
          <Iconify icon="solar:shield-warning-bold" width={38} />
        </Box>

        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.error.main, 0.16),
            border: (t) => `1px solid ${alpha(t.palette.error.main, 0.35)}`,
            color: 'error.light',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          HTTP 410 &bull; DMCA Removal
        </Box>

        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Content Removed
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
            This title has been permanently removed and access has been disabled in compliance with a
            Digital Millennium Copyright Act (DMCA) notice.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1, width: 1, justifyContent: 'center' }}>
          <Button
            variant="contained"
            component={RouterLink}
            href="/"
            startIcon={<Iconify icon="solar:home-2-bold" width={18} />}
            sx={{ fontWeight: 700 }}
          >
            Home
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            href={type === 'tv' ? paths.tv : paths.movies}
            startIcon={<Iconify icon={type === 'tv' ? 'solar:tv-bold' : 'solar:clapperboard-play-bold'} width={18} />}
            sx={{ fontWeight: 700 }}
          >
            Browse {type === 'tv' ? 'TV Shows' : 'Movies'}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}

export default DmcaNotice;
