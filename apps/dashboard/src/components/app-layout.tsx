interface AppLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = async ({ children, header, ...props }) => {
  return (
    <main
      className='relative grid min-h-svh w-full grid-rows-[auto_1fr] bg-card text-card-foreground'
      {...props}
    >
      {header}
      <div className='min-h-[calc(100svh-64px)]'>{children}</div>
    </main>
  );
};

AppLayout.displayName = 'AppLayout';

export default AppLayout;
