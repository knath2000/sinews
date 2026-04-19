export default {
  name: 'mobile',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'ai-news-mobile',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.ai.news.mobile',
  },
  android: {
    package: 'com.ai.news.mobile',
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
  ],
  experiments: {
    typedRoutes: true,
  },
};
