import { reactConfig } from '@anvara/eslint-config';

export default [
  ...reactConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // TypeScript checks undefined names, including type-only globals such as RequestInit.
      'no-undef': 'off',
    },
  },
];
