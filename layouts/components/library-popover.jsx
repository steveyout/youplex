'use client';

import { m } from 'framer-motion';
import { useCallback } from 'react';
import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { varHover } from '@/components/animate';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';

// ----------------------------------------------------------------------

export function LibraryPopover({ sx, ...other }) {
  const router = useRouter();
  const popover = usePopover();

  const handleNavigate = useCallback(
    (path) => {
      popover.onClose();
      router.push(path);
    },
    [router, popover]
  );

  return (
    <>
      <Tooltip title="My Library" arrow>
        <IconButton
          component={m.button}
          whileTap="tap"
          whileHover="hover"
          variants={varHover(1.05)}
          onClick={popover.onOpen}
          sx={{
            color: 'text.secondary',
            display: { xs: 'none', sm: 'inline-flex' },
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            ...(popover.open && { color: 'primary.main', bgcolor: 'action.selected' }),
            ...sx,
          }}
          {...other}
        >
          <Iconify icon="solar:bookmark-square-minimalistic-bold-duotone" width={22} />
        </IconButton>
      </Tooltip>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <MenuList sx={{ width: 180, p: 0.75 }}>
          <MenuItem
            onClick={() => handleNavigate(paths.bookmarks)}
            sx={{ py: 1, px: 1.5, borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
              <Iconify icon="solar:bookmark-bold-duotone" width={20} />
            </ListItemIcon>
            <ListItemText
              primary="Watchlist"
              primaryTypographyProps={{ typography: 'subtitle2', fontWeight: 600 }}
            />
          </MenuItem>

          <MenuItem
            onClick={() => handleNavigate(paths.history)}
            sx={{ py: 1, px: 1.5, borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
              <Iconify icon="solar:history-bold-duotone" width={20} />
            </ListItemIcon>
            <ListItemText
              primary="Watch History"
              primaryTypographyProps={{ typography: 'subtitle2', fontWeight: 600 }}
            />
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
