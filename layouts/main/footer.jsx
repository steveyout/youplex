import { paths } from '@/routes/paths';
import { Logo } from '@/components/logo';
import { RouterLink } from '@/routes/components';
import { Iconify } from '@/components/iconify';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { varAlpha } from 'theme/styles';

// ----------------------------------------------------------------------

const LINKS = [
  {
    headline: process.env.NEXT_PUBLIC_APP_NAME,
    children: [
      { name: 'About us', href: paths.about },
      { name: 'Contact us', href: paths.contact },
      { name: 'FAQs', href: paths.faqs },
    ],
  },
  {
    headline: 'Legal',
    children: [
      { name: 'Terms and condition', href: '#' },
      { name: 'Privacy policy', href: '#' },
    ],
  },
  { headline: 'Contact', children: [{ name: 'support@youplex.site', href: '#' }] },
];
/// ----------------------------socials-----------------------------------
export const _socials = [
  {
    name: 'Telegram',
    value: 'telegram',
    icon: 'logos:telegram',
    path: paths.telegram,
    color: '#0088cc',
  },
  {
    name: 'Discord',
    value: 'discord',
    icon: 'logos:discord-icon',
    path: paths.discord,
    color: '#5865F2',
  },
];
// ----------------------------------------------------------------------

export function Footer({ layoutQuery, sx }) {
  const theme = useTheme();

  return (
    <Box
    component="footer"
    sx={{
      position: 'relative',
      bgcolor: varAlpha(theme.vars.palette.background.defaultChannel, 0.35),
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid',
      borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.18),
      ...sx,
    }}
  >
      <Box
        sx={{
          height: 1,
          mx: 2,
          background: `linear-gradient(90deg, transparent, ${varAlpha(
            theme.vars.palette.primary.mainChannel,
            0.55
          )}, transparent)`,
        }}
      />

      <Container
        sx={{
          pb: 5,
          pt: 10,
          textAlign: 'center',
          [theme.breakpoints.up(layoutQuery)]: { textAlign: 'unset' },
        }}
      >
        <Logo />

        <Grid
          container
          sx={{
            mt: 3,
            justifyContent: 'center',
            [theme.breakpoints.up(layoutQuery)]: { justifyContent: 'space-between' },
          }}
        >
          <Grid {...{ xs: 12, [layoutQuery]: 3 }}>
            <Typography
              variant="body2"
              sx={{
                mx: 'auto',
                maxWidth: 280,
                [theme.breakpoints.up(layoutQuery)]: { mx: 'unset' },
              }}
            >
              {process.env.NEXT_PUBLIC_APP_NAME} Your number one movie/series/anime streaming site
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                mt: 3,
                mb: 5,
                justifyContent: 'center',
                [theme.breakpoints.up(layoutQuery)]: { mb: 0, justifyContent: 'flex-start' },
              }}
            >
              {_socials.map((social) => (
                <IconButton
                  key={social.name}
                  component="a"
                  href={social.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.07),
                    border: '1px solid',
                    borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.22),
                    transition:
                      'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.65),
                      bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                      boxShadow: `0 14px 28px -12px ${varAlpha(
                        theme.vars.palette.primary.mainChannel,
                        0.7
                      )}`,
                    },
                  }}
                >
                  <Iconify icon={social.icon} width={22} sx={{ color: social.color }} />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          <Grid {...{ xs: 12, [layoutQuery]: 6 }}>
            <Stack
              spacing={5}
              sx={{
                flexDirection: 'column',
                [theme.breakpoints.up(layoutQuery)]: { flexDirection: 'row' },
              }}
            >
              {LINKS.map((list) => (
                <Stack
                  key={list.headline}
                  spacing={2}
                  sx={{
                    width: 1,
                    alignItems: 'center',
                    [theme.breakpoints.up(layoutQuery)]: { alignItems: 'flex-start' },
                  }}
                >
                  <Typography component="div" variant="overline">
                    {list.headline}
                  </Typography>

                  {list.children.map((link) => (
                    <Link
                      key={link.name}
                      component={RouterLink}
                      href={link.href}
                      color="inherit"
                      variant="body2"
                    >
                      {link.name}
                    </Link>
                  ))}
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Typography variant="body2" sx={{ mt: 10 }}>
          © All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeFooter({ sx }) {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        py: 5,
        textAlign: 'center',
        position: 'relative',
        bgcolor: varAlpha(theme.vars.palette.background.defaultChannel, 0.35),
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid',
        borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.18),
        ...sx,
      }}
    >
      <Container>
        <Logo />
        <Box sx={{ mt: 1, typography: 'caption' }}>
          © All rights reserved.
          <br /> made by
          <Link href={process.env.NEXT_PUBLIC_SERVER_URL}> {process.env.NEXT_PUBLIC_APP_NAME} </Link>
        </Box>
      </Container>
    </Box>
  );
}
