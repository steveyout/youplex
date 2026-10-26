import { SignInView } from '@/sections/auth';
import { AuthCenteredLayout } from '@/layouts/auth-centered';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Sign In | Youplex Sync',
};

export default function Page() {
  return (
    <AuthCenteredLayout>
      <SignInView />
    </AuthCenteredLayout>
  );
}
