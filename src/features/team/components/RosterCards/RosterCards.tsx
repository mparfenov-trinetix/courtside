import * as Haptics from 'expo-haptics';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components';
import type { Player, Team } from '@/lib/espn';
import { fonts, palette, type TeamTheme } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { RosterPlayerCard } from '../RosterPlayerCard';
import { useAppWindow } from '@/hooks';

const GAP = 12;
/** The card's share of the screen's width, and its height over its width (it is shortened to fit the room under the strip and the banner). */
const WIDTH_SHARE = 0.8;
const RATIO = 1.78;
/** Cards this far from the one on screen are built; the rest are empty boxes. */
const WINDOW = 3;

/**
 * The Cards view: a detailed card for each player, swiped sideways with the neighbours peeking in at the edges (the one in the middle is full
 * size, the others a little smaller and dimmer). Under them the players' numbers: a tap on one goes to that card, and the count says where you are.
 * The Teams pager above does not swipe while this view is open (a swipe on the cards must not change team); the team pills move between teams.
 */
export function RosterCards({ players, team, theme }: { players: Player[]; team: Team; theme: TeamTheme }) {
  const insets = useSafeAreaInsets();
  const { width: screen } = useAppWindow();
  const [room, setRoom] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const strip = useRef<ComponentRef<typeof ScrollView>>(null);
  const x = useSharedValue(0);

  const cardW = Math.round(screen * WIDTH_SHARE);
  const step = cardW + GAP;
  // The room the page gives the cards, less the count and the numbers under them.
  const cardH = room > 0 ? Math.round(Math.min(cardW * RATIO, room - 92 - insets.bottom)) : Math.round(cardW * RATIO);
  const side = (screen - cardW) / 2;

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(players.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (next === index) return;
    Haptics.selectionAsync();
    setIndex(next);
    strip.current?.scrollTo({ x: Math.max(0, next * 58 - screen / 2 + 29), animated: true });
  };
  const goTo = (i: number) => {
    if (i === index) return;
    Haptics.selectionAsync();
    setIndex(i);
    listRef.current?.scrollTo({ x: i * step, animated: true });
  };

  return (
    <View style={styles.root} onLayout={(e) => setRoom(e.nativeEvent.layout.height)}>
      {/* Cards far from the one on screen are empty boxes of the same size, so only a few are ever built. (This root must not be `flex: 1`: in the
          Teams pager's cell that left the whole page blank, banner included.) */}
      <Animated.ScrollView
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, alignItems: 'center' }}
        style={{ flexGrow: 0, height: cardH + 8 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onSettled}>
        {players.map((p, i) =>
          Math.abs(i - index) <= WINDOW ? (
            <Slide key={p.id} x={x} i={i} step={step}>
              <RosterPlayerCard
                player={p}
                team={team}
                theme={theme}
                width={cardW}
                height={cardH}
                near={Math.abs(i - index) <= 1}
                onPress={() => {
                  Haptics.selectionAsync();
                  openDetail({ pathname: '/player/[id]', params: { id: p.id, teamId: team.id } });
                }}
              />
            </Slide>
          ) : (
            <View key={p.id} style={{ width: cardW, height: cardH }} />
          ),
        )}
      </Animated.ScrollView>

      <Text style={styles.count}>
        {index + 1} <Text style={styles.countOf}>/ {players.length}</Text>
      </Text>
      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.numbers} style={{ flexGrow: 0 }}>
        {players.map((p, i) => (
          <Chip key={p.id} active={i === index} onPress={() => goTo(i)} label={p.jersey ? `#${p.jersey}` : '–'} size="md" color={theme.accent} role="button" accessibilityLabel={`Go to ${p.name}`} style={{ width: 52, justifyContent: 'center' }} />
        ))}
      </ScrollView>
    </View>
  );
}

/** The card in the middle is full size; the ones beside it are smaller and dimmer, following the scroll frame by frame. */
function Slide({ x, i, step, children }: { x: SharedValue<number>; i: number; step: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const d = (x.get() - i * step) / step;
    return {
      opacity: interpolate(d, [-1, 0, 1], [0.55, 1, 0.55], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [-1, 0, 1], [0.92, 1, 0.92], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, flexShrink: 1, paddingTop: 10 },
  count: { textAlign: 'center', fontFamily: fonts.display, fontSize: 22, color: palette.chalk, marginTop: 10 },
  countOf: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
  numbers: { paddingHorizontal: 16, gap: 6, paddingTop: 8 },
});
