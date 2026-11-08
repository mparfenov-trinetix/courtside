import { Image } from 'expo-image';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, FadeIn, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import {
  CardLights,
  ConferenceMvpTrophyIcon,
  CupIcon,
  DpoyTrophyIcon,
  FinalsMvpTrophyIcon,
  LarryOBrienIcon,
  MvpTrophyIcon,
  RoyTrophyIcon,
  Skeleton,
  SkeletonGroup,
} from '@/components';
import { useTilt } from '@/hooks';
import type { Honor, Player, PlayerSeasonStats, Team } from '@/lib/espn';
import { fonts, logoOn, OUTLINE, OUTLINED_LOGO, OUTLINE_STEPS, withAlpha, type TeamTheme } from '@/lib/theme';
import { EdgeFade } from './EdgeFade';
import {
  CARD_RATIO,
  CARD_STATS,
  CHAMPION_GOLD,
  FOOTER_PAD,
  MAX_ROTATE,
  OUTLINED_OPACITY,
  OUTLINED_WATERMARK,
  PHOTO_BOTTOM,
  RADIUS,
  STATS_HEIGHT,
} from './constants';
import type { CardRanks } from './useLeagueRanks';

type TrophyIcon = ComponentType<{ color: string; size?: number }>;

/** The awards that get a trophy on the card, the biggest first. ESPN lists the Eastern and Western conference finals MVPs apart; one trophy counts both. */
const AWARDS: { re: RegExp; Icon: TrophyIcon; label: string; short: (names: string[]) => string }[] = [
  { re: /^MVP$/i, Icon: MvpTrophyIcon, label: 'MVP', short: () => 'MVP' },
  // "Finals MVP" alone: "NBA Eastern Conference Finals MVP" contains the same words and is its own award.
  { re: /(^|nba )finals mvp$/i, Icon: FinalsMvpTrophyIcon, label: 'Finals MVP', short: () => 'Finals MVP' },
  {
    re: /conference finals mvp/i,
    Icon: ConferenceMvpTrophyIcon,
    label: 'Conference finals MVP',
    // ECF or WCF when it was one conference, both when he won it in each.
    short: (names) => {
      const east = names.some((n) => /eastern/i.test(n));
      const west = names.some((n) => /western/i.test(n));
      return east && west ? 'Conf. Finals MVP' : west ? 'WCF MVP' : 'ECF MVP';
    },
  },
  { re: /defensive player/i, Icon: DpoyTrophyIcon, label: 'Defensive Player of the Year', short: () => 'DPOY' },
  { re: /rookie of the year/i, Icon: RoyTrophyIcon, label: 'Rookie of the Year', short: () => 'ROY' },
];

/** `short` is the words on the pill: a drawn trophy alone does not say which award it is. */
type Trophy = { key: string; Icon: TrophyIcon; label: string; short: string; count: number };

function trophiesOf(honors: Honor[], titles: number, cups: number): Trophy[] {
  const out: Trophy[] = [];
  if (titles > 0) out.push({ key: 'champion', Icon: LarryOBrienIcon, label: 'NBA champion', short: 'Champion', count: titles });
  if (cups > 0) out.push({ key: 'cup', Icon: CupIcon, label: 'NBA Cup champion', short: 'NBA Cup', count: cups });
  for (const a of AWARDS) {
    const won = honors.filter((h) => a.re.test(h.name));
    const count = won.reduce((n, h) => n + Math.max(1, h.count), 0);
    if (count > 0) out.push({ key: a.label, Icon: a.Icon, label: a.label, short: a.short(won.map((h) => h.name)), count });
  }
  return out;
}

/**
 * A player as a trading card: his team's color, its logo as a watermark, his photo melting into the footer, his number as a big faint
 * mark, his name, small tags (position, height, age) and his season line: five averages (points, rebounds, assists, steals, blocks), each with his place in the league
 * when he is in that stat's top 50. The card tilts under a finger or the phone, with the team card's light along its edges and corners.
 * `scrollY` is the page's scroll: the card shrinks and fades as it goes.
 *
 * The tags are plain frosted pills drawn on the card, not Liquid Glass: glass would have to sit outside the 3D tilt, and over a tilting
 * card the tags on the side that tipped toward you dropped out, whichever way the glass layer was moved.
 */
