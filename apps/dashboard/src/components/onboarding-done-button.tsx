'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { completeOnboarding } from '@/server/actions/onboarding';

const OnboardingDoneButton = () => {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    const [data, error] = await completeOnboarding();
    if (error) {
      throw new Error(error.message);
    }
    if (data.onboardingComplete) {
      await user?.reload();
      router.push('/');
    }
  };

  return (
    <Button className='underline' variant='link' onClick={handleCompleteOnboarding}>
      {isLoading ? <Loader className='size-4 animate-spin' /> : 'Done'}
    </Button>
  );
};

export default OnboardingDoneButton;
