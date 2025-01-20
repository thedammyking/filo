import eslintConfigNext from '@filo/eslint-config/next';

/** @type {import("eslint").Linter.Config} */
export default [
  { ignores: ['node_modules', '.turbo', 'storybook-static'] },
  ...eslintConfigNext,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off'
    }
  }
];
