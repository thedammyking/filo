import { Toaster } from '@filo/ui/components/sonner';
import { Figtree } from 'next/font/google';

import AppLayout from '@/components/app-layout';
import { Providers } from '@/components/providers';
import ThemeSwitcher from '@/components/theme-switcher';

import '../styles/main.scss';
import '@filo/tailwind-config/styles.scss';

const fontSans = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap'
});

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <Providers>
          <AppLayout>{children}</AppLayout>
          <ThemeSwitcher />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
