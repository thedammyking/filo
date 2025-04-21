import { FileUrlForm } from '@/components/file-url-form/file-url-form';

export default async function Page() {
  return (
    <h1 className='text-2xl font-bold'>
      <div className='mx-auto mt-48 flex max-w-screen-sm flex-col gap-16'>
        <FileUrlForm />
        <p>Home</p>
      </div>
    </h1>
  );
}
