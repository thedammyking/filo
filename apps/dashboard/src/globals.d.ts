export {};

declare global {
  interface UserPublicMetadata {
    onboardingComplete?: boolean;
  }
}

declare global {
  interface User {
    publicMetadata: UserPublicMetadata;
  }
}
