import { SignUp } from '@clerk/nextjs';

import { env } from '@/evn';

export default function SignUpPage() {
  return <SignUp path={env.NEXT_PUBLIC_CLERK_SIGN_UP_URL} />;
}
