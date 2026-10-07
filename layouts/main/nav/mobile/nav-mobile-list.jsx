import { CONFIG } from '@/config-global';
import { varAlpha } from '@/theme/styles';
import { usePathname } from '@/routes/hooks';
import { isExternalLink } from '@/routes/utils';
import { useState, useEffect, useCallback } from 'react';
import { useActiveLink } from '@/routes/hooks/use-active-link';
import { NavLi, navSectionClasses, NavSectionVertical } from '@/components/nav-section';

import Collapse from '@mui/material/Collapse';

import { NavItem } from './nav-mobile-item';

// ----------------------------------------------------------------------

export function NavList({ data }) {
  const pathname = usePathname();

  const isChildActive = data.children?.some((group) =>
    group.items?.some((item) => {
      if (!item.path || isExternalLink(item.path)) return false;
      return pathname === item.path || pathname.startsWith(item.path);
    })
  );

  const active = useActiveLink(data.path, !data.children) || !!isChildActive;

  const [openMenu, setOpenMenu] = useState(false);

  // Auto-expand if active child
  useEffect(() => {
    if (isChildActive) {
      setOpenMenu(true);
    }
  }, [isChildActive]);

  const handleToggleMenu = useCallback(() => {
    if (data.children) {
      setOpenMenu((prev) => !prev);
    }
  }, [data.children]);

  const renderNavItem = (
    <NavItem
      // slots
      path={data.path}
      icon={data.icon}
      title={data.title}
      // state
      active={active}
      hasChild={!!data.children}
      open={data.children && !!openMenu}
      externalLink={isExternalLink(data.path)}
      // actions
      onClick={handleToggleMenu}
    />
  );

  if (data.children) {
    return (
      <NavLi>
        {renderNavItem}
        <Collapse in={openMenu}>
          <NavSectionVertical
            data={data.children}
            slotProps={{ rootItem: { sx: { minHeight: 38 } } }}
            sx={{
              px: 1.5,
              [`& .${navSectionClasses.item.root}`]: {
                '&[aria-label="Dashboard"]': {
                  [`& .${navSectionClasses.item.title}`]: { display: 'none' },
                  height: 180,
                  borderRadius: 1.5,
                  backgroundSize: 'auto 88%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundImage: `url(${CONFIG.site.basePath}/assets/illustrations/illustration-dashboard.webp)`,
                  border: (theme) =>
                    `solid 1px ${varAlpha(theme.palette.grey['500Channel'], 0.12)}`,
                },
              },
            }}
          />
        </Collapse>
      </NavLi>
    );
  }

  return <NavLi>{renderNavItem}</NavLi>;
}
