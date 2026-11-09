import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { ListSkeleton, PaneTitle, ScreenHeader, SeasonButton, SeasonSheet, Spotlight } from '@/components';
import { PlayInView, PlayoffsView } from '../../components';
import { useSceneSettled } from '@/hooks';
import { currentSeason } from '@/lib/espn';
import { hasPlayIn } from '@/lib/league';
import { palette } from '@/lib/theme';
import { goBack } from '@/navigation';
import { PLAYOFFS_FROM } from './constants';

const LABELS = ['Playoffs', 'Play-In'];

/**
 * The playoff bracket and play-in games for any recent season, side by side: swipe sideways between them (the title says which, with a
 * dot per pane). `pushed`: opened from a game (route `matchup-playoffs`), on top of it, for that game's season only (no season
 * picker), with `teams` (comma separated ids) lit up and the pane they are in showing; the back arrow returns to the game.
 */
export function PlayoffsScreen({ pushed = false }: { pushed?: boolean }) {
  const params = useLocalSearchParams<{ teams?: string; season?: string; pane?: string }>();
  const { width } = useWindowDimensions();
  const spot = pushed ? (params.teams ?? '').split(',').filter(Boolean) : [];
  const [season, setSeason] = useState(pushed && params.season ? Number(params.season) : currentSeason());
  // The pane on screen (0 playoffs, 1 play-in); kept across a season change, which starts the pager over on it.
  const [pane, setPane] = useState(pushed && params.pane === 'playin' ? 1 : 0);
  const [picking, setPicking] = useState(false);
  // No play-in before 2020-21: just the bracket, no pager.
  const playIn = hasPlayIn(season);
  const page = useSharedValue(pane);
  const onScroll = useAnimatedScrollHandler((e) => {
    page.set(e.contentOffset.x / width);
  });
  // Only the pane on screen is drawn at once; the other (a bracket is heavy) follows once the screen has settled.
  const settled = useSceneSettled(150);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader
        title={playIn ? <PaneTitle labels={LABELS} page={page} /> : 'Playoffs'}
        color={palette.chalk}
        onBack={pushed ? goBack : undefined}
        right={pushed ? undefined : <SeasonButton season={season} onPress={() => setPicking(true)} />}
      />
      <Spotlight teams={spot}>
        {playIn ? (
          <Animated.ScrollView
            // A season change starts the pager over, on the pane you were on.
            key={season}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: pane * width, y: 0 }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => setPane(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ flex: 1 }}>
            <View style={{ width }}>{settled || pane === 0 ? <PlayoffsView season={season} /> : <ListSkeleton count={8} avatar="square" />}</View>
            <View style={{ width }}>{settled || pane === 1 ? <PlayInView season={season} /> : <ListSkeleton count={8} avatar="square" />}</View>
          </Animated.ScrollView>
        ) : (
          <PlayoffsView season={season} />
        )}
      </Spotlight>
      <SeasonSheet from={PLAYOFFS_FROM} visible={picking} season={season} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
