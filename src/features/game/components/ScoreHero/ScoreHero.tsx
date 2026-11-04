import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, HeatBadge, Tick, RollingNumber, UpdatedAgo } from '@/components';
import type { BoxScoreTeam } from '@/lib/espn';
import { gameHeat, periodLabel } from '@/lib/game';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail, sharedTag } from '@/navigation';

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
  gameId,
  origin,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  status: string;
  live: boolean;
  completed: boolean;
  hasStarted: boolean;
  periodCount: number;
  selPeriods: number[] | null;
  /** With `origin`, names the logos and scores that fly in from the list this game was opened from. */
  gameId?: string;
  origin?: string;
}) {
  const filtered = selPeriods != null;
  return (
    <View>
      <Animated.View entering={FadeIn.duration(350)} style={styles.scoreHeader}>
        <TeamScore team={away} tag={sharedTag(origin, 'game', gameId ?? '', 'away', 'logo')} />
        <View
          style={styles.scoreCenter}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            hasStarted
              ? `${away.team.displayName} ${away.score}, ${home.team.displayName} ${home.score}. ${status}`
              : `${away.team.displayName} at ${home.team.displayName}. ${status}`
          }>
          {hasStarted ? (
            <View style={styles.bigScore}>
              <Animated.View sharedTransitionTag={sharedTag(origin, 'game', gameId ?? '', 'away', 'score')}>
                <RollingNumber value={away.score} fontSize={32} style={styles.vsScore} />
              </Animated.View>
              <Text style={styles.vsScore}>–</Text>
              <Animated.View sharedTransitionTag={sharedTag(origin, 'game', gameId ?? '', 'home', 'score')}>
                <RollingNumber value={home.score} fontSize={32} style={styles.vsScore} />
              </Animated.View>
            </View>
          ) : (
            <Text style={styles.vsScore}>vs</Text>
          )}
          {live ? <LivePill label={status} /> : <Text style={styles.gameStatus}>{status}</Text>}
          {live ? <HeatBadge heat={gameHeat(away.score, home.score, status)} /> : null}
        </View>
        <TeamScore team={home} right tag={sharedTag(origin, 'game', gameId ?? '', 'home', 'logo')} />
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

function TeamScore({ team, right, tag }: { team: BoxScoreTeam; right?: boolean; tag?: string }) {
  return (
    <Pressable
      onPress={() => openDetail(`/team/${team.team.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${team.team.abbreviation}`}
      style={({ pressed }) => [styles.teamBlock, right && styles.teamBlockRight, pressed && { opacity: 0.7 }]}>
      <View style={styles.lockup}>
        <Animated.View sharedTransitionTag={tag} style={styles.teamLogo}>
          {team.team.logoDark || team.team.logo ? (
            <Image source={team.team.logoDark || team.team.logo} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : null}
        </Animated.View>
        <Text style={styles.teamAbbr}>{team.team.abbreviation}</Text>
      </View>
    </Pressable>
  );
}

// ─── Slim top bar ─────────────────────────────────────────────────────────────

/**
 * Always visible. At the top of the page it holds the game's status; once the big header
 * has scrolled away it turns into a compact scoreboard so the score is never out of reach.
 */
export function GameTopBar({
  collapsed,
  away,
  home,
  status,
  live,
  hasStarted,
  updatedAt,
  cup,
  tint,
  pinned,
}: {
  /** 0 while the big score is on screen, 1 once the compact one in this bar replaces it. */
  collapsed: SharedValue<number>;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  status: string;
  live: boolean;
  hasStarted: boolean;
  updatedAt: number;
  /** NBA Cup stage, when this game is part of the Cup. */
  cup?: string;
  /** Opaque left and right colors of the team-colored header surface. */
  tint: [string, string];
  /** 0 while the tabs are still in flow, 1 once they are pinned (see the game screen). */
  pinned: SharedValue<number>;
}) {
  const insets = useSafeAreaInsets();
  // The matchup label clears out before the compact score fades in, so the two never sit on top of each other.
  const compact = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (collapsed.get() - 0.45) / 0.55)),
    transform: [{ translateY: (1 - collapsed.get()) * 8 }],
  }));
  const label = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, 1 - collapsed.get() * 2.2)) }));
  const surface = useAnimatedStyle(() => ({ opacity: pinned.get() }));

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 10, paddingBottom: 4 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, surface]}>
        <LinearGradient colors={tint} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
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
              {away.team.abbreviation} @ {home.team.abbreviation}{cup ? ' · NBA CUP' : ''}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.topLayer, compact]} pointerEvents="none">
            <View style={styles.miniScore}>
              {away.team.logoDark || away.team.logo ? (
                <Image source={away.team.logoDark || away.team.logo} style={styles.miniLogo} contentFit="contain" />
              ) : null}
              <RollingNumber value={hasStarted ? away.score : '–'} fontSize={24} style={styles.miniNum} />
              <Text style={styles.miniDash}>–</Text>
              <RollingNumber value={hasStarted ? home.score : '–'} fontSize={24} style={styles.miniNum} />
              {home.team.logoDark || home.team.logo ? (
                <Image source={home.team.logoDark || home.team.logo} style={styles.miniLogo} contentFit="contain" />
              ) : null}
            </View>
            <Text style={[styles.miniStatus, live && { color: '#F87171' }]} numberOfLines={1}>{status}</Text>
          </Animated.View>
        </View>

        <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{live ? <UpdatedAgo at={updatedAt} /> : null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  teamBlock: { flex: 1, alignItems: 'flex-start' },
  // Logo and name share one vertical axis, whatever the logo's shape.
  lockup: { alignItems: 'center', gap: 6 },
  teamBlockRight: { alignItems: 'flex-end' },
  teamLogo: { width: 52, height: 52 },
  teamAbbr: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  scoreCenter: { alignItems: 'center', gap: 4 },
  vsScore: { fontFamily: fonts.display, fontSize: 32, color: palette.chalk },
  bigScore: { flexDirection: 'row', alignItems: 'center' },
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
});
