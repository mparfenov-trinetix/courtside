import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, FadeIn, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import type { Href } from 'expo-router';

import { useTeam, useTeamRated, useAppWindow } from '@/hooks';
import { currentSeason, seasonLabel, type Injury, type Team } from '@/lib/espn';
import { GROUP_LABEL, pickKeyMatchup, type PositionGroup } from '@/lib/league';
import { fonts, palette, radius, teamTheme, textStyle, withAlpha } from '@/lib/theme';
import { openDetail, pushOnce } from '@/navigation';
import { MINI_CARD_RATIO, MiniPlayerCard, type MiniStar } from '@/components';
import { READABLE_MAX } from '@/lib/layout';
import { GAP, MAX_CARD, MEET_DELAY_MS, SIDE } from './constants';

/** One side of the duel: a team and the player it is represented by. */
export type DuelSide = { team: Team; star: MiniStar };

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : -1;
};

/**
 * The game before it is played, when it has a real matchup: two stars of the same position (guards, forwards or centers, `pickKeyMatchup`: both
 * among their team's best three and scoring 20 or more) face to face. Most games have none and show nothing. Nobody ruled out by an injury is shown (a
 * day-to-day player is, flagged). The two cards fly in from the sides and meet, with a spring that overshoots a little, a flash and the VS badge
 * popping at the meeting, without the cards crossing; whoever has the higher PPG, RPG or APG has it lit. Hidden when either team has nobody rated yet (the start of a
 * season). A tap on a card opens the player, "Compare" opens them side by side.
 */
export function KeyMatchup({ awayId, homeId, injuries }: { awayId: string; homeId: string; injuries: Injury[] }) {
  const awayTeam = useTeam(awayId);
  const homeTeam = useTeam(homeId);
  const awayRated = useTeamRated(awayId);
  const homeRated = useTeamRated(homeId);
  // Nothing while the two lists load (most games turn out to have no matchup, so a placeholder would flash on every one of them): the section
  // appears, with its entrance, only once there is a real matchup to show.
  if (awayRated.isPending || homeRated.isPending || !awayTeam || !homeTeam) return null;
  const pick = pickKeyMatchup(awayRated.data ?? [], homeRated.data ?? [], injuries);
  if (!pick) return null;
  return (
    <KeyMatchupView
      group={pick.group}
      away={{ team: awayTeam, star: { ...pick.away, status: pick.awayStatus } }}
      home={{ team: homeTeam, star: { ...pick.home, status: pick.homeStatus } }}
    />
  );
}

