'use client';

import { m } from 'framer-motion';
import { useCallback } from 'react';

import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'locales';

import { varHover } from 'components/animate';
import { FlagIcon } from 'components/iconify';
import { usePopover, CustomPopover } from 'components/custom-popover';

// ----------------------------------------------------------------------

export function LanguagePopover({ data = [], sx, ...other }) {
  const popover = usePopover();

  const { onChangeLang, currentLang } = useTranslate();

  const handleChangeLang = useCallback(
    (newLang) => {
      onChangeLang(newLang);
      popover.onClose();
    },
    [onChangeLang, popover]
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        onClick={popover.onOpen}
        sx={{
          p: 0,
          width: 40,
          height: 40,
          ...(popover.open && { bgcolor: 'action.selected' }),
          ...sx,
        }}
        {...other}
      >
        <FlagIcon code={currentLang.countryCode} />
      </IconButton>

      <CustomPopover open={popover.open} anchorEl={popover.anchorEl} onClose={popover.onClose}>
        <MenuList sx={{ width: 185, p: 1 }}>
          {data?.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === currentLang.value}
              onClick={() => handleChangeLang(option.value)}
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 1.25,
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}
            >
              <FlagIcon
                code={option.countryCode}
                sx={{ width: 22, height: 16, borderRadius: 0.5, flexShrink: 0 }}
              />
              <Typography variant="body2" sx={{ fontWeight: option.value === currentLang.value ? 700 : 500, fontSize: 13.5 }}>
                {option.label}
              </Typography>
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
  );
}
