import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className='flex min-h-svh items-center justify-center'>
      <SignIn signUpUrl='/auth/signup' path='/auth/login' />
    </div>
  );
}
