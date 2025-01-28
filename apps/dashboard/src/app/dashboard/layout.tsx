import { DashboardHeader } from '@/components/dashboard-header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className='flex flex-col gap-4'>
      <DashboardHeader />
      {children}
    </main>
  );
}
