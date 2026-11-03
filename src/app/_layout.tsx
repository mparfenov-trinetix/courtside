import {
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager, type Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DataHealthBanner } from '@/components/data-health-banner';
import { reportIssue } from '@/lib/data-health';
import { setHealthReporter } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { TeamProvider } from '@/state/team-store';
import { WatchlistProvider } from '@/state/watchlist-store';

// Keep the native splash up until the intro screen has painted its first frame,
// so the hand-off from native splash to the JS intro animation is seamless.
SplashScreen.preventAutoHideAsync();

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

setHealthReporter(reportIssue);

// gcTime must be at least the persister's maxAge or restored data is discarded.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, gcTime: WEEK } },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'courtside:query-cache' });

// Slow-changing, small payloads are restored on launch. Game summaries are big and live games change,
// but a *finished* game never does, so the latest few of those are kept too and open instantly, offline.
const PERSISTED = new Set(['teams', 'team', 'roster', 'schedule', 'standings', 'leaders', 'playerStats', 'playerCareer', 'leagueTeamStats']);
const KEPT_FINISHED_GAMES = 8;

const isFinished = (q: Query) => !!(q.state.data as { completed?: boolean } | undefined)?.completed;

function shouldPersist(q: Query): boolean {
  if (q.state.status !== 'success') return false;
  const kind = String(q.queryKey[0]);
  if (PERSISTED.has(kind)) return true;
  if (kind !== 'game' || !isFinished(q)) return false;
  const newest = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['game'] })
    .filter(isFinished)
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(0, KEPT_FINISHED_GAMES);
  return newest.includes(q);
}

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

  // Refetch stale queries (and resume live-game polling) when the app returns to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.arena }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: WEEK,
          buster: 'v4',
          dehydrateOptions: {
            shouldDehydrateQuery: shouldPersist,
          },
        }}>
        <TeamProvider>
          <WatchlistProvider>
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
              <Stack.Screen name="team/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="search" options={{ animation: 'fade' }} />
            </Stack>
            <DataHealthBanner />
          </ThemeProvider>
          </WatchlistProvider>
        </TeamProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
