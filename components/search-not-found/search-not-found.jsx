import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { varAlpha } from '@/theme/styles';
import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

export function SearchNotFound({ query, sx, onClear, ...other }) {
  const theme = useTheme();

  if (!query) {
    return (
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', ...sx }}>
        Please enter keywords
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        textAlign: 'center',
        p: { xs: 3, sm: 6 },
        borderRadius: 3,
        bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.4),
        border: `1px solid ${varAlpha(theme.vars.palette.divider, 0.08)}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        maxWidth: 540,
        mx: 'auto',
        ...sx,
      }}
      {...other}
    >
      <Stack alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
            color: 'primary.main',
            boxShadow: `0 8px 24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.2)}`,
          }}
        >
          <Iconify icon="solar:magnifer-bug-bold-duotone" width={38} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          No Results Found
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          We couldn&apos;t find any matches for &ldquo;<strong>{query}</strong>&rdquo;.
          <br />
          Try checking for spelling errors, using simpler keywords, or switching filter categories.
        </Typography>
      </Stack>
    </Box>
  );
}
