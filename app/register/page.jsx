import { SignUpView } from '@/sections/auth';
import { AuthCenteredLayout } from '@/layouts/auth-centered';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Sign Up | Youplex Sync',
};

export default function Page() {
  return (
    <AuthCenteredLayout>
      <SignUpView />
    </AuthCenteredLayout>
  );
}
