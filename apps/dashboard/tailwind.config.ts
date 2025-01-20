import sharedConfig from '@filo/tailwind-config';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [sharedConfig],
  content: [
    'src/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '../../packages/ui/src/components/**/*.{ts,tsx}'
  ]
};

export default config;
