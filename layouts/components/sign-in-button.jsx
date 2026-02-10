import {paths} from "@/routes/paths";
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';

import Button from '@mui/material/Button';

// ----------------------------------------------------------------------

export function SignInButton({ sx, ...other }) {
  return (
  <Button
    component={RouterLink}
    href={paths.telegram}
    target="_blank"
    variant="outlined"
    color="info"
    startIcon={<Iconify icon="tabler:brand-telegram" width={24} />}
    sx={sx}
    {...other}
  >
    Telegram
  </Button>
  );
}
