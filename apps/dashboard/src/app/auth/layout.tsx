export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-svh items-center justify-center'>
      <div className='grid w-full grow items-center px-4 sm:justify-center'>{children}</div>
    </div>
  );
}
