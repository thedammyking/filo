import { cn } from '@filo/ui/lib/utils';
import Link from 'next/link';

const AppHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <header className={cn('flex w-full items-center justify-between p-4', className)} {...props}>
      <Link href='/dashboard' className='flex items-center gap-2'>
        <h1 className='text-2xl font-bold'>Filo</h1>
      </Link>
      <div className='flex shrink-0 items-center gap-5'>{children}</div>
    </header>
  );
};

export default AppHeader;
