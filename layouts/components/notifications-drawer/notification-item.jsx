import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

import { fToNow } from 'utils/format-time';

import { CONFIG } from 'config-global';

import { Label } from 'components/label';
import { Iconify } from 'components/iconify';
import { FileThumbnail } from 'components/file-thumbnail';

// ----------------------------------------------------------------------

export function NotificationItem({ notification }) {
  const renderAvatar = (
    <ListItemAvatar>
      {notification.avatarUrl ? (
        <Avatar src={notification.avatarUrl} sx={{ bgcolor: 'background.neutral' }} />
      ) : notification.icon ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            bgcolor: notification.iconBg || 'rgba(255, 48, 48, 0.12)',
            color: notification.iconColor || 'primary.main',
          }}
        >
          <Iconify icon={notification.icon} width={22} />
        </Stack>
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'background.neutral' }}
        >
          <Box
            component="img"
            src={`${CONFIG.site.basePath}/assets/icons/notification/${(notification.type === 'order' && 'ic-order') || (notification.type === 'chat' && 'ic-chat') || (notification.type === 'mail' && 'ic-mail') || (notification.type === 'delivery' && 'ic-delivery')}.svg`}
            sx={{ width: 24, height: 24 }}
          />
        </Stack>
      )}
    </ListItemAvatar>
  );

  const renderText = (
    <ListItemText
      disableTypography
      primary={reader(notification.title)}
      secondary={
        <Stack
          direction="row"
          alignItems="center"
          sx={{ typography: 'caption', color: 'text.disabled', mt: 0.5 }}
          divider={
            <Box
              sx={{
                width: 2,
                height: 2,
                bgcolor: 'currentColor',
                mx: 0.75,
                borderRadius: '50%',
              }}
            />
          }
        >
          <span>{fToNow(notification.createdAt)}</span>
          <span>{notification.category}</span>
        </Stack>
      }
    />
  );

  const renderUnReadBadge = notification.isUnRead && (
    <Box
      sx={{
        top: 24,
        width: 8,
        height: 8,
        right: 18,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        position: 'absolute',
        boxShadow: (theme) => `0 0 8px ${theme.vars.palette.primary.main}`,
      }}
    />
  );

  const friendAction = (
    <Stack spacing={1} direction="row" sx={{ mt: 1.5 }}>
      <Button size="small" variant="contained">
        Accept
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Stack>
  );

  const projectAction = (
    <Stack alignItems="flex-start">
      <Box
        sx={{
          p: 1.5,
          my: 1.5,
          borderRadius: 1.5,
          color: 'text.secondary',
          bgcolor: 'background.neutral',
        }}
      >
        {reader(
          `<p><strong>@Jaydon Frankie</strong> feedback by asking questions or just leave a note of appreciation.</p>`
        )}
      </Box>

      <Button size="small" variant="contained">
        Reply
      </Button>
    </Stack>
  );

  const fileAction = (
    <Stack
      spacing={1}
      direction="row"
      sx={{
        pl: 1,
        p: 1.5,
        mt: 1.5,
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
      }}
    >
      <FileThumbnail file="http://localhost:8080/httpsdesign-suriname-2015.mp3" />

      <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }} flexGrow={1} sx={{ minWidth: 0 }}>
        <ListItemText
          disableTypography
          primary={
            <Typography variant="subtitle2" component="div" sx={{ color: 'text.secondary' }} noWrap>
              design-suriname-2015.mp3
            </Typography>
          }
          secondary={
            <Stack
              direction="row"
              alignItems="center"
              sx={{ typography: 'caption', color: 'text.disabled' }}
              divider={
                <Box
                  sx={{
                    mx: 0.5,
                    width: 2,
                    height: 2,
                    borderRadius: '50%',
                    bgcolor: 'currentColor',
                  }}
                />
              }
            >
              <span>2.3 GB</span>
              <span>30 min ago</span>
            </Stack>
          }
        />

        <Button size="small" variant="outlined">
          Download
        </Button>
      </Stack>
    </Stack>
  );

  const tagsAction = (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
      <Label variant="outlined" color="info">
        Design
      </Label>
      <Label variant="outlined" color="warning">
        Dashboard
      </Label>
      <Label variant="outlined">Design system</Label>
    </Stack>
  );

  const paymentAction = (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
      <Button size="small" variant="contained">
        Pay
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Stack>
  );

  return (
    <ListItemButton
      disableRipple
      sx={{
        p: 2,
        px: 2.5,
        gap: 1.5,
        alignItems: 'flex-start',
        borderBottom: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
        transition: (theme) => theme.transitions.create(['background-color']),
        ...(notification.isUnRead && {
          bgcolor: (theme) => `rgba(${theme.vars.palette.primary.mainChannel} / 0.04)`,
        }),
      }}
    >
      {renderUnReadBadge}

      {renderAvatar}

      <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
        {renderText}
        {notification.type === 'friend' && friendAction}
        {notification.type === 'project' && projectAction}
        {notification.type === 'file' && fileAction}
        {notification.type === 'tags' && tagsAction}
        {notification.type === 'payment' && paymentAction}
      </Stack>
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function reader(data) {
  return (
    <Box
      dangerouslySetInnerHTML={{ __html: data }}
      sx={{
        mb: 0.25,
        '& p': { typography: 'body2', m: 0, fontSize: 13.5, lineHeight: 1.5 },
        '& a': { color: 'inherit', textDecoration: 'none' },
        '& strong': { typography: 'subtitle2', fontWeight: 600, fontSize: 13.5 },
      }}
    />
  );
}
