// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support for React Native Web
  isCSSEnabled: true,
});

// React Native Web: resolve platform-specific extensions
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Support for .web.ts / .web.tsx / .web.js extensions
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'web.ts',
  'web.tsx',
  'web.js',
];

// Support SVG as React components
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
