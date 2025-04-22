import { FileUrlForm } from '@/components/file-url-form';
import { FileUrlHistory } from '@/components/file-url-history';
import queryClient from '@/lib/query-client';
import { uploadsQueryOptions } from '@/queries/query-options/uploads';

export default async function Page() {
  void (await queryClient.prefetchInfiniteQuery(uploadsQueryOptions()));

  return (
    <h1 className='text-2xl font-bold'>
      <div className='mx-auto mt-48 flex max-w-screen-sm flex-col gap-16'>
        <FileUrlForm />
        <FileUrlHistory />
      </div>
    </h1>
  );
}
