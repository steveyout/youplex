'use client';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

import { paths } from '@/routes/paths';
import { RouterLink } from '@/routes/components';

import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';

// ----------------------------------------------------------------------

export default function Error({ error, reset }) {
  return (
    <Container sx={{ my: 5 }}>
      <EmptyContent
        filled
        title="Movie/show not found!"
        action={
          <Button
            component={RouterLink}
            href={paths.post.root}
            startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
            sx={{ mt: 3 }}
          >
            Back to list
          </Button>
        }
        sx={{ py: 10 }}
      />
    </Container>
  );
}
