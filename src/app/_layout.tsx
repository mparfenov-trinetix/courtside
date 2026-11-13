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
import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';

import { WidgetSync } from '@/widgets';
import { NavDepthTracker } from '@/navigation';
import { DataHealthBanner, ScreenError, installEraLogos } from '@/components';
import { IntroOverlay } from '@/features/intro';
import { PickemSync } from '@/features/pickem';
import { reportIssue } from '@/lib/data-health';
import { HttpError, currentSeason, setHealthReporter } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { useWindowSizeGuard } from '@/lib/window-size';
import { LastVisitProvider, TeamProvider, WatchlistProvider } from '@/state';

// Keep the native splash up until the intro screen has painted its first frame,
// so the hand-off from native splash to the JS intro animation is seamless.
SplashScreen.preventAutoHideAsync();

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

setHealthReporter(reportIssue);
// Before anything draws a past season: the pictures of the names a team no longer has.
const ERA_LOGOS = installEraLogos();

// gcTime must be at least the persister's maxAge or restored data is discarded.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Two more tries for a network failure or a 5xx, none for a 4xx (a bad id will not get better), so a deep link to a game that does not exist shows its error at once.
      retry: (count, error) => !(error instanceof HttpError && error.status >= 400 && error.status < 500) && count < 2,
      gcTime: WEEK,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'courtside:query-cache',
  // The whole cache (about 1 MB) is written as one string each time: serializing it on the JS thread every second while live data keeps
  // changing was a hitch waiting to happen. Every eight seconds is plenty for a cache that is only read at start-up.
  throttleTime: 8000,
});

// Slow-changing, small payloads are restored on launch. Game summaries are big and live games change,
// but a *finished* game never does, so the latest few of those are kept too and open instantly, offline.
const PERSISTED = new Set(['teams', 'team', 'roster', 'schedule', 'standings', 'leaders', 'playerStats', 'playerCareer', 'leagueTeamStats', 'allStars', 'allStarWeekend', 'draft', 'draftee', 'seasonAwards', 'cup', 'headToHead', 'playerProfile', 'playerBio', 'playerGameLog', 'teamSeason', 'playoffSeeds', 'gamePregame']);
const KEPT_FINISHED_GAMES = 8;

const isFinished = (q: Query) => !!(q.state.data as { completed?: boolean } | undefined)?.completed;

/** The few finished games kept for offline, worked out once per write of the cache (it asks about every query in turn: a sort for each was a sort per game). */
let newestAt = 0;
let newest = new Set<Query>();
function newestFinishedGames(): Set<Query> {
  const now = Date.now();
  if (now - newestAt > 1000) {
    newestAt = now;
    newest = new Set(
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ['game'] })
        .filter(isFinished)
        .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
        .slice(0, KEPT_FINISHED_GAMES),
    );
  }
  return newest;
}

function shouldPersist(q: Query): boolean {
  if (q.state.status !== 'success') return false;
  const kind = String(q.queryKey[0]);
  if (PERSISTED.has(kind)) return true;
  // A game's YouTube video that was found stays; a miss is not kept (the channel may not have put it up yet).
  if (kind === 'gameRecapVideo') return q.state.data != null;
  // Finished seasons never change: their playoffs and Cup are kept for offline too.
  if ((kind === 'postseason' || kind === 'cup') && Number(q.queryKey[1]) < currentSeason()) return true;
  if (kind !== 'game' || !isFinished(q)) return false;
  return newestFinishedGames().has(q);
}

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: palette.arena, card: palette.arena },
};

/** Expo Router shows this instead of a screen that threw while rendering (the app stays up; "Try again" re-renders it). */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <ScreenError error={error} retry={retry} />;
}

export default function RootLayout() {
  const onRootLayout = useWindowSizeGuard();
  const [fontsLoaded, fontError] = useFonts({
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_900Black,
  });

  // The intro hides the native splash when it paints its first frame. A cold start straight onto another page (a widget,
  // the Dynamic Island or a link opening a game) never mounts the intro, so the splash would stay up for good: hide it
  // as soon as the app is ready on any other page, and, as a last resort, after a few seconds whatever happens.
  const pathname = usePathname();
  // The intro plays over the app for a launch that starts on `/` (not for one that a widget, the Dynamic Island or a link opened on a page).
  const [showIntro, setShowIntro] = useState(pathname === '/');
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    // While the intro is up it hides the splash itself, once the app under it is built (the app's route changes to `/home` meanwhile).
    if (ready && pathname !== '/' && !showIntro) SplashScreen.hide();
  }, [ready, pathname, showIntro]);
  useEffect(() => {
    const id = setTimeout(() => SplashScreen.hide(), 5000);
    return () => clearTimeout(id);
  }, []);

  // Refetch stale queries (and resume live-game polling) when the app returns to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.arena }} onLayout={onRootLayout}>
      {/* Every Reanimated animation follows the system's "Reduce Motion" setting (it is the library's default; stated here so it stays a decision). */}
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: WEEK,
          buster: `v13-${ERA_LOGOS}`,
          dehydrateOptions: {
            shouldDehydrateQuery: shouldPersist,
          },
        }}>
        <TeamProvider>
          <WatchlistProvider>
          <LastVisitProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.arena },
                animation: 'fade',
                // Pages under the top one stop rendering until you come back to them.
                freezeOnBlur: true,
                // iOS 26 enables a swipe-back from anywhere on screen, which swallows the sideways drag that tilts
                // a team card (and scrubs charts). The swipe from the left edge still goes back.
                fullScreenGestureEnabled: false,
              }}>
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(drawer)" options={{ animation: 'fade' }} />
              <Stack.Screen name="player/[id]" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="game/[id]" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="team/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="article/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="search" options={{ animation: 'fade' }} />
              <Stack.Screen name="matchup-standings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="matchup-playoffs" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="matchup-cup" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="matchup-compare" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="series" options={{ animation: 'slide_from_right' }} />
            </Stack>
            {showIntro && <IntroOverlay onDone={() => setShowIntro(false)} />}
            <NavDepthTracker />
            <WidgetSync />
            <PickemSync />
            <DataHealthBanner />
          </ThemeProvider>
          </LastVisitProvider>
          </WatchlistProvider>
        </TeamProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
