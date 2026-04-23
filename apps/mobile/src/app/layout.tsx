import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { useFonts, Newsreader_400Regular, Newsreader_600SemiBold, Newsreader_700Bold } from '@expo-google-fonts/newsreader';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans';
import { useEffect } from 'react';
import { ThemeProvider } from '../lib/theme';
import { useAuthState } from '../contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuthState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.dismissAll();
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Newsreader': Newsreader_400Regular,
    'Newsreader-SemiBold': Newsreader_600SemiBold,
    'Newsreader-Bold': Newsreader_700Bold,
    'IBMPlexSans': IBMPlexSans_400Regular,
    'IBMPlexSans-Medium': IBMPlexSans_500Medium,
    'IBMPlexSans-SemiBold': IBMPlexSans_600SemiBold,
    'IBMPlexSans-Bold': IBMPlexSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <RootLayoutNav />
    </ThemeProvider>
  );
}
