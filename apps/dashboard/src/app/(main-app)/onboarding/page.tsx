import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@filo/ui/components/card';

import OnboardingDoneButton from '@/components/onboarding-done-button';
import ConnectButton from '@/components/storage-providers/connection-button';
import StorageProvidersContextProvider from '@/components/storage-providers/context-provider';
import ProvidersList from '@/components/storage-providers/providers-list';

export default async function OnboardingPage() {
  return (
    <Card className='w-full sm:w-96'>
      <CardHeader className='flex flex-col items-center justify-center gap-y-4'>
        <CardTitle>Connect your storage</CardTitle>
        <CardDescription className='text-center'>
          Select a storage and connect to start using Filo
        </CardDescription>
      </CardHeader>
      <StorageProvidersContextProvider>
        <CardContent>
          <ProvidersList />
        </CardContent>
        <CardFooter className='flex flex-col items-center justify-center gap-2'>
          <ConnectButton />
          <OnboardingDoneButton />
        </CardFooter>
      </StorageProvidersContextProvider>
    </Card>
  );
}
