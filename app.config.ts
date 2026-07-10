import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Driftmark',
  slug: 'driftmark',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'driftmark',
  userInterfaceStyle: 'dark',
  backgroundColor: '#07080D',
  icon: './assets/icons/icon.png',
  splash: {
    image: './assets/icons/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#07080D',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.driftmark.app',
    buildNumber: '1',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'Driftmark needs photo access to add travel photos.',
      NSCameraUsageDescription: 'Driftmark needs camera access to take travel photos.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icons/adaptive-icon.png',
      backgroundColor: '#07080D',
    },
    package: 'com.driftmark.app',
    versionCode: 1,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'driftmark.app', pathPrefix: '/group/join' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    // 'static' pre-renders each route to HTML and needs no Node server —
    // matches the static-hosting setup in vercel.json ('server' output
    // would require the Vercel adapter / a running server).
    output: 'static',
    favicon: './assets/icons/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-image-picker', {
      photosPermission: 'Driftmark needs photo access to add travel photos.',
      cameraPermission: 'Driftmark needs camera access to take travel photos.',
    }],
    ['expo-notifications', {
      icon: './assets/icons/notification-icon.png',
      color: '#00F5D4',
    }],
    'expo-font',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}`,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    easProjectId: process.env.EAS_PROJECT_ID,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
})
