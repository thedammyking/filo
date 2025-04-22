'use client';

import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';

import { useCompleteOnboarding } from '@/hooks/use-complete-onboarding';

const OnboardingDoneButton = () => {
  const { mutateAsync: completeOnboarding, isPending: isCompletingOnboarding } =
    useCompleteOnboarding();

  const handleCompleteOnboarding = async () => {
    await completeOnboarding();
  };

  return (
    <Button className='underline' variant='link' onClick={handleCompleteOnboarding}>
      {isCompletingOnboarding ? <Loader className='size-4 animate-spin' /> : 'Done'}
    </Button>
  );
};

export default OnboardingDoneButton;
