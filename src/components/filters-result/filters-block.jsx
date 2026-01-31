import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

export function FiltersBlock({ label, children, isShow, sx }) {
  if (!isShow) {
    return null;
  }

  return (
    <Box
      gap={1}
      display="flex"
      sx={{
        p: 1,
        borderRadius: 1,
        overflow: 'hidden',
        border: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
        ...sx,
      }}
    >
      <Box
        component="span"
        sx={{
          height: 24,
          lineHeight: '24px',
          fontSize: (theme) => theme.typography.subtitle2.fontSize,
          fontWeight: (theme) => theme.typography.subtitle2.fontWeight,
        }}
      >
        {label}
      </Box>
      <Box gap={1} display="flex" flexWrap="wrap">
        {children}
      </Box>
    </Box>
  );
}
