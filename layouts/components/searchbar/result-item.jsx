import { varAlpha } from '@/theme/styles';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';

// ----------------------------------------------------------------------

export function ResultItem({ title, path, posterPath, onClickItem }) {
  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w92${posterPath}`
    : '';

  return (
    <ListItemButton
      onClick={onClickItem}
      sx={{
        gap: 2,
        borderRadius: 1,
        borderBottom: (theme) => `solid 1px ${theme.vars.palette.divider}`,
        '&:hover': {
          backgroundColor: (theme) =>
            varAlpha(theme.vars.palette.primary.mainChannel, theme.vars.palette.action.hoverOpacity),
        },
      }}
    >
      <Avatar
        variant="rounded"
        src={posterUrl}
        sx={{
          width: 48,
          height: 64, // Poster Ratio
          flexShrink: 0,
          bgcolor: 'background.neutral',
        }}
      />

      <ListItemText
        primaryTypographyProps={{ typography: 'subtitle2', noWrap: true }}
        secondaryTypographyProps={{ typography: 'caption', noWrap: true }}
        primary={title.map((part, index) => (
          <Box
            key={index}
            component="span"
            sx={{ color: part.highlight ? 'primary.main' : 'text.primary' }}
          >
            {part.text}
          </Box>
        ))}
        secondary={path.map((part, index) => (
          <Box
            key={index}
            component="span"
            sx={{ color: part.highlight ? 'primary.main' : 'text.secondary', textTransform: 'capitalize' }}
          >
            {part.text}
          </Box>
        ))}
      />
    </ListItemButton>
  );
}
