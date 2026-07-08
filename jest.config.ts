import type { Config } from 'jest'

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // RN 0.76 + jest-expo compatibility: jest-expo's setup.js reads .default from NativeModules
    // but RN 0.76's jest mock is plain CJS (no .default). Shim adds .default before setup runs.
    '^react-native/Libraries/BatchedBridge/NativeModules$':
      '<rootDir>/__mocks__/NativeModulesCompat.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@typedefs/(.*)$': '<rootDir>/src/types/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
  },
  coverageThreshold: {
    global: {
      lines: 85,
      functions: 85,
      branches: 75,
      statements: 85,
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/e2e/', // Playwright tests — run with `npx playwright test`
    '/__tests__/mocks/', // Shared mock helpers, not test suites
    '/__tests__/factories/', // Test data factories, not test suites
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/src/app/', // Expo Router screen wrappers — tested via E2E
    '/src/types/', // Type definitions only
    '/src/theme/', // Constants only
    '/src/constants/', // Constants only
  ],
  transformIgnorePatterns: [
    // d3-geo + d3-array (and its dep internmap) ship ESM-only and are
    // imported by the map components, so they must be transformed too
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|moti|@shopify/flash-list|d3-geo|d3-array|internmap)',
  ],
}

export default config
