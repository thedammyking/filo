import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className='flex min-h-svh items-center justify-center'>
      <SignUp signInUrl='/auth/login' />
    </div>
  );
}
