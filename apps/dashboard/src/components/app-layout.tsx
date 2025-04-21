import AppHeader from '@/components/app-header';
import queryClient from '@/lib/query-client';
import {
  activeCloudProviderQueryOptions,
  cloudProvidersQueryOptions
} from '@/queries/query-options/cloud-providers';

const AppLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = async ({
  children,
  ...props
}) => {
  void (await Promise.all([
    queryClient.prefetchQuery(cloudProvidersQueryOptions()),
    queryClient.prefetchQuery(activeCloudProviderQueryOptions())
  ]));

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
