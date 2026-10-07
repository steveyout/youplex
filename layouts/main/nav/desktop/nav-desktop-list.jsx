import { paper, varAlpha } from '@/theme/styles';
import { usePathname } from '@/routes/hooks';
import { NavLi, NavUl } from '@/components/nav-section';
import { useActiveLink } from '@/routes/hooks/use-active-link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { isExternalLink, removeLastSlash } from '@/routes/utils';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import Portal from '@mui/material/Portal';
import { useTheme } from '@mui/material/styles';
import ListSubheader from '@mui/material/ListSubheader';

import { NavItem, NavItemDashboard } from './nav-desktop-item';

// ----------------------------------------------------------------------

export function NavList({ data }) {
  const theme = useTheme();

  const navItemRef = useRef(null);
  const timeoutRef = useRef(null);

  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState(false);

  // Check if any child item matches current pathname
  const isChildActive = data.children?.some((group) =>
    group.items?.some((item) => {
      if (!item.path || isExternalLink(item.path)) return false;
      return pathname === item.path || pathname.startsWith(item.path);
    })
  );

  const active = useActiveLink(data.path, !data.children) || !!isChildActive;

  const [clientRect, setClientRect] = useState({ top: 0, height: 0, left: 0, width: 0 });

  useEffect(() => {
    if (openMenu) {
      setOpenMenu(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleOpenMenu = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (data.children) {
      setOpenMenu(true);
    }
  }, [data.children]);

  const handleCloseMenu = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setOpenMenu(false);
    }, 150);
  }, []);

  const renderNavItem = (
    <NavItem
      ref={navItemRef}
      // slots
      title={data.title}
      path={data.path}
      // state
      active={active}
      hasChild={!!data.children}
      open={data.children && !!openMenu}
      externalLink={isExternalLink(data.path)}
      // action
      onMouseEnter={handleOpenMenu}
      onMouseLeave={handleCloseMenu}
    />
  );

  const handleGetClientRect = useCallback(() => {
    const element = navItemRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();
      setClientRect({
        top: rect.top,
        height: rect.height,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    handleGetClientRect();

    window.addEventListener('scroll', handleGetClientRect);
    window.addEventListener('resize', handleGetClientRect);

    return () => {
      window.removeEventListener('scroll', handleGetClientRect);
      window.removeEventListener('resize', handleGetClientRect);
    };
  }, [handleGetClientRect]);

  if (data.children) {
    const isMegaMenu =
      data.children.length > 2 ||
      data.children.some((list) => list.subheader === 'Dashboard');

    const menuLeft =
      typeof window !== 'undefined'
        ? Math.max(16, Math.min(clientRect.left - 12, window.innerWidth - 240))
        : clientRect.left;

    return (
      <NavLi sx={{ height: 1 }}>
        {renderNavItem}

        {openMenu && (
          <Portal>
            <Fade in>
              <Box
                onMouseEnter={handleOpenMenu}
                onMouseLeave={handleCloseMenu}
                sx={{
                  pt: 1,
                  position: 'fixed',
                  zIndex: theme.zIndex.modal,
                  top: Math.round(clientRect.top + clientRect.height - 4),
                  ...(isMegaMenu
                    ? {
                        left: 0,
                        right: 0,
                        mx: 'auto',
                        maxWidth: theme.breakpoints.values.lg,
                      }
                    : {
                        left: menuLeft,
                        minWidth: 200,
                      }),
                }}
              >
                <Box
                  component="nav"
                  sx={{
                    ...paper({ theme, dropdown: true }),
                    borderRadius: 2,
                    p: isMegaMenu ? theme.spacing(5, 1, 1, 4) : 1,
                    boxShadow:
                      theme.customShadows?.dropdown ||
                      '0 12px 32px -4px rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <NavUl
                    sx={{
                      width: 1,
                      ...(isMegaMenu
                        ? {
                            gap: 3,
                            flexWrap: 'wrap',
                            flexDirection: 'row',
                          }
                        : {
                            gap: 0.5,
                            flexDirection: 'column',
                          }),
                    }}
                  >
                    {data.children.map((list, idx) => (
                      <NavSubList
                        key={list.subheader || idx}
                        subheader={list.subheader}
                        data={list.items}
                      />
                    ))}
                  </NavUl>
                </Box>
              </Box>
            </Fade>
          </Portal>
        )}
      </NavLi>
    );
  }

  return <NavLi sx={{ height: 1 }}>{renderNavItem}</NavLi>;
}

// ----------------------------------------------------------------------

function NavSubList({ data, subheader, sx, ...other }) {
  const pathname = usePathname();

  const isDashboard = subheader === 'Dashboard';

  return (
    <Stack
      component={NavLi}
      alignItems="flex-start"
      sx={{
        width: '100%',
        flex: '1 1 auto',
        ...(isDashboard && { maxWidth: { md: 1 / 3, lg: 540 } }),
        ...sx,
      }}
      {...other}
    >
      <NavUl sx={{ width: '100%' }}>
        {subheader ? (
          <ListSubheader
            disableSticky
            disableGutters
            sx={{
              px: 1.5,
              py: 0.5,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.1,
              color: 'text.disabled',
              typography: 'overline',
              lineHeight: '18px',
            }}
          >
            {subheader}
          </ListSubheader>
        ) : null}

        {data.map((item) =>
          isDashboard ? (
            <NavLi key={item.title} sx={{ mt: 1.5 }}>
              <NavItemDashboard path={item.path} />
            </NavLi>
          ) : (
            <NavLi key={item.title} sx={{ mt: 0.5, width: '100%' }}>
              <NavItem
                subItem
                title={item.title}
                path={item.path}
                icon={item.icon}
                active={item.path === removeLastSlash(pathname)}
                externalLink={isExternalLink(item.path)}
              />
            </NavLi>
          )
        )}
      </NavUl>
    </Stack>
  );
}
