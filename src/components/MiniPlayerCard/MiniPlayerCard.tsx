import { Image } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import type { ComponentProps } from 'react';

import type { Team, TeamStar } from '@/lib/espn';
import { fonts, withAlpha, type TeamTheme } from '@/lib/theme';
import { EdgeFade } from '../EdgeFade';
import { LogoWatermark } from '../LogoWatermark';
import { Pill } from '../Pill';
import { Skeleton, SkeletonGroup } from '../Skeleton';
import { MINI_CARD_RATIO, MINI_RADIUS, MINI_STATS, PHOTO_BOTTOM, PHOTO_H, PHOTO_W } from './constants';

export type MiniStar = Pick<TeamStar, 'athleteId' | 'name' | 'headshot' | 'ppg' | 'rpg' | 'apg' | 'position' | 'jersey'> & { /** "Day-to-day": he is on the injury report but may play. */ status?: string };

/**
 * A small player trading card (the key matchup, a finished game's duel, Compare), like the player page's (team color, its logo faint behind him, his photo melting
 * into the footer, his number big and faint, his name and PPG / RPG / APG). The number that beats the other player's is bold, in white;
 * the other is dimmed. Drawn with the team's `theme` (and its logo, when the team is known); a tap does what `onPress` says.
 */
export function MiniPlayerCard({
  team,
  theme,
  star,
  width,
  better,
  unit = 'season',
  loading = false,
  entering,
  style,
  onPress,
}: {
  team?: Team;
  theme: TeamTheme;
  star: MiniStar;
  width: number;
  /** Which of his three numbers is higher than the other player's. */
  better: Record<(typeof MINI_STATS)[number]['key'], boolean>;
  /** Whose numbers they are: his season averages, or a game's line (points, rebounds, assists). */
  unit?: 'season' | 'game';
  /** His numbers are still coming: skeleton blocks in place of them (breathing together), never dashes. */
  loading?: boolean;
  /** How the card arrives (`dealIn` when it has just been chosen). */
  entering?: ComponentProps<typeof Animated.View>['entering'];
  style?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  onPress: () => void;
}) {
  const height = Math.round(width * MINI_CARD_RATIO);
  const photoW = width * PHOTO_W;
  const logoSize = width * 0.7;
  const StatsRow = loading ? SkeletonGroup : View;
  return (
    <Animated.View entering={entering} style={[{ width, height }, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${star.name}${team ? `, ${team.abbreviation}` : ''}, ${star.ppg} points, ${star.rpg} rebounds, ${star.apg} assists${unit === 'game' ? ' in the game' : ' a game'}`}
        style={({ pressed }) => [styles.card, { width, height, backgroundColor: theme.primary }, pressed && { opacity: 0.9 }]}>
        {team ? <LogoWatermark team={team} onColor={theme.onPrimary} size={logoSize} style={{ position: 'absolute', left: (width - logoSize) / 2, top: width * 0.06 }} /> : null}


        {/* Upper left: his position, and a flag when he is day-to-day. */}
        <View style={styles.tags}>
          {star.position ? <Pill on={theme.onPrimary}>{star.position}</Pill> : null}
          {star.status ? <Pill tone="gold">DTD</Pill> : null}
        </View>

        {star.headshot ? (
          <View style={[styles.photo, { bottom: PHOTO_BOTTOM, width: photoW, height: photoW * PHOTO_H, left: (width - photoW) / 2 }]}>
            <Image source={star.headshot} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" cachePolicy="memory-disk" />
            <EdgeFade color={theme.primary} />
          </View>
        ) : null}

        {/* After the photo, not before: the photo's edge fade is painted in the card color and used to wipe out the part of the number under it. */}
        {star.jersey ? (
          <Text pointerEvents="none" style={[styles.number, { color: withAlpha(theme.onPrimary, 0.16), fontSize: width * (star.jersey.length < 2 ? 0.55 : 0.4), lineHeight: width * (star.jersey.length < 2 ? 0.55 : 0.4), right: width * 0.05 }]}>
            {star.jersey}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
          <Text style={[styles.name, { color: theme.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
            {star.name}
          </Text>
          <StatsRow style={styles.stats}>
            {MINI_STATS.map((s, i) => (
              <View key={s.key} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: withAlpha(theme.onPrimary, 0.35) }]}>
                {loading ? (
                  <Skeleton width={30} height={17} radius={5} style={[styles.valueSkeleton, { backgroundColor: withAlpha(theme.onPrimary, 0.2) }]} />
                ) : (
                  <Text style={[styles.value, { color: withAlpha(theme.onPrimary, better[s.key] ? 1 : 0.62) }, better[s.key] && styles.valueBest]}>{star[s.key] || '–'}</Text>
                )}
                <Text style={[styles.key, { color: withAlpha(theme.onPrimary, 0.6) }]}>{s[unit]}</Text>
              </View>
            ))}
          </StatsRow>
        </View>

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { borderColor: withAlpha(theme.edge, 0.5) }]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: MINI_RADIUS, overflow: 'hidden', justifyContent: 'flex-end' },
  number: { position: 'absolute', top: 6, fontFamily: fonts.display },
  photo: { position: 'absolute' },
  tags: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 4 },
  footer: { paddingHorizontal: 12, paddingBottom: 10 },
  stripe: { width: 22, height: 3, borderRadius: 2, marginBottom: 4 },
  name: { fontFamily: fonts.display, fontSize: 22, lineHeight: 25 },
  stats: { flexDirection: 'row', marginTop: 6 },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontFamily: fonts.display, fontSize: 19, lineHeight: 21 },
  // The height of a number's line, so the card does not jump when the numbers arrive.
  valueSkeleton: { marginVertical: 2 },
  valueBest: { textShadowColor: 'rgba(255,255,255,0.35)', textShadowRadius: 6 },
  key: { fontFamily: fonts.bodySemi, fontSize: 9, letterSpacing: 0.7 },
  edge: { borderRadius: MINI_RADIUS, borderWidth: 1.5 },
});