export function PlayerCard({
  player,
  team,
  theme,
  width,
  scrollY,
  stats,
  ranks,
  statsLabel,
  loading = false,
  honors = [],
  titles = 0,
  cups = 0,
  status,
}: {
  player: Pick<Player, 'name' | 'jersey' | 'position' | 'height' | 'age' | 'headshot'>;
  team?: Team | null;
  theme: TeamTheme;
  width: number;
  scrollY: SharedValue<number>;
  stats?: PlayerSeasonStats | null;
  ranks?: CardRanks;
  /** Named beside the stripe when the numbers are not this season's ("Career", for someone with no current season). */
  statsLabel?: string;
  /** The season line is still coming: dashes instead of numbers. */
  loading?: boolean;
  honors?: Honor[];
  /** How many NBA championships he won (worked out from the teams he won with), for the gold badge. */
  titles?: number;
  /** How many NBA Cups he won (the teams he played for that won it). */
  cups?: number;
  /** Why he has no team ("Retired", "Free agent"). */
  status?: string;
}) {
  const height = Math.round(width * CARD_RATIO);
  const tilt = useTilt({ width, height }, { scrollSafe: true });
  // Destructure shared values so useAnimatedStyle closures don't capture the gesture.
  const tiltX = tilt.x;
  const tiltY = tilt.y;

  // The card shrinks and fades as it scrolls away so the stats take over the screen.
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, height * 0.8], [1, 0.25], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.get(), [0, height], [1, 0.82], Extrapolation.CLAMP) }],
  }));
  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${tiltX.get() * MAX_ROTATE}deg` }, { rotateX: `${-tiltY.get() * MAX_ROTATE}deg` }],
  }));
  const jerseyParallax = useAnimatedStyle(() => ({ transform: [{ translateX: tiltX.get() * 18 }, { translateY: tiltY.get() * 10 }] }));
  const headshotParallax = useAnimatedStyle(() => ({ transform: [{ translateX: tiltX.get() * 8 }, { translateY: tiltY.get() * 5 }] }));

  const logo = team ? logoOn(team, theme.onPrimary) : undefined;
  const outlined = OUTLINED_LOGO.has(team?.abbreviation ?? '') || OUTLINED_WATERMARK.has(team?.abbreviation ?? '');
  const hasStats = stats != null || loading;
  // Until the averages arrive the numbers are skeleton blocks (breathing together), not dashes.
  const pending = loading && stats == null;
  const StatsRow = pending ? SkeletonGroup : View;
  const tags = [player.position, player.height?.replace(/\s/g, ''), player.age != null ? `${player.age} yrs` : undefined].filter(
    (t): t is string => !!t,
  );
  // Upper left: his trophies (titles, Cups, MVPs...) as little trophies, the biggest first, then why he has no team.
  const trophies = trophiesOf(honors, titles, cups);
  const initials = player.name.split(' ').map((n) => n[0]).slice(0, 2).join('');
  const pill = { backgroundColor: withAlpha(theme.onPrimary, 0.14), borderColor: withAlpha(theme.onPrimary, 0.3) };
  return (
    <GestureDetector gesture={tilt.gesture}>
      <Animated.View style={[{ width, height }, wrapStyle]}>
        <Animated.View style={[styles.card, { width, height, backgroundColor: theme.primary }, tiltStyle]}>
          {/* Team logo watermark; a logo the color of the card (Houston's red, and the mostly red Hawks and Bulls) gets the team card's white outline, stronger. */}
          {logo && outlined ? (
            <View style={[styles.watermark, { width: width * 0.75, height: width * 0.75, opacity: OUTLINED_OPACITY }]}>
              {OUTLINE_STEPS.map(([dx, dy]) => (
                <Image
                  key={`${dx}${dy}`}
                  source={logo}
                  tintColor="#FFFFFF"
                  contentFit="contain"
                  style={{ position: 'absolute', width: '100%', height: '100%', left: dx * width * 0.75 * OUTLINE, top: dy * width * 0.75 * OUTLINE }}
                />
              ))}
              <Image source={logo} style={StyleSheet.absoluteFill} contentFit="contain" allowDownscaling={false} priority="high" cachePolicy="memory-disk" />
            </View>
          ) : logo ? (
            <Image
              source={logo}
              style={[styles.watermark, { width: width * 0.75, height: width * 0.75 }]}
              contentFit="contain"
              allowDownscaling={false}
              priority="high"
              cachePolicy="memory-disk"
            />
          ) : null}

          <Animated.View style={[styles.photo, { bottom: PHOTO_BOTTOM }, headshotParallax]}>
            {player.headshot ? (
              <View style={{ width: width * 0.72, height: width * 0.78 }}>
                <Image source={player.headshot} style={StyleSheet.absoluteFill} contentFit="cover" allowDownscaling={false} priority="high" cachePolicy="memory-disk" />
                {/* ESPN's photo is a rectangle with the shoulders cut off square: melt the sides and the bottom into the card color. */}
                <EdgeFade color={theme.primary} />
              </View>
            ) : (
              <View style={[styles.initials, { width: width * 0.52, height: width * 0.52, borderRadius: width * 0.26, backgroundColor: withAlpha(theme.onPrimary, 0.12) }]}>
                <Text style={[styles.initialsText, { color: theme.onPrimary, fontSize: width * 0.2 }]}>{initials}</Text>
              </View>
            )}
          </Animated.View>

          {/* His number, in the upper right corner, drawn over the photo's frame so the fade never cuts it. */}
          {player.jersey ? (
            <Animated.Text
              pointerEvents="none"
              accessibilityElementsHidden
              style={[
                styles.jersey,
                {
                  color: withAlpha(theme.onPrimary, 0.16),
                  fontSize: width * (player.jersey.length < 2 ? 0.5 : 0.36),
                  lineHeight: width * (player.jersey.length < 2 ? 0.5 : 0.36),
                  top: width * 0.03,
                  right: width * 0.05,
                },
                jerseyParallax,
              ]}>
              {player.jersey}
            </Animated.Text>
          ) : null}

          {/* Upper left: his trophies (a gold trophy on a dark pill reads on every team color, yellow ones included), or why he has no team. */}
          {trophies.length > 0 || status ? (
            <View style={styles.badges}>
              {trophies.map((t) => (
                <Animated.View
                  key={t.key}
                  entering={FadeIn.duration(260)}
                  accessible
                  accessibilityLabel={t.count > 1 ? `${t.label}, ${t.count} times` : t.label}
                  style={[styles.pill, styles.trophyPill]}>
                  <t.Icon color={CHAMPION_GOLD} size={17} />
                  <Text style={[styles.pillText, { color: CHAMPION_GOLD }]} numberOfLines={1}>
                    {t.short}
                    {t.count > 1 ? ` ×${t.count}` : ''}
                  </Text>
                </Animated.View>
              ))}
              {status ? (
                <Animated.View entering={FadeIn.duration(260)} style={[styles.pill, pill]}>
                  <Text style={[styles.pillText, { color: theme.onPrimary }]} numberOfLines={1}>
                    {status}
                  </Text>
                </Animated.View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.footer, { paddingBottom: FOOTER_PAD }]}>
            <View style={styles.stripeRow}>
              <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
              {statsLabel ? <Text style={[styles.statsLabel, { color: withAlpha(theme.onPrimary, 0.6) }]}>{statsLabel.toUpperCase()}</Text> : null}
            </View>
            <Text style={[styles.name, { color: theme.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {player.name}
            </Text>
            {tags.length > 0 ? (
              <View style={styles.tags}>
                {tags.map((t) => (
                  <View key={t} style={[styles.pill, pill]}>
                    <Text style={[styles.pillText, { color: theme.onPrimary }]} numberOfLines={1}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {hasStats ? (
              <StatsRow style={styles.stats}>
                {CARD_STATS.map((s, i) => {
                  const value = stats?.[s.key];
                  const rank = ranks?.[s.key];
                  return (
                    <View key={s.key} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: withAlpha(theme.onPrimary, 0.25) }]}>
                      {pending ? (
                        <Skeleton width={30} height={18} radius={5} style={[styles.statSkeleton, { backgroundColor: withAlpha(theme.onPrimary, 0.2) }]} />
                      ) : (
                        <Text style={[styles.statValue, { color: theme.onPrimary }]}>{value != null ? value.toFixed(1) : '–'}</Text>
                      )}
                      <Text style={[styles.statKey, { color: withAlpha(theme.onPrimary, 0.6) }]}>{s.label}</Text>
                      {/* Always a line, so a stat without a rank doesn't sit higher than its neighbours. */}
                      <Text style={[styles.statRank, { color: theme.onPrimary }]}>{rank != null ? `#${rank}` : ' '}</Text>
                    </View>
                  );
                })}
              </StatsRow>
            ) : null}
          </View>

          {/* The card's edge, in a color that reads on it and on the page: a black team's card is otherwise lost against it. */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { borderColor: withAlpha(theme.edge, 0.5) }]} />
          <CardLights x={tiltX} y={tiltY} glint={width * 0.6} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  // Centred behind the head, a touch lower than the top so a two-digit number above it stays clear.
  watermark: { position: 'absolute', top: '14%', left: '12%', opacity: 0.12 },
  photo: { position: 'absolute', alignItems: 'center' },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: fonts.display },
  jersey: { position: 'absolute', fontFamily: fonts.display },
  // Wraps before it reaches his number in the corner (a little more room now that the pills carry words).
  badges: { position: 'absolute', top: 12, left: 12, right: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { width: '100%', paddingHorizontal: 16 },
  stripeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stripe: { width: 28, height: 4, borderRadius: 2 },
  statsLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
  name: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pill: { height: 24, paddingHorizontal: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  trophyPill: { paddingLeft: 7, paddingRight: 9, backgroundColor: 'rgba(10,10,10,0.6)', borderColor: 'rgba(251,191,36,0.55)' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  stats: { flexDirection: 'row', alignItems: 'center', height: STATS_HEIGHT, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  // The same height as a number's line, so the cell does not jump when the numbers arrive.
  statSkeleton: { marginVertical: 4 },
  statKey: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.8 },
  statRank: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12 },
  edge: { borderRadius: RADIUS, borderWidth: 1.5 },
});
