import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import { styled, useTheme } from '@mui/material/styles';

import { useScrollOffSetTop } from 'hooks/use-scroll-offset-top';

import { bgBlur, varAlpha } from 'theme/styles';

import { layoutClasses } from '../classes';

// ----------------------------------------------------------------------

const StyledElevation = styled('span')(({ theme }) => ({
  left: 0,
  right: 0,
  bottom: 0,
  m: 'auto',
  height: 24,
  zIndex: -1,
  opacity: 0.48,
  borderRadius: '50%',
  position: 'absolute',
  width: `calc(100% - 48px)`,
  boxShadow: theme.customShadows.z8,
}));

// ----------------------------------------------------------------------

export function HeaderSection({
  sx,
  slots,
  slotProps,
  disableOffset,
  disableElevation,
  layoutQuery = 'md',
  ...other
}) {
  const theme = useTheme();

  const { offsetTop } = useScrollOffSetTop();

  const toolbarStyles = {
    default: {
      position: 'relative',
      minHeight: 'auto',
      height: 'var(--layout-header-mobile-height)',
      ...bgBlur({
        blur: 12,
        color: varAlpha(theme.vars.palette.background.defaultChannel, 0.4),
      }),
      transition: theme.transitions.create(['height', 'background-color'], {
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.shorter,
      }),
      [theme.breakpoints.up('sm')]: {
        minHeight: 'auto',
      },
      [theme.breakpoints.up(layoutQuery)]: {
        height: 'var(--layout-header-desktop-height)',
      },
    },
    offset: {
      ...bgBlur({
        blur: 16,
        color: varAlpha(theme.vars.palette.background.defaultChannel, 0.85),
      }),
    },
  };

  return (
    <AppBar
      position="sticky"
      className={layoutClasses.header}
      sx={{
        zIndex: 'var(--layout-header-zIndex)',
        ...sx,
      }}
      {...other}
    >
      {slots?.topArea}

      <Toolbar
        disableGutters
        {...slotProps?.toolbar}
        sx={{
          ...toolbarStyles.default,
          ...(!disableOffset && offsetTop && toolbarStyles.offset),
          ...slotProps?.toolbar?.sx,
        }}
      >
        <Container
          {...slotProps?.container}
          sx={{
            height: 1,
            display: 'flex',
            alignItems: 'center',
            ...slotProps?.container?.sx,
          }}
        >
          {slots?.leftArea}

          <Box sx={{ display: 'flex', flex: '1 1 auto', justifyContent: 'center' }}>
            {slots?.centerArea}
          </Box>

          {slots?.rightArea}
        </Container>
      </Toolbar>

      {slots?.bottomArea}

      <Box
        sx={{
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          zIndex: -1,
          pointerEvents: 'none',
          content: '""',
          position: 'absolute',
          background: `linear-gradient(90deg, transparent, ${varAlpha(
            theme.vars.palette.primary.mainChannel,
            0.55
          )}, transparent)`,
          opacity: 0.45,
        }}
      />

      {!disableElevation && offsetTop && <StyledElevation />}
    </AppBar>
  );
}
