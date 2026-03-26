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
    'react-native-reanimated/plugin',
  ];

  // Strip console.* calls in production builds (Security: M-08-D, M-14-C)
  if (isProduction) {
    plugins.push('transform-remove-console');
  }

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
        },
      ],
    ],
    plugins,
    env: {
      test: {
        plugins: [
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
