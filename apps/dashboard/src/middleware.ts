import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { env } from './evn';

const isPublicRoute = createRouteMatcher(['/auth/login(.*)', '/auth/signup(.*)']);

const isOAuthCallbackRoute = createRouteMatcher(['/oauth/callback(.*)']);

const isOnboardingRoute = createRouteMatcher(['/onboarding']);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;

  if (isOAuthCallbackRoute(request)) {
    return NextResponse.next();
  }

  if (userId) {
    if (isPublicRoute(request) || (isOnboardingRoute(request) && onboardingComplete))
      return NextResponse.redirect(new URL('/', request.url));
    if (isOnboardingRoute(request) && !onboardingComplete) return NextResponse.next();
    if (!onboardingComplete) return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (!userId && !isPublicRoute(request)) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  const response = NextResponse.next();

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', env.API_URL);
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
