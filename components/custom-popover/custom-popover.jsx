import Popover from '@mui/material/Popover';
import { listClasses } from '@mui/material/List';
import { menuItemClasses } from '@mui/material/MenuItem';

import { StyledArrow } from './styles';
import { calculateAnchorOrigin } from './utils';

// ----------------------------------------------------------------------

export function CustomPopover({ open, onClose, children, anchorEl, slotProps, ...other }) {
  const arrowPlacement = slotProps?.arrow?.placement ?? 'top-right';

  const arrowSize = slotProps?.arrow?.size ?? 14;

  const arrowOffset = slotProps?.arrow?.offset ?? 17;

  const { paperStyles, anchorOrigin, transformOrigin } = calculateAnchorOrigin(arrowPlacement);

  return (
    <Popover
      open={!!open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{
        ...slotProps,
        paper: {
          ...slotProps?.paper,
          sx: {
            ...paperStyles,
            overflow: 'inherit',
            borderRadius: 1.75,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            [`& .${listClasses.root}`]: { minWidth: 160 },
            [`& .${menuItemClasses.root}`]: {
              gap: 1.25,
              py: 1,
              px: 1.5,
              borderRadius: 1,
              typography: 'body2',
              fontWeight: 500,
              transition: 'background-color 0.15s ease, color 0.15s ease',
            },
            ...slotProps?.paper?.sx,
          },
        },
      }}
      {...other}
    >
      {!slotProps?.arrow?.hide && (
        <StyledArrow
          sx={slotProps?.arrow?.sx}
          placement={arrowPlacement}
          offset={arrowOffset}
          size={arrowSize}
        />
      )}

      {children}
    </Popover>
  );
}
