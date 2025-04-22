import React from 'react';
import { useAuth } from '@clerk/nextjs';

import queryClient from '@/lib/query-client';

export const QueryCleaner: React.FC = () => {
  const { isSignedIn } = useAuth();

  const handleQueryCleaner = React.useCallback(() => {
    if (!isSignedIn) {
      queryClient.resetQueries({
        type: 'all'
      });
    }
  }, [isSignedIn]);

  React.useEffect(() => {
    handleQueryCleaner();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return null;
};
