import { AuthObject } from '@clerk/backend';

export {};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthObject;
    }
  }

  interface UserPublicMetadata {
    onboardingComplete?: boolean;
  }
}
