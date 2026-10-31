import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PeopleIcon, StarIcon } from '@/components/icons';
import { cardHeight, TeamCard } from '@/components/team-card';
import { IconButton, LoadingState, ScreenHeader } from '@/components/ui';
import { useTeam, useTeamDetail, useTeamSchedule } from '@/hooks/queries';
import { useTilt } from '@/hooks/use-tilt';
import type { Game } from '@/lib/espn';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

const CONTENT_H = 380;
const HANDLE_H = 80;
const SHEET_TOTAL = CONTENT_H + HANDLE_H;

export default function Home() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { currentTeamId, favoriteTeamId } = useTeamStore();
  const team = useTeam(currentTeamId);
  const { data: detail } = useTeamDetail(currentTeamId);
  const { data: schedule } = useTeamSchedule(currentTeamId);
  const theme = teamTheme(team);

  const cardWidth = Math.round(Math.min(width * 0.78, 360, (height - insets.top - insets.bottom - 230) / 1.4));
  const tilt = useTilt({ width: cardWidth, height: cardHeight(cardWidth) });

  const bg = useSharedValue<string>(theme.background);
  useEffect(() => {
    bg.value = withTiming(theme.background, { duration: 500 });
  }, [theme.background, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  const lettersStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -tilt.x.value * 8 }, { translateY: -tilt.y.value * 5 }],
  }));

  // Bottom sheet
  const sheetY = useSharedValue(CONTENT_H);
  const dragStart = useSharedValue(0);

  const openSheet = () => {
    sheetY.value = withSpring(0, { damping: 24, stiffness: 200, mass: 0.8 });
  };

  const sheetGesture = usePanGesture({
    onBegin: () => {
      'worklet';
      dragStart.value = sheetY.value;
    },
    onUpdate: (e) => {
      'worklet';
      sheetY.value = Math.max(0, Math.min(CONTENT_H, dragStart.value + e.translationY));
    },
    onFinalize: () => {
      'worklet';
      const open = sheetY.value < CONTENT_H / 2;
      sheetY.value = withSpring(open ? 0 : CONTENT_H, {
        damping: 24,
        stiffness: 200,
        mass: 0.8,
      });
    },
  });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const completedGames = useMemo(() => {
    if (!schedule) return [];
    return schedule
      .filter((g) => g.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [schedule]);

  const isFavorite = !!team && team.id === favoriteTeamId;

  if (!team) {
    return (
      <View style={[styles.root, { backgroundColor: palette.arena }]}>
        <LoadingState label="Loading your team" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <Animated.Text
        key={`letters-${team.id}`}
        entering={FadeIn.duration(600)}
        style={[
          styles.letters,
          { color: withAlpha(theme.accent, 0.09), fontSize: width * 0.62, top: height * 0.2 },
          lettersStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {team.abbreviation}
      </Animated.Text>

      <ScreenHeader
        right={
          <IconButton
            label="Change favorite team"
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/onboarding');
            }}>
            <StarIcon color={isFavorite ? theme.accent : palette.chalk} filled={isFavorite} />
          </IconButton>
        }
      />

      <View style={styles.stage}>
        <TeamCard key={team.id} team={team} detail={detail} width={cardWidth} tilt={tilt} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.splits}>
          <Split label="Home" value={detail?.homeRecord} />
          <Split label="Away" value={detail?.awayRecord} />
          <Split label="Arena" value={detail?.venue} wide />
        </View>

        <Pressable
          onPress={() => router.navigate('/roster')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.rosterButton,
            { backgroundColor: withAlpha('#FFFFFF', pressed ? 0.16 : 0.09), borderColor: withAlpha(theme.accent, 0.4) },
          ]}>
          <PeopleIcon color={palette.chalk} />
          <Text style={styles.rosterText}>See the roster</Text>
        </Pressable>

        {!tilt.sensorAvailable && <Text style={styles.hint}>No motion sensor found. Drag the card to tilt it.</Text>}
      </View>

      {/* Games bottom sheet */}
      <GestureDetector gesture={sheetGesture}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom, backgroundColor: withAlpha(theme.surface, 0.97) },
            sheetAnimStyle,
          ]}>
          {/* Drag handle — taller hit-target, tap or drag to open */}
          <Pressable onPress={openSheet} accessibilityRole="button" accessibilityLabel="View recent games" style={styles.sheetHandle}>
            <View style={[styles.handlePill, { backgroundColor: withAlpha(palette.chalk, 0.35) }]} />
            <Text style={[styles.sheetTitle, { color: withAlpha(palette.chalk, 0.75) }]}>Recent games</Text>
          </Pressable>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetContent}
            scrollEnabled
            showsVerticalScrollIndicator={false}>
            {completedGames.length === 0 ? (
              <Text style={styles.emptyText}>No completed games yet</Text>
            ) : (
              completedGames.map((game) => (
                <GameRow key={game.id} game={game} theme={theme} />
              ))
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function Split({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <View style={wide ? { flex: 1 } : undefined}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue} numberOfLines={1}>
        {value ?? '–'}
      </Text>
    </View>
  );
}

function GameRow({ game, theme }: { game: Game; theme: ReturnType<typeof teamTheme> }) {
  const date = new Date(game.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${game.result} vs ${game.opponent}`}
      style={({ pressed }) => [styles.gameRow, pressed && { opacity: 0.75 }]}>
      {/* Result badge */}
      <View
        style={[
          styles.resultBadge,
          { backgroundColor: game.result === 'W' ? withAlpha('#34D399', 0.18) : withAlpha('#F87171', 0.18) },
        ]}>
        <Text
          style={[
            styles.resultLetter,
            { color: game.result === 'W' ? '#34D399' : '#F87171' },
          ]}>
          {game.result}
        </Text>
        <Text style={[styles.resultScore, { color: palette.chalk }]}>
          {game.teamScore}–{game.opponentScore}
        </Text>
      </View>

      {/* Opponent */}
      <View style={styles.gameOpponent}>
        {game.opponentLogo ? (
          <Image source={game.opponentLogo} style={styles.oppLogo} contentFit="contain" />
        ) : (
          <View style={[styles.oppLogo, { backgroundColor: withAlpha(palette.chalk, 0.1), borderRadius: 14 }]} />
        )}
        <View>
          <Text style={styles.oppName} numberOfLines={1}>{game.opponent}</Text>
          <Text style={styles.gameLocation}>{game.home ? 'Home' : 'Away'} · {dateStr}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  letters: {
    position: 'absolute',
    left: -10,
    right: -10,
    textAlign: 'center',
    fontFamily: 'BigShouldersDisplay_900Black',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 16,
  },
  splits: {
    flexDirection: 'row',
    gap: 24,
  },
  splitLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
  splitValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: palette.chalk,
  },
  rosterButton: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  rosterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
  },
  // Sheet
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_TOTAL,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHandle: {
    height: HANDLE_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  handlePill: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 32,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: withAlpha('#FFFFFF', 0.06),
  },
  resultBadge: {
    width: 64,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  resultLetter: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 22,
  },
  resultScore: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
  },
  gameOpponent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oppLogo: {
    width: 36,
    height: 36,
  },
  oppName: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: palette.chalk,
  },
  gameLocation: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    marginTop: 1,
  },
});
