import type { ExpoConfig, ConfigContext } from 'expo/config';

// All environment-specific values come from EXPO_PUBLIC_* env vars (set per profile in eas.json
// or in a local .env). EXPO_PUBLIC_* values are inlined into the JS bundle, so never put secrets here.
const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const API_URL = env('EXPO_PUBLIC_API_URL');
const GOOGLE_IOS_CLIENT_ID = env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
const FACEBOOK_APP_ID = env('EXPO_PUBLIC_FACEBOOK_APP_ID');
const FACEBOOK_CLIENT_TOKEN = env('EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN');
const FACEBOOK_DISPLAY_NAME = env('EXPO_PUBLIC_FACEBOOK_DISPLAY_NAME') ?? 'Arayanibul';
// Expo project @sabridemirel/arayanibul (not a secret); env var kept for overrides
const EAS_PROJECT_ID = env('EAS_PROJECT_ID') ?? 'dae55300-a0af-49f7-b63a-100ee8975574';

// iOS URL scheme for Google Sign-In = the reversed iOS client ID:
// "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc"
const reverseGoogleClientId = (clientId: string) =>
  clientId.split('.').reverse().join('.');
const GOOGLE_IOS_URL_SCHEME =
  env('EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME') ??
  (GOOGLE_IOS_CLIENT_ID ? reverseGoogleClientId(GOOGLE_IOS_CLIENT_ID) : undefined);

// Release builds block plain HTTP on Android; allow it only when the API itself is http (local dev).
const allowCleartext = !API_URL || API_URL.startsWith('http://');

const plugins: ExpoConfig['plugins'] = [
  'expo-router',
  'expo-secure-store',
  'expo-apple-authentication',
  [
    'expo-build-properties',
    {
      android: { usesCleartextTraffic: allowCleartext },
    },
  ],
];

if (GOOGLE_IOS_URL_SCHEME) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }]);
} else {
  console.warn('[app.config] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set: Google Sign-In will not work on iOS.');
}

if (FACEBOOK_APP_ID && FACEBOOK_CLIENT_TOKEN) {
  plugins.push([
    'react-native-fbsdk-next',
    {
      appID: FACEBOOK_APP_ID,
      clientToken: FACEBOOK_CLIENT_TOKEN,
      displayName: FACEBOOK_DISPLAY_NAME,
      scheme: `fb${FACEBOOK_APP_ID}`,
      // The SDK is initialized explicitly before login; no automatic event logging / ad ID collection
      isAutoInitEnabled: false,
      autoLogAppEventsEnabled: false,
      advertiserIDCollectionEnabled: false,
      iosUserTrackingPermission: false,
    },
  ]);
} else {
  console.warn('[app.config] EXPO_PUBLIC_FACEBOOK_APP_ID / EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN not set: Facebook Login disabled.');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ArayanıBUL',
  slug: 'arayanibul',
  owner: 'sabridemirel',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'arayanibul',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#7B2CBF',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.arayanibul.app',
    buildNumber: '1',
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription: 'İlanlarınıza fotoğraf eklemek için kameranıza erişim gerekiyor.',
      NSPhotoLibraryUsageDescription: 'İlanlarınıza fotoğraf eklemek için fotoğraf arşivinize erişim gerekiyor.',
      NSLocationWhenInUseUsageDescription: 'Yakınınızdaki ilanları gösterebilmek için konumunuz kullanılır.',
      ITSAppUsesNonExemptEncryption: false,
      // App Store "Dil" bilgisi buradan okunur; uygulama yalnızca Türkçe.
      CFBundleDevelopmentRegion: 'tr',
      CFBundleLocalizations: ['tr'],
    },
  },
  android: {
    package: 'com.arayanibul.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#7B2CBF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'NOTIFICATIONS',
    ],
  },
  androidStatusBar: {
    backgroundColor: '#ffffff',
    barStyle: 'dark-content',
    translucent: false,
    hidden: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config.extra,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
});
