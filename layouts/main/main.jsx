import Box from '@mui/material/Box';

import { layoutClasses } from '../classes';

// ----------------------------------------------------------------------

export function Main({ children, sx, ...other }) {
  return (
    <Box
      component="main"
      className={layoutClasses.main}
      sx={{
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        ...sx,
      }}
      {...other}
    >
      <div id="container-cb91f4b32d74a911ec84244e77e12b2f" />
      {children}
    </Box>
  );
}
