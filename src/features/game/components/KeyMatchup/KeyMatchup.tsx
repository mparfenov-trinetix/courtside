import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import type { Href } from 'expo-router';

import { Skeleton, SkeletonGroup } from '@/components';
import { useTeam, useTeamRated } from '@/hooks';
import type { Injury, Team } from '@/lib/espn';
import { GROUP_LABEL, pickKeyMatchup, type PositionGroup } from '@/lib/league';
import { fonts, palette, radius, teamTheme, textStyle, withAlpha } from '@/lib/theme';
import { openDetail, pushOnce } from '@/navigation';
import { DuelCard, type DuelStar } from './DuelCard';
import { CARD_RATIO, GAP, MEET_DELAY_MS, SIDE } from './constants';

/** One side of the duel: a team and the player it is represented by. */
export type DuelSide = { team: Team; star: DuelStar };

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : -1;
};

/**
 * The game before it is played, in one picture: the matchup that decides most of it, two players of the same position (guards, forwards or
 * centers, `pickKeyMatchup`) as high up their team's ESPN rating as they get, face to face. Nobody ruled out by an injury is shown (a
 * day-to-day player is, flagged). The two cards fly in from the sides and meet, with a spring that overshoots a little, a flash and the VS badge
 * popping at the collision; whoever has the higher PPG, RPG or APG has it lit. Hidden when either team has nobody rated yet (the start of a
 * season). A tap on a card opens the player, "Compare" opens them side by side.
 */
export function KeyMatchup({ awayId, homeId, injuries }: { awayId: string; homeId: string; injuries: Injury[] }) {
  const awayTeam = useTeam(awayId);
  const homeTeam = useTeam(homeId);
  const awayRated = useTeamRated(awayId);
  const homeRated = useTeamRated(homeId);
  if (awayRated.isPending || homeRated.isPending || !awayTeam || !homeTeam) return <KeyMatchupSkeleton />;
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
export function KeyMatchupView({ away, home, group = null }: { away: DuelSide; home: DuelSide; /** The position they share, named beside the title. */ group?: PositionGroup | null }) {
  const { width: screen } = useWindowDimensions();
  const reduced = useReducedMotion();
  const cardW = Math.floor((screen - SIDE * 2 - GAP) / 2);
  const cardH = Math.round(cardW * CARD_RATIO);
  const awayTheme = teamTheme(away.team);
  const homeTheme = teamTheme(home.team);

  // 0: the cards are out at the sides, 1: they have met. The spring overshoots past 1 and settles, which is the collision.
  const meet = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    meet.set(withDelay(MEET_DELAY_MS, withSpring(1, { damping: 11, stiffness: 120, mass: 0.9 })));
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
      }).toString()}` as Href,
    );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{group ? `Key matchup · ${GROUP_LABEL[group]}` : 'Top players'}</Text>
      <View style={[styles.row, { height: cardH }]}>
        <DuelCard team={away.team} theme={awayTheme} star={away.star} width={cardW} better={better(away, home)} style={awayStyle} onPress={() => open(away)} />
        <DuelCard team={home.team} theme={homeTheme} star={home.star} width={cardW} better={better(home, away)} style={homeStyle} onPress={() => open(home)} />
        {/* Where they meet: a flash in white, then the VS badge. */}
        <Animated.View pointerEvents="none" style={[styles.flash, { left: SIDE + cardW + GAP / 2 - 26, height: cardH }, flashStyle]} />
        <Animated.View pointerEvents="none" style={[styles.vs, { left: screen / 2 - 20, top: cardH / 2 - 20 }, vsStyle]}>
          <Text style={styles.vsText}>VS</Text>
        </Animated.View>
      </View>
      <Pressable onPress={compare} accessibilityRole="button" hitSlop={8} style={styles.compare}>
        <Text style={styles.compareText}>Compare their season ›</Text>
      </Pressable>
    </View>
  );
}

function KeyMatchupSkeleton() {
  const { width: screen } = useWindowDimensions();
  const cardW = Math.floor((screen - SIDE * 2 - GAP) / 2);
  const cardH = Math.round(cardW * CARD_RATIO);
  return (
    <SkeletonGroup style={styles.wrap}>
      <Skeleton width={110} height={12} style={{ marginLeft: SIDE, marginBottom: 6 }} />
      <View style={[styles.row, { height: cardH }]}>
        <Skeleton width={cardW} height={cardH} radius={22} />
        <Skeleton width={cardW} height={cardH} radius={22} />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  title: { ...textStyle.sectionLabel, paddingHorizontal: SIDE, marginBottom: 8 },
  row: { flexDirection: 'row', gap: GAP, paddingHorizontal: SIDE },
  flash: { position: 'absolute', top: 0, width: 52, backgroundColor: '#FFFFFF', borderRadius: radius.pill },
  vs: { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena, borderWidth: 1.5, borderColor: withAlpha(palette.chalk, 0.5) },
  vsText: { fontFamily: fonts.display, fontSize: 17, color: palette.chalk, letterSpacing: 0.5 },
  compare: { alignSelf: 'center', marginTop: 10 },
  compareText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
