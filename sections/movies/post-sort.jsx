import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';

import { varAlpha } from 'theme/styles';
import { Iconify } from 'components/iconify';
import { usePopover, CustomPopover } from 'components/custom-popover';

// ----------------------------------------------------------------------

export function PostSort({ sort, sortOptions, onSort }) {
  const theme = useTheme();

  const popover = usePopover();

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        onClick={popover.onOpen}
        endIcon={
          <Iconify
            icon={popover.open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
          />
        }
        sx={{ fontWeight: 'fontWeightSemiBold', textTransform: 'capitalize' }}
      >
        Sort by:
        <Box component="span" sx={{ ml: 0.5, fontWeight: 'fontWeightBold' }}>
          {sort}
        </Box>
      </Button>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{
          paper: {
            sx: {
              backgroundImage: 'none',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              bgcolor: varAlpha(theme.vars.palette.background.paperChannel, 0.92),
              border: '1px solid',
              borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.14),
              boxShadow: `0 24px 48px -24px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.3)}`,
            },
          },
        }}
      >
        <MenuList>
          {sortOptions.map((option) => (
            <MenuItem
              key={option.value}
              selected={sort === option.value}
              onClick={() => {
                popover.onClose();
                onSort(option.value);
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
  );
}
