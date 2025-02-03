import AppHeader from '@/components/app-header';

const AppLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  return (
    <main
      className='relative grid min-h-svh w-full grid-rows-[auto_1fr] bg-card text-card-foreground'
      {...props}
    >
      <AppHeader />
      <div className='min-h-[calc(100svh-64px)]'>{children}</div>
    </main>
  );
};

AppLayout.displayName = 'AppLayout';

export default AppLayout;
