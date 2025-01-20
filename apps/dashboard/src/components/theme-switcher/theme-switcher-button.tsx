'use client';

import React from 'react';
import { cn } from '@filo/ui/lib/utils';
import { useTheme } from 'next-themes';

import type { ThemeMode } from '@/types/enums';

import styles from './theme-switcher.module.scss';

interface ThemeSwitcherButtonProps
  extends Omit<React.ComponentPropsWithRef<'button'>, 'onClick' | 'children'> {
  theme: ThemeMode;
  icon: React.ReactNode;
}

const ThemeSwitcherButton: React.FC<ThemeSwitcherButtonProps> = ({
  theme,
  className,
  icon,
  ...props
}) => {
  const [mounted, setMounted] = React.useState(false);
  const { theme: activeMode, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      type='button'
      className={cn(
        styles['theme-switcher-button'],
        'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
        className
      )}
      data-active={theme === activeMode}
      onClick={() => setTheme(theme)}
      tabIndex={0}
      suppressHydrationWarning
      {...props}
    >
      {icon}
    </button>
  );
};

ThemeSwitcherButton.displayName = 'ThemeSwitcherButton';

export default ThemeSwitcherButton;
