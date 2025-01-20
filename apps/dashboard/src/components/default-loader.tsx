import { Loader } from 'lucide-react';

function DefaultLoader() {
  return (
    <main className='relative flex h-screen w-screen items-center justify-center'>
      <Loader className='size-6 animate-spin text-primary' />
    </main>
  );
}

DefaultLoader.displayName = 'DefaultLoader';

export default DefaultLoader;