/** The duel with its two sides already known (the data-free half, so a story can show it). */
export function KeyMatchupView({
  away,
  home,
  group = null,
  title,
  unit = 'season',
  section = false,
  season,
}: {
  away: DuelSide;
  home: DuelSide;
  /** The position they share, named beside the title. */
  group?: PositionGroup | null;
  /** Replaces the title (a finished game's duel has its own). */
  title?: string;
  /** Whose numbers they are: season averages, or the game's line. */
  unit?: 'season' | 'game';
  /** On the game tabs, where sections are 14 apart, not 18. */
  section?: boolean;
  /** The season these two played in, for a game or series of the past: "Compare their seasons" then compares that season, not the one in progress. */
  season?: number;
}) {
  const { width: screen } = useAppWindow();
  const reduced = useReducedMotion();
  // The cards stop growing at a size a trading card can have; on a wider page the pair sits in the middle of it (pages are READABLE_MAX wide at most).
  const box = Math.min(screen, READABLE_MAX);
  const cardW = Math.min(Math.floor((box - SIDE * 2 - GAP) / 2), MAX_CARD);
  const sideX = Math.round((box - cardW * 2 - GAP) / 2);
  const cardH = Math.round(cardW * MINI_CARD_RATIO);
  const awayTheme = teamTheme(away.team);
  const homeTheme = teamTheme(home.team);

  // 0: the cards are out at the sides, 1: they have met. The spring overshoots past 1 and settles, which is the collision.
  const meet = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    // No overshoot: past 1 the two cards would cross each other for a moment.
    meet.set(withDelay(MEET_DELAY_MS, withSpring(1, { damping: 20, stiffness: 130, mass: 0.9, overshootClamping: true })));
  }, [reduced, meet]);

  const slide = cardW * 0.62;
  const awayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(meet.get(), [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [{ perspective: 900 }, { translateX: interpolate(meet.get(), [0, 1], [-slide, 0]) }, { rotateY: `${interpolate(meet.get(), [0, 1], [38, 0])}deg` }, { scale: interpolate(meet.get(), [0, 1], [0.86, 1]) }],
  }));
  const homeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(meet.get(), [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [{ perspective: 900 }, { translateX: interpolate(meet.get(), [0, 1], [slide, 0]) }, { rotateY: `${interpolate(meet.get(), [0, 1], [-38, 0])}deg` }, { scale: interpolate(meet.get(), [0, 1], [0.86, 1]) }],
  }));
  const vsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(meet.get(), [0.55, 0.75], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(meet.get(), [0.55, 0.9, 1], [0, 1.3, 1], Extrapolation.CLAMP) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: interpolate(meet.get(), [0.6, 0.82, 1], [0, 0.55, 0], Extrapolation.CLAMP) }));

  const past = season != null && season < currentSeason();
  const better = (a: DuelSide, b: DuelSide) => ({ ppg: num(a.star.ppg) > num(b.star.ppg), rpg: num(a.star.rpg) > num(b.star.rpg), apg: num(a.star.apg) > num(b.star.apg) });
  const open = (s: DuelSide) => openDetail({ pathname: '/player/[id]', params: { id: s.star.athleteId, teamId: s.team.id } });
  const compare = () =>
    pushOnce(
      `/matchup-compare?${new URLSearchParams({
        id: away.star.athleteId,
        name: away.star.name,
        teamId: away.team.id,
        teamAbbr: away.team.abbreviation,
        id2: home.star.athleteId,
        name2: home.star.name,
        teamId2: home.team.id,
        teamAbbr2: home.team.abbreviation,
        ...(past ? { season: String(season) } : {}),
      }).toString()}` as Href,
    );

  return (
    <Animated.View entering={FadeIn.duration(320)} style={[styles.wrap, section && styles.section]}>
      <Text style={[styles.title, { paddingHorizontal: sideX }]}>{title ?? (group ? `Key matchup · ${GROUP_LABEL[group]}` : 'Key matchup')}</Text>
      <View style={[styles.row, { height: cardH, paddingHorizontal: sideX }]}>
        <MiniPlayerCard team={away.team} theme={awayTheme} star={away.star} width={cardW} better={better(away, home)} unit={unit} style={awayStyle} onPress={() => open(away)} />
        <MiniPlayerCard team={home.team} theme={homeTheme} star={home.star} width={cardW} better={better(home, away)} unit={unit} style={homeStyle} onPress={() => open(home)} />
        {/* Where they meet: a flash in white, then the VS badge. */}
        <Animated.View pointerEvents="none" style={[styles.flash, { left: sideX + cardW + GAP / 2 - 26, height: cardH }, flashStyle]} />
        <Animated.View pointerEvents="none" style={[styles.vs, { left: box / 2 - 20, top: cardH / 2 - 20 }, vsStyle]}>
          <Text style={styles.vsText}>VS</Text>
        </Animated.View>
      </View>
      <Pressable onPress={compare} accessibilityRole="button" hitSlop={8} style={styles.compare}>
        <Text style={styles.compareText}>{past ? `Compare their ${seasonLabel(season)} seasons ›` : 'Compare their seasons ›'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  // The game tabs' rhythm: sections 14 apart.
  section: { marginBottom: 14 },
  title: { ...textStyle.sectionLabel, paddingHorizontal: SIDE, marginBottom: 8 },
  row: { flexDirection: 'row', gap: GAP, paddingHorizontal: SIDE },
  flash: { position: 'absolute', top: 0, width: 52, backgroundColor: '#FFFFFF', borderRadius: radius.pill },
  vs: { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena, borderWidth: 1.5, borderColor: withAlpha(palette.chalk, 0.5) },
  vsText: { fontFamily: fonts.display, fontSize: 17, color: palette.chalk, letterSpacing: 0.5 },
  compare: { alignSelf: 'center', marginTop: 10 },
  compareText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
