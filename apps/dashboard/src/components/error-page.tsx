'use client';

import type React from 'react';
import { Button } from '@filo/ui/components/button';

interface ErrorPageProps {
  title: string;
  subTitle: string;
  description: string;
  action: {
    label: string;
    onClick: () => void;
  };
}

const ErrorPage: React.FC<ErrorPageProps> = ({ title, subTitle, description, action }) => {
  return (
    <main className='relative flex min-h-[85.3vh] w-full flex-col items-center justify-center px-6 pb-[87px] pt-[88px] text-center text-black dark:text-white sm:min-h-[88.3vh] xl:min-h-[91vh]'>
      <h1 className='mb-[16px] text-[70px] font-bold leading-normal md:mb-[30px] md:text-[140px]'>
        {title}
      </h1>
      <h2 className='mb-[8px] text-[28px] font-semibold leading-[33.60px] md:mb-[13px] md:text-5xl md:leading-[56px]'>
        {subTitle}
      </h2>
      <p className='body-text mb-6 text-lg leading-7 text-opacity-80 md:mb-10'>{description}</p>
      <Button onClick={action.onClick}>{action.label}</Button>
    </main>
  );
};

export default ErrorPage;
