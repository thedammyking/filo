'use client';

import React from 'react';
import { Loader } from 'lucide-react';

export default function OAuthCallback() {
  React.useEffect(() => {
    function getQueryParam(param: string) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }

    const code = getQueryParam('code');

    const error = getQueryParam('error');

    if (error) {
      window.opener.postMessage(
        {
          type: 'oauth-error',
          error: error
        },
        '*'
      );
    } else if (code) {
      window.opener.postMessage(
        {
          type: 'oauth-complete',
          code: code
        },
        '*'
      );
    }

    window.close();
  }, []);

  return (
    <div className='flex h-screen flex-col items-center justify-center'>
      <p className='flex items-center gap-2 text-lg font-medium text-primary'>
        <Loader className='size-5 animate-spin text-primary' />
        Authentication complete. This window will close automatically.
      </p>
    </div>
  );
}
