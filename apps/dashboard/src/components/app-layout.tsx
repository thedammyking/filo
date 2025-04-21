import { cn } from '@filo/ui/lib/utils';

interface AppLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = async ({ children, header, className, ...props }) => {
  return (
    <main
      className={cn(
        'relative grid h-screen w-full grid-rows-[min-content_1fr] bg-card text-card-foreground',
        className
      )}
      {...props}
    >
      {header}
      <div className='min-h-[calc(100svh-78px)] overflow-y-auto'>{children}</div>
    </main>
  );
};

AppLayout.displayName = 'AppLayout';

export default AppLayout;
