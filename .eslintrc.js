module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
  ],
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Security: M-06-B — Stored XSS prevention
    // dangerouslySetInnerHTML is NEVER allowed without explicit DOMPurify wrapper
    'react/no-danger': 'error',

    // Security: M-08-D — No console in production (enforced by babel in prod, flagged in dev)
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // TypeScript strictness
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',

    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
    'react/prop-types': 'off', // TypeScript handles this
    'react/display-name': 'warn',

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off', // NativeWind handles Text styling

    // General code quality
    'no-var': 'error',
    'prefer-const': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-restricted-globals': [
      'error',
      {
        name: 'localStorage',
        message: 'Do not use localStorage — use SecureStore on native or sessionStorage on web. See THREAT_MODEL AS-01, M-01-D.',
      },
    ],
    // Prevent direct Supabase select('*') — always specify columns
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'CallExpression[callee.property.name="select"][arguments.0.value="*"]',
        message: 'Avoid SELECT * — always specify columns for security and performance. See THREAT_MODEL 4.3.',
      },
    ],
  },
  overrides: [
    {
      // Relax some rules for test files
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'off',
        '@typescript-eslint/no-floating-promises': 'warn',
      },
    },
    {
      // Supabase Edge Functions run in Deno
      files: ['supabase/functions/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'ios/',
    'android/',
    '*.config.js',
    '*.config.ts',
    'babel.config.js',
    'metro.config.js',
  ],
};
