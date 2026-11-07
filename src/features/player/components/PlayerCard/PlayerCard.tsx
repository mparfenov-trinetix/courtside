import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, FadeIn, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { CardLights, Skeleton, SkeletonGroup } from '@/components';
import { useTilt } from '@/hooks';
import type { Honor, Player, PlayerSeasonStats, Team } from '@/lib/espn';
import { fonts, logoOn, OUTLINE, OUTLINED_LOGO, OUTLINE_STEPS, withAlpha, type TeamTheme } from '@/lib/theme';
import { EdgeFade } from './EdgeFade';
import { CARD_RATIO, CARD_STATS, CHAMPION_GOLD, FOOTER_PAD, MAX_ROTATE, PHOTO_BOTTOM, RADIUS, STATS_HEIGHT } from './constants';
import type { CardRanks } from './useLeagueRanks';

/** The honors worth a badge on the card, the biggest first. */
const BADGES: [RegExp, string][] = [
  [/^MVP$/i, 'MVP'],
  [/finals mvp/i, 'Finals MVP'],
  [/defensive player/i, 'DPOY'],
  [/rookie of the year/i, 'ROY'],
];

function badgesOf(honors: Honor[]): string[] {
  const out: string[] = [];
  for (const [re, label] of BADGES) {
    const honor = honors.find((h) => re.test(h.name));
    if (honor) out.push(honor.count > 1 ? `${label} ×${honor.count}` : label);
  }
  return out.slice(0, 2);
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
  const hasStats = stats != null || loading;
  // Until the averages arrive the numbers are skeleton blocks (breathing together), not dashes.
  const pending = loading && stats == null;
  const StatsRow = pending ? SkeletonGroup : View;
  const tags = [player.position, player.height?.replace(/\s/g, ''), player.age != null ? `${player.age} yrs` : undefined].filter(
    (t): t is string => !!t,
  );
  // Upper left, the biggest first: titles (gold), his biggest honors, or why he has no team.
  const badges: { text: string; gold?: boolean }[] = [
    ...(titles > 0 ? [{ text: titles > 1 ? `NBA Champion ×${titles}` : 'NBA Champion', gold: true }] : []),
    ...badgesOf(honors).map((text) => ({ text })),
    ...(status ? [{ text: status }] : []),
  ];
  const initials = player.name.split(' ').map((n) => n[0]).slice(0, 2).join('');
  const pill = { backgroundColor: withAlpha(theme.onPrimary, 0.14), borderColor: withAlpha(theme.onPrimary, 0.3) };

  return (
    <GestureDetector gesture={tilt.gesture}>
      <Animated.View style={[{ width, height }, wrapStyle]}>
        <Animated.View style={[styles.card, { width, height, backgroundColor: theme.primary }, tiltStyle]}>
          {/* Team logo watermark; a logo the color of the card (Houston's red) gets the team card's white outline, a little stronger. */}
          {logo && OUTLINED_LOGO.has(team?.abbreviation ?? '') ? (
            <View style={[styles.watermark, { width: width * 0.75, height: width * 0.75, opacity: 0.3 }]}>
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

          {/* Upper left: his titles, his biggest honors, or why he has no team. */}
          {badges.length > 0 ? (
            <View style={styles.badges}>
              {badges.map((b) => (
                // They come from the profile and the career, which arrive after the card: each fades in instead of popping.
                <Animated.View
                  key={b.text}
                  entering={FadeIn.duration(260)}
                  style={[styles.pill, b.gold ? { backgroundColor: withAlpha(CHAMPION_GOLD, 0.22), borderColor: withAlpha(CHAMPION_GOLD, 0.7) } : pill]}>
                  <Text style={[styles.pillText, { color: b.gold ? CHAMPION_GOLD : theme.onPrimary }]} numberOfLines={1}>
                    {b.text}
                  </Text>
                </Animated.View>
              ))}
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
  // Wraps before it reaches his number in the corner.
  badges: { position: 'absolute', top: 12, left: 12, right: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { width: '100%', paddingHorizontal: 16 },
  stripeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stripe: { width: 28, height: 4, borderRadius: 2 },
  statsLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
  name: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pill: { height: 24, paddingHorizontal: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
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
