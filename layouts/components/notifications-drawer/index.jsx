'use client';

import { m } from 'framer-motion';
import { useState, useCallback, useMemo } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useBoolean } from 'hooks/use-boolean';

import { Label } from 'components/label';
import { Iconify } from 'components/iconify';
import { varHover } from 'components/animate';
import { Scrollbar } from 'components/scrollbar';
import { CustomTabs } from 'components/custom-tabs';

import { _notifications } from '@/layouts/config-notifications';
import { NotificationItem } from './notification-item';

// ----------------------------------------------------------------------

export function NotificationsDrawer({ data = [], sx, ...other }) {
  const drawer = useBoolean();

  const [currentTab, setCurrentTab] = useState('all');

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const [notifications, setNotifications] = useState(
    data && data.length > 0 ? data : _notifications
  );

  const totalUnRead = useMemo(
    () => notifications.filter((item) => item.isUnRead === true).length,
    [notifications]
  );

  const totalArchived = useMemo(
    () => notifications.filter((item) => item.isArchived === true).length,
    [notifications]
  );

  const tabs = useMemo(
    () => [
      { value: 'all', label: 'All', count: notifications.length },
      { value: 'unread', label: 'Unread', count: totalUnRead },
      { value: 'archived', label: 'Archived', count: totalArchived },
    ],
    [notifications.length, totalUnRead, totalArchived]
  );

  const filteredNotifications = useMemo(() => {
    if (currentTab === 'unread') {
      return notifications.filter((item) => item.isUnRead === true);
    }
    if (currentTab === 'archived') {
      return notifications.filter((item) => item.isArchived === true);
    }
    return notifications;
  }, [currentTab, notifications]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isUnRead: false }))
    );
  };

  const renderHead = (
    <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1.5, minHeight: 68 }}>
      <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
        Notifications
      </Typography>

      {!!totalUnRead && (
        <Tooltip title="Mark all as read">
          <IconButton color="primary" onClick={handleMarkAllAsRead} sx={{ mr: 0.5 }}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton onClick={drawer.onFalse}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Stack>
  );

  const renderTabs = (
    <CustomTabs variant="fullWidth" value={currentTab} onChange={handleChangeTab}>
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={
                (tab.value === 'unread' && 'primary') ||
                (tab.value === 'archived' && 'success') ||
                'default'
              }
            >
              {tab.count}
            </Label>
          }
        />
      ))}
    </CustomTabs>
  );

  const renderList = (
    <Scrollbar sx={{ flex: '1 1 auto' }}>
      {filteredNotifications.length === 0 ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, px: 3, textAlign: 'center' }}>
          <Iconify icon="solar:bell-off-bold-duotone" width={56} sx={{ color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            No {currentTab === 'all' ? '' : currentTab} notifications
          </Typography>
        </Stack>
      ) : (
        <Box component="ul">
          {filteredNotifications.map((notification) => (
            <Box component="li" key={notification.id} sx={{ display: 'flex' }}>
              <NotificationItem notification={notification} />
            </Box>
          ))}
        </Box>
      )}
    </Scrollbar>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        onClick={drawer.onTrue}
        aria-label="Notifications"
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnRead} color="error" max={99}>
          <Iconify icon="solar:bell-bing-bold-duotone" width={24} />
        </Badge>
      </IconButton>

      <Drawer
        open={drawer.value}
        onClose={drawer.onFalse}
        anchor="right"
        PaperProps={{
          sx: {
            width: 1,
            maxWidth: 420,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {renderHead}

        {renderTabs}

        {renderList}
      </Drawer>
    </>
  );
}
