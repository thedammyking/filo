import { UserProfile } from '@clerk/nextjs';

export default function Page() {
  return (
    <UserProfile
      path='/profile'
      routing='path'
      appearance={{
        elements: {
          rootBox: 'h-screen w-screen',
          cardBox: 'size-full max-w-none border-none rounded-none'
        }
      }}
    />
  );
}
