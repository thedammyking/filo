import { DashboardHeader } from '@/components/dashboard-header';

export default async function Page() {
  return (
    <main className='flex flex-col gap-4'>
      <DashboardHeader />
      <div>
        <h1 className='text-2xl font-bold'>Hello World</h1>
      </div>
    </main>
  );
}
