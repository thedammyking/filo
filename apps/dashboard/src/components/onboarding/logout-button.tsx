'use client';
import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@filo/ui/components/button';
import { Loader } from 'lucide-react';

const LogoutButton = () => {
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut();
  };

  return (
    <Button variant='link' onClick={handleLogout}>
      {isLoading ? <Loader className='size-4 animate-spin text-primary' /> : 'Or Logout'}
    </Button>
  );
};

export default LogoutButton;
