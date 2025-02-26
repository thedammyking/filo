'use server';

import { authenticatedProcedure } from '../procedures/auth';
import * as onboardingService from '../services/onboarding';

export const completeOnboarding = authenticatedProcedure
  .createServerAction()
  .handler(async ({ ctx }) => {
    const { userId } = ctx;
    try {
      const response = await onboardingService.completeOnboarding(userId, {
        publicMetadata: {
          onboardingComplete: true
        }
      });
      return response.publicMetadata;
    } catch (error: any) {
      throw new Error(error.message || 'There was an error updating the user metadata.');
    }
  });
