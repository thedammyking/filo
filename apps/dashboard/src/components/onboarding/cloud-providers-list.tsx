'use client';

import type React from 'react';
import { STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';
import { Button } from '@filo/ui/components/button';
import { uniqueId } from 'lodash';
import Image from 'next/image';

import { useOnboardingContext } from './onboarding-provider';

const CloudProvidersList: React.FC = () => {
  const { setSelected, selected } = useOnboardingContext();

  return (
    <div className='flex justify-center gap-x-[30px]'>
      {Object.values(STORAGE_PROVIDER_DETAILS).map(provider => (
        <Button
          type='button'
          variant='ghost'
          key={uniqueId('storage-provider-')}
          className='flex h-max min-w-[120px] flex-col items-center justify-center gap-y-4 p-4 data-[selected=true]:bg-accent'
          onClick={() => setSelected(provider.value)}
          data-selected={selected === provider.value}
        >
          <Image
            src={`/${provider.value}.svg`}
            alt={provider.name}
            width={50}
            height={50}
            className='size-[50px]'
            objectFit='fill'
          />
          <h3>{provider?.name}</h3>
        </Button>
      ))}
    </div>
  );
};

CloudProvidersList.displayName = 'CloudProvidersList';

export default CloudProvidersList;
