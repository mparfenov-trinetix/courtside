import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';
import { useEffect, useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type HostInstance, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type AnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, HeatBadge, StarIcon, Tick, RollingNumber } from '@/components';
import type { BoxScoreTeam } from '@/lib/espn';
import { gameHeat, periodLabel, TIMEOUTS_PER_GAME } from '@/lib/game';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { goBack, openDetail, sharedTag } from '@/navigation';
import { BAR_LOGO, HERO_LOGO } from '../GameLogos';

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
  onLogoSlot,
  scrollY,
  timeout,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  status: string;
  live: boolean;
  completed: boolean;
  hasStarted: boolean;
  periodCount: number;
  selPeriods: number[] | null;
  /** With `origin`, names the scores that fly in from the list this game was opened from. */
  gameId?: string;
  origin?: string;
  /** Reports where each logo's slot is on screen (its center); the logos themselves are drawn by `GameLogos`. */
  onLogoSlot?: (side: 'away' | 'home', x: number, y: number) => void;
  /** The page's scroll: the timeout bars fade out as the header starts to collapse, so they never ride under the top bar. */
  scrollY?: SharedValue<number>;
  /** Set while a timeout is on: "NOP TO" for a team's, "Official TO" for an official one. */
  timeout?: string;
}) {
  const filtered = selPeriods != null;
  const bars = useAnimatedStyle(() => ({ opacity: scrollY ? Math.max(0, 1 - scrollY.get() / 36) : 1 }));
  // The clock, timeout and heat labels fade as the header starts to collapse, before the top bar shows the same ones: at no
  // point of the scroll (so wherever it is stopped) is the same information on screen twice.
  const labels = useAnimatedStyle(() => ({ opacity: scrollY ? Math.max(0, 1 - scrollY.get() / 28) : 1 }));
  const awaySlot = useRef<HostInstance>(null);
  const homeSlot = useRef<HostInstance>(null);
  // Called whenever the row or a slot is laid out: a live badge appearing makes the row taller and moves the slots.
  const measure = () => {
    awaySlot.current?.measureInWindow((x, y, w, h) => onLogoSlot?.('away', x + w / 2, y + h / 2));
    homeSlot.current?.measureInWindow((x, y, w, h) => onLogoSlot?.('home', x + w / 2, y + h / 2));
  };
  return (
    <View>
      <Animated.View onLayout={measure} style={styles.scoreHeader}>
        <TeamScore team={away} slot={awaySlot} onLayout={measure} showTimeouts={live} barsStyle={bars} />
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
          <Animated.View style={[styles.labels, labels]}>
            {live ? <LivePill label={status} /> : <Text style={styles.gameStatus}>{status}</Text>}
            {live && timeout ? <TimeoutPill label={timeout} /> : null}
            {live ? <HeatBadge heat={gameHeat(away.score, home.score, status)} /> : null}
          </Animated.View>
        </View>
        <TeamScore team={home} right slot={homeSlot} onLayout={measure} showTimeouts={live} barsStyle={bars} />
      </Animated.View>

      {periodCount > 0 && (
        <Animated.View style={styles.linescoreWrap}>
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

/** "NOP TO": a timeout is on. Sits under the clock, which has stopped. */
export function TimeoutPill({ label }: { label: string }) {
  return (
    <View style={styles.timeoutPill}>
      <Text style={styles.timeoutPillText}>{label}</Text>
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

function TeamScore({
  team,
  right,
  slot,
  onLayout,
  showTimeouts,
  barsStyle,
}: {
  team: BoxScoreTeam;
  right?: boolean;
  slot: RefObject<HostInstance | null>;
  onLayout: () => void;
  /** Live games only: ESPN reports the timeouts left just while the game is on. */
  showTimeouts: boolean;
  barsStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
}) {
  return (
    <Pressable
      onPress={() => openDetail(`/team/${team.team.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${team.team.abbreviation}`}
      style={({ pressed }) => [styles.teamBlock, right && styles.teamBlockRight, pressed && { opacity: 0.7 }]}>
      <View style={styles.lockup}>
        {/* Empty: it only keeps the room. The logo is drawn above the page, so it can travel into the top bar. */}
        <View ref={slot} onLayout={onLayout} style={styles.teamLogo} />
        <Text style={styles.teamAbbr}>{team.team.abbreviation}</Text>
        {showTimeouts && team.timeoutsRemaining != null ? (
          <Animated.View style={[styles.timeouts, barsStyle]} accessible accessibilityLabel={`${team.timeoutsRemaining} timeouts left`}>
            {Array.from({ length: TIMEOUTS_PER_GAME }, (_, i) => (
              <View key={i} style={[styles.timeoutBar, i < (team.timeoutsRemaining ?? 0) && styles.timeoutLeft]} />
            ))}
          </Animated.View>
        ) : null}
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
  cup,
  kickoff,
  watched,
  onWatch,
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
  /** NBA Cup stage, when this game is part of the Cup. */
  cup?: string;
  /** When the game starts, in the device's time ("Tomorrow · 01:00"); shown under the matchup and, before tip-off, in the compact bar. */
  kickoff?: string;
  /** Whether the game is starred in the watchlist, and the star's handler. */
  watched: boolean;
  onWatch: () => void;
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
  // The score fills the room between the two logos, leaving a little air on each side.
  const { size, offset } = BAR_LOGO.started;
  const miniWidth = 2 * (offset - size / 2 - 8);

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 10, paddingBottom: 4 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, surface]}>
        <LinearGradient colors={tint} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.topRow}>
        <View style={styles.topSide}>
          <Pressable
            onPress={goBack}
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
            {kickoff ? (
              <View style={styles.kickoffPill}>
                <Text style={styles.kickoffText}>{kickoff}</Text>
              </View>
            ) : null}
          </Animated.View>
          {/* The logos on either side of this are drawn by GameLogos; this only keeps them room. */}
          <Animated.View style={[styles.topLayer, compact]} pointerEvents="none">
            {hasStarted ? (
              <>
                <View style={[styles.miniScore, { width: miniWidth }]}>
                  <RollingNumber value={away.score} fontSize={24} style={styles.miniNum} />
                  <Text style={styles.miniDash}>–</Text>
                  <RollingNumber value={home.score} fontSize={24} style={styles.miniNum} />
                </View>
                {/* The period and clock only while it is being played; a finished score needs no label. */}
                {live ? <Text style={[styles.miniStatus, { color: '#F87171' }]} numberOfLines={1}>{status}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.miniStatus} numberOfLines={1}>{status}</Text>
                {kickoff ? <Text style={styles.miniKickoff} numberOfLines={1}>{kickoff}</Text> : null}
              </>
            )}
          </Animated.View>
        </View>

        <View style={[styles.topSide, { alignItems: 'flex-end' }]}>
          <Pressable
            onPress={onWatch}
            accessibilityRole="button"
            accessibilityLabel={watched ? 'Remove game from watchlist' : 'Add game to watchlist'}
            accessibilityState={{ selected: watched }}
            hitSlop={14}
            style={[styles.backBtn, watched && { backgroundColor: withAlpha('#FBBF24', 0.18) }]}>
            <StarIcon color={watched ? '#FBBF24' : palette.chalk} size={20} filled={watched} />
          </Pressable>
        </View>
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
  teamLogo: { width: HERO_LOGO, height: HERO_LOGO },
  teamAbbr: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  labels: { alignItems: 'center', gap: 4 },
  scoreCenter: { alignItems: 'center', gap: 4 },
  vsScore: { fontFamily: fonts.display, fontSize: 32, color: palette.chalk },
  bigScore: { flexDirection: 'row', alignItems: 'center' },
  gameStatus: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Seven short horizontal dashes under the team's name, one per timeout: lit for each one left. As wide as the logo.
  timeouts: { flexDirection: 'row', gap: 2, marginTop: 7 },
  timeoutBar: { width: 6, height: 3, borderRadius: 1.5, backgroundColor: withAlpha(palette.chalk, 0.16) },
  timeoutLeft: { backgroundColor: '#34D399' },
  timeoutPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: withAlpha('#FBBF24', 0.18) },
  timeoutPillText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#FBBF24', letterSpacing: 0.6 },

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
  matchup: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, color: palette.muted, letterSpacing: 0.6 },
  kickoffPill: { marginTop: 3, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: withAlpha(palette.chalk, 0.1) },
  kickoffText: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.chalk, letterSpacing: 0.3 },
  miniScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  miniKickoff: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk, marginTop: 1 },
  miniNum: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  miniDash: { fontFamily: fonts.body, fontSize: 16, color: palette.muted },
  miniStatus: { fontFamily: fonts.bodySemi, fontSize: 10, color: palette.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: -2 },
});
