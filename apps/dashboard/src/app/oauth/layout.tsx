import AppHeader from '@/components/app-header';
import AppLayout from '@/components/app-layout';

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout header={<AppHeader />}>
      <div className='mt-[120px] grid w-full grow items-center px-4 sm:justify-center'>
        {children}
      </div>
    </AppLayout>
  );
}

OAuthLayout.displayName = 'OAuthLayout';
