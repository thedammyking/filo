import { useUser } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { completeOnboarding } from '@/server/actions/onboarding';

export const useCompleteOnboarding = () => {
  const { user } = useUser();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      const [data, error] = await completeOnboarding();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      user?.reload();
      if (data.onboardingComplete) {
        router.push('/');
      }
    }
  });
};
