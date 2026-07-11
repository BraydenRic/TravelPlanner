module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@services': './src/services',
          '@stores': './src/stores',
          // Note: @types conflicts with TypeScript's @types namespace,
          // so we use @app-types in babel but @types/* in tsconfig paths
          '@typedefs': './src/types',
          '@lib': './src/lib',
          '@hooks': './src/hooks',
          '@constants': './src/constants',
          '@theme': './src/theme',
          '@assets': './assets',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    ],
    // Reanimated 4's worklets plugin is added automatically by
    // babel-preset-expo (SDK 50+), so no manual plugin entry is needed.
  ];

  // Strip console.* calls in production builds (Security: M-08-D, M-14-C)
  if (isProduction) {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
    env: {
      test: {
        plugins: [
          // Jest runs CommonJS and can't execute native import() — the map
          // implementations load via React.lazy(() => import(...)), so
          // dynamic imports must be transpiled to require() in tests.
          '@babel/plugin-transform-dynamic-import',
          [
            'module-resolver',
            {
              root: ['./src'],
              alias: {
                '@': './src',
                '@components': './src/components',
                '@services': './src/services',
                '@stores': './src/stores',
                '@typedefs': './src/types',
                '@lib': './src/lib',
                '@hooks': './src/hooks',
                '@constants': './src/constants',
                '@theme': './src/theme',
                '@assets': './assets',
              },
              extensions: ['.ts', '.tsx', '.js', '.jsx'],
            },
          ],
        ],
      },
    },
  };
};
