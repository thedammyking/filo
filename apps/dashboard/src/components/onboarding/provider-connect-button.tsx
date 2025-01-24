'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { AVAILABILITY_STATUS, STORAGE_PROVIDER_DETAILS } from '@filo/libs/constants';
import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useConnectToGoogleDrive } from '@/hooks/useConnectToGoogleDrive';
import { completeOnboarding } from '@/server/actions/onboarding';

import { useOnboardingContext } from './onboarding-provider';

const ProviderConnectButton = () => {
  const { selected } = useOnboardingContext();
  const router = useRouter();
  const { user } = useUser();

  const handleCompleteOnboarding = async () => {
    const [data, error] = await completeOnboarding();
    if (error) {
      throw new Error(error.message);
    }
    if (data.onboardingComplete) {
      await user?.reload();
      router.push('/');
    }
  };

  const { handleConnect, error, isLoading } = useConnectToGoogleDrive(handleCompleteOnboarding);

  const { label, disabled } = React.useMemo(() => {
    if (selected && STORAGE_PROVIDER_DETAILS[selected].status === AVAILABILITY_STATUS.AVAILABLE)
      return {
        label: `Connect to ${STORAGE_PROVIDER_DETAILS[selected].name}`,
        disabled: false
      };

    return {
      label: 'Unavailable',
      disabled: true
    };
  }, [selected]);

  if (!selected) return null;

  return (
    <div className='mt-[30px] flex flex-col items-center justify-center gap-2'>
      <Button type='button' className='w-[200px]' onClick={handleConnect} disabled={disabled}>
        {isLoading ? <Loader className='size-4 animate-spin' /> : label}
      </Button>
      {error && <p className='mt-2 text-red-500'>{error}</p>}
    </div>
  );
};

export default ProviderConnectButton;
