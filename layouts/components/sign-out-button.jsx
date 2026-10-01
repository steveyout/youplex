import { useCallback } from 'react';

import Button from '@mui/material/Button';

import { useRouter } from 'routes/hooks';
import { toast } from 'components/snackbar';

// ----------------------------------------------------------------------

export function SignOutButton({ onClose, ...other }) {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      onClose?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Unable to logout!');
    }
  }, [onClose, router]);

  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      onClick={handleLogout}
      {...other}
    >
      Logout
    </Button>
  );
}
