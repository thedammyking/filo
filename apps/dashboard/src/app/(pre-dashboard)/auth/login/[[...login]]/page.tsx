import { SignIn } from '@clerk/nextjs';

import { env } from '@/evn';

export default function SignInPage() {
  return <SignIn path={env.NEXT_PUBLIC_CLERK_SIGN_IN_URL} />;
}
