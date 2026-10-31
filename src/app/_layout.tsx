import {
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { palette } from '@/lib/theme';
import { TeamProvider } from '@/state/team-store';

// Keep the native splash up until the intro screen has painted its first frame,
// so the hand-off from native splash to the JS intro animation is seamless.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2 } },
});

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: palette.arena, card: palette.arena },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_900Black,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.arena }}>
      <QueryClientProvider client={queryClient}>
        <TeamProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.arena },
                animation: 'fade',
              }}>
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(drawer)" options={{ animation: 'fade' }} />
              <Stack.Screen name="player/[id]" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="game/[id]" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
          </ThemeProvider>
        </TeamProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
