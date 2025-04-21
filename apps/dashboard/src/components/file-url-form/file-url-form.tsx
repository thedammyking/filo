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
import { X } from 'lucide-react';

import { DEFAULT_FILE_URL, FILE_URL_TYPE_OPTIONS } from '@/lib/constants';
import type { FileUrlInputSchema } from '@/types/interfaces';
import { fileUrlInputSchema } from '@/validations/file-url-input';

import { Caption } from '../caption';

export function FileUrlForm() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FileUrlInputSchema>({
    resolver: zodResolver(fileUrlInputSchema),
    defaultValues: {
      urls: [DEFAULT_FILE_URL]
    },
    mode: 'all'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'urls'
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <div className='flex flex-col gap-8 px-6 pb-10 md:px-0'>
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
                  <Input {...register(`urls.${index}.link`)} className='font-normal' />
                </div>
                <Controller
                  control={control}
                  name={`urls.${index}.linkType`}
                  render={({ field }) => (
                    <div className='w-full md:w-[180px]'>
                      <label htmlFor={`urls.${index}.linkType`} className='text-sm font-medium'>
                        Type
                      </label>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        name={`urls.${index}.linkType`}
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
                {errors.urls?.[index]?.link?.message && (
                  <Caption className='text-destructive'>
                    {errors.urls?.[index]?.link?.message}
                  </Caption>
                )}
                {errors.urls?.[index]?.linkType?.message && (
                  <Caption className='text-destructive'>
                    {errors.urls?.[index]?.linkType?.message}
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
          <Button type='submit'>Submit</Button>
        </div>
      </form>
    </div>
  );
}
