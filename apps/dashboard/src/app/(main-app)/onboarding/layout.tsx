export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='mt-[120px] grid w-full grow items-center px-4 sm:justify-center'>
      {children}
    </div>
  );
}

OnboardingLayout.displayName = 'OnboardingLayout';
