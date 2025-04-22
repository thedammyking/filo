'use client';

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@filo/ui/components/button';
import { Input } from '@filo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@filo/ui/components/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader, X } from 'lucide-react';

import { useActiveCloudProvider } from '@/hooks/use-active-cloud-provider';
import { useCreateUpload } from '@/hooks/use-create-upload';
import { DEFAULT_FILE_URL, FILE_URL_TYPE_OPTIONS } from '@/lib/constants';
import type { FileUrlInputSchema } from '@/types/interfaces';
import { fileUrlInputSchema } from '@/validations/file-url-input';

import { Caption } from './caption';

export function FileUrlForm() {
  const { mutateAsync: createUpload, isPending } = useCreateUpload();
  const activeProvider = useActiveCloudProvider();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FileUrlInputSchema>({
    resolver: zodResolver(fileUrlInputSchema),
    defaultValues: {
      links: [DEFAULT_FILE_URL]
    },
    mode: 'all'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'links'
  });

  const onSubmit = async (data: FileUrlInputSchema) => {
    if (!activeProvider?.id) return;
    await createUpload(
      { links: data.links, storageId: activeProvider.id },
      {
        onSuccess: () => {
          reset();
        }
      }
    );
  };

  return (
    <div className='flex flex-col gap-8 px-6 md:px-0'>
      <h1 className='text-center text-xl font-medium'>Add files</h1>
      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-8'>
        <div className='flex flex-col gap-3'>
          {fields.map((field, index) => (
            <div key={field.id} className='flex flex-col gap-1 md:gap-1.5'>
              <div className='relative flex flex-col gap-2 md:flex-row md:items-center md:gap-4'>
                <div className='w-full'>
                  <label htmlFor={`urls.${index}.link`} className='text-sm font-medium'>
                    URL
                  </label>
                  <Input {...register(`links.${index}.link`)} className='font-normal' />
                </div>
                <Controller
                  control={control}
                  name={`links.${index}.type`}
                  render={({ field }) => (
                    <div className='w-full md:w-[180px]'>
                      <label htmlFor={`links.${index}.type`} className='text-sm font-medium'>
                        Type
                      </label>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        name={`links.${index}.type`}
                      >
                        <SelectTrigger className='font-normal'>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                        <SelectContent>
                          {FILE_URL_TYPE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                {index > 0 && (
                  <button
                    type='button'
                    className='rounded-full p-1 hover:bg-primary-foreground active:bg-secondary md:absolute md:-right-9 md:top-[52px] md:-translate-y-1/2'
                    onClick={() => remove(index)}
                  >
                    <X className='hidden size-5 md:block' />
                    <span className='text-sm font-medium md:hidden'>Remove</span>
                  </button>
                )}
              </div>
              <div className='flex flex-col gap-1'>
                {errors.links?.[index]?.link?.message && (
                  <Caption className='text-destructive'>
                    {errors.links?.[index]?.link?.message}
                  </Caption>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between gap-3'>
          <Button type='button' variant='outline' onClick={() => append(DEFAULT_FILE_URL)}>
            Add more
          </Button>
          <Button type='submit' className='min-w-20' disabled={isPending}>
            {isPending ? <Loader className='size-4 animate-spin' /> : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
