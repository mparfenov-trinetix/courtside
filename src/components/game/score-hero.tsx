import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/icons';
import { Tick } from '@/components/live-flash';
import { UpdatedAgo } from '@/components/updated-ago';
import type { BoxScoreTeam } from '@/lib/espn';
import { periodLabel } from '@/lib/game-model';
import { fonts, palette, withAlpha } from '@/lib/theme';

// ─── Big header ───────────────────────────────────────────────────────────────

export function ScoreHero({
  away,
  home,
  status,
  live,
  completed,
  hasStarted,
  periodCount,
  selPeriods,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  status: string;
  live: boolean;
  completed: boolean;
  hasStarted: boolean;
  periodCount: number;
  selPeriods: number[] | null;
}) {
  const filtered = selPeriods != null;
  return (
    <View>
      <Animated.View entering={FadeIn.duration(350)} style={styles.scoreHeader}>
        <TeamScore team={away} />
        <View style={styles.scoreCenter}>
          <Tick style={styles.vsScore} value={hasStarted ? `${away.score}–${home.score}` : 'vs'} />
          {live ? <LivePill label={status} /> : <Text style={styles.gameStatus}>{status}</Text>}
        </View>
        <TeamScore team={home} right />
      </Animated.View>

      {periodCount > 0 && (
        <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.linescoreWrap}>
          <View style={styles.linescoreTable}>
            <View style={styles.lsRow}>
              <Text style={[styles.lsCell, styles.lsTeamCell]} />
              {Array.from({ length: periodCount }, (_, i) => (
                <Text key={i} style={[styles.lsCell, styles.lsHeaderCell, selPeriods?.includes(i + 1) && styles.lsActive]}>
                  {periodLabel(i + 1)}
                </Text>
              ))}
              <Text style={[styles.lsCell, styles.lsHeaderCell, styles.lsTotalCell, !filtered && styles.lsActive]}>
                {completed ? 'F' : 'T'}
              </Text>
            </View>
            {([away, home] as BoxScoreTeam[]).map((t) => (
              <View key={t.team.id} style={[styles.lsRow, styles.lsDataRow]}>
                <Text style={[styles.lsCell, styles.lsTeamCell, styles.lsTeamName]} numberOfLines={1}>
                  {t.team.abbreviation}
                </Text>
                {Array.from({ length: periodCount }, (_, i) => (
                  <Tick
                    key={i}
                    style={[styles.lsCell, selPeriods?.includes(i + 1) && styles.lsActive]}
                    value={t.linescores[i] != null ? String(t.linescores[i]) : '–'}
                  />
                ))}
                <Tick style={[styles.lsCell, styles.lsTotalCell, styles.lsFinalScore, !filtered && styles.lsActive]} value={t.score} />
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export function LivePill({ label }: { label: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View style={styles.livePill}>
      <Animated.View style={[styles.liveDot, dot]} />
      <Tick style={styles.liveText} value={label || 'Live'} />
    </View>
  );
}

function TeamScore({ team, right }: { team: BoxScoreTeam; right?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/team/${team.team.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${team.team.abbreviation}`}
      style={({ pressed }) => [styles.teamBlock, right && styles.teamBlockRight, pressed && { opacity: 0.7 }]}>
      {team.team.logoDark || team.team.logo ? (
        <Image source={team.team.logoDark || team.team.logo} style={styles.teamLogo} contentFit="contain" />
      ) : null}
      <Text style={styles.teamAbbr}>{team.team.abbreviation}</Text>
    </Pressable>
  );
}

// ─── Slim top bar ─────────────────────────────────────────────────────────────

/**
 * Always visible. At the top of the page it holds the game's status; once the big header
 * has scrolled away it turns into a compact scoreboard so the score is never out of reach.
 */
export function GameTopBar({
  scrollY,
  away,
  home,
  status,
  live,
  hasStarted,
  updatedAt,
}: {
  scrollY: SharedValue<number>;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  status: string;
  live: boolean;
  hasStarted: boolean;
  updatedAt: number;
}) {
  const insets = useSafeAreaInsets();
  const compact = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [70, 130], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.get(), [70, 130], [8, 0], Extrapolation.CLAMP) }],
  }));
  const label = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [40, 100], [1, 0], Extrapolation.CLAMP),
  }));
  const rule = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [100, 160], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topRow}>
        <View style={styles.topSide}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={14}
            style={styles.backBtn}>
            <ArrowLeftIcon color={palette.chalk} size={20} />
          </Pressable>
        </View>

        <View style={styles.topCenter}>
          <Animated.View style={[styles.topLayer, label]} pointerEvents="none">
            <Text style={styles.matchup}>
              {away.team.abbreviation} @ {home.team.abbreviation}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.topLayer, compact]} pointerEvents="none">
            <View style={styles.miniScore}>
              {away.team.logoDark || away.team.logo ? (
                <Image source={away.team.logoDark || away.team.logo} style={styles.miniLogo} contentFit="contain" />
              ) : null}
              <Tick style={styles.miniNum} value={hasStarted ? away.score : '–'} />
              <Text style={styles.miniDash}>–</Text>
              <Tick style={styles.miniNum} value={hasStarted ? home.score : '–'} />
              {home.team.logoDark || home.team.logo ? (
                <Image source={home.team.logoDark || home.team.logo} style={styles.miniLogo} contentFit="contain" />
              ) : null}
            </View>
            <Text style={[styles.miniStatus, live && { color: '#F87171' }]} numberOfLines={1}>{status}</Text>
          </Animated.View>
        </View>

        <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{live ? <UpdatedAgo at={updatedAt} /> : null}</View>
      </View>
      <Animated.View style={[styles.rule, rule]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scoreHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  teamBlock: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamBlockRight: { alignItems: 'flex-end' },
  teamLogo: { width: 52, height: 52 },
  teamAbbr: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  scoreCenter: { alignItems: 'center', gap: 4 },
  vsScore: { fontFamily: fonts.display, fontSize: 32, color: palette.chalk },
  gameStatus: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase' },

  linescoreWrap: { paddingHorizontal: 16, marginBottom: 12 },
  linescoreTable: { backgroundColor: withAlpha('#FFFFFF', 0.05), borderRadius: 14, overflow: 'hidden', paddingVertical: 4 },
  lsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  lsDataRow: { paddingVertical: 8 },
  lsCell: { width: 36, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  lsHeaderCell: { color: palette.muted, fontFamily: fonts.body, fontSize: 11 },
  lsTeamCell: { flex: 1, textAlign: 'left' },
  lsTeamName: { fontFamily: fonts.bodyBold, fontSize: 14 },
  lsTotalCell: { fontFamily: fonts.bodyBold },
  lsFinalScore: { fontSize: 15 },
  lsActive: { color: palette.chalk, fontFamily: fonts.bodyBold },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: withAlpha('#F87171', 0.16),
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F87171' },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#F87171', letterSpacing: 0.4 },

  topBar: { paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', height: 44 },
  topSide: { width: 84, justifyContent: 'center' },
  topCenter: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  topLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.chalk, 0.08),
  },
  matchup: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, letterSpacing: 0.6 },
  miniScore: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  miniLogo: { width: 22, height: 22 },
  miniNum: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  miniDash: { fontFamily: fonts.body, fontSize: 16, color: palette.muted },
  miniStatus: { fontFamily: fonts.bodySemi, fontSize: 10, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: -2 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(palette.chalk, 0.18), marginTop: 6, marginHorizontal: -16 },
});
