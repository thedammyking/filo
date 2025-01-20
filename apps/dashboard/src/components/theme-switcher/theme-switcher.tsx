import type React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { ThemeMode } from '@/types/enums';

import ThemeSwitcherButton from './theme-switcher-button';

const ThemeSwitcher: React.FC = () => {
  return (
    <div className='fixed right-4 top-4 z-50 w-max'>
      <div className='bg-light-grey-100 dark:bg-dark-grey-600 relative flex h-10 w-max items-center justify-between overflow-hidden rounded-full p-1 text-black dark:text-white'>
        <span className='sr-only'>Switch Theme</span>
        <ThemeSwitcherButton
          theme={ThemeMode.Dark}
          aria-label='Dark Theme'
          data-theme='dark'
          icon={<Moon />}
        />
        <ThemeSwitcherButton
          theme={ThemeMode.System}
          aria-label='System Theme'
          data-theme='system'
          icon={<Monitor />}
        />
        <ThemeSwitcherButton
          theme={ThemeMode.Light}
          aria-label='Light Theme'
          data-theme='light'
          icon={<Sun />}
        />
      </div>
    </div>
  );
};

export default ThemeSwitcher;
