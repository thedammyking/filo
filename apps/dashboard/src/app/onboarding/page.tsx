import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@filo/ui/components/card';

import CloudProvidersList from '@/components/onboarding/cloud-providers-list';
import LogoutButton from '@/components/onboarding/logout-button';
import OnboardingProvider from '@/components/onboarding/onboarding-provider';
import ProviderConnectButton from '@/components/onboarding/provider-connect-button';

export default async function OnboardingPage() {
  return (
    <Card className='w-full sm:w-96'>
      <CardHeader className='flex flex-col items-center justify-center gap-y-4'>
        <CardTitle>Connect your storage</CardTitle>
        <CardDescription className='text-center'>
          Select a storage and connect to start using Filo
        </CardDescription>
      </CardHeader>
      <OnboardingProvider>
        <CardContent>
          <CloudProvidersList />
        </CardContent>
        <CardFooter className='flex flex-col items-center justify-center gap-2'>
          <ProviderConnectButton />
          <LogoutButton />
        </CardFooter>
      </OnboardingProvider>
    </Card>
  );
}
