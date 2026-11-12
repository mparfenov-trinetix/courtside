import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Team } from '@/lib/espn';
import { fonts, logoOn, mix, OUTLINED_LOGO, palette, withAlpha, type TeamTheme } from '@/lib/theme';
import { OutlinedLogo } from '../OutlinedLogo';
import { Skeleton, SkeletonGroup } from '../Skeleton';
import { MINI_CARD_RATIO, MINI_RADIUS } from '../MiniPlayerCard/constants';

/**
 * A small team card (Compare): the team card's look at a fraction of the size, the same height as a `MiniPlayerCard` so the two sit alike. The
 * team's color with a soft gradient, its logo, the stripe, location and name, then its record and place. A tap does what `onPress` says
 * (it opens the picker to change the team).
 */
export function MiniTeamCard({
  team,
  theme,
  width,
  record,
  standing,
  loading = false,
  entering,
  onPress,
}: {
  team: Team;
  theme: TeamTheme;
  width: number;
  record?: string;
  standing?: string;
  /** Its record and place are still coming: skeleton blocks in their place. */
  loading?: boolean;
  /** How the card arrives (`dealIn` when it has just been chosen). */
  entering?: ComponentProps<typeof Animated.View>['entering'];
  onPress: () => void;
}) {
  const height = Math.round(width * MINI_CARD_RATIO);
  const logoSize = width * 0.52;
  const StatsRow = loading ? SkeletonGroup : View;
  return (
    <Animated.View entering={entering} style={{ width, height }}>
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${team.displayName}${record ? `, record ${record}` : ''}${standing ? `, ${standing}` : ''}`}
      style={({ pressed }) => [styles.card, { width, height, backgroundColor: theme.primary }, pressed && { opacity: 0.9 }]}>
      <LinearGradient
        colors={[mix(theme.primary, '#FFFFFF', 0.08), theme.primary, mix(theme.primary, theme.secondary, 0.4)]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.logo, { top: width * 0.1, left: (width - logoSize) / 2 }]}>
        <OutlinedLogo source={logoOn(team, theme.onPrimary)} size={logoSize} outlined={OUTLINED_LOGO.has(team.abbreviation)} thickness={0.012} />
      </View>
      <View style={styles.footer}>
        <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
        <Text style={[styles.location, { color: withAlpha(theme.onPrimary, 0.75) }]} numberOfLines={1}>
          {team.location}
        </Text>
        <Text style={[styles.name, { color: theme.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
          {team.name.toUpperCase()}
        </Text>
        <StatsRow style={styles.stats}>
          <View style={styles.stat}>
            {loading ? <Skeleton width={44} height={17} radius={5} style={[styles.valueSkeleton, { backgroundColor: withAlpha(theme.onPrimary, 0.2) }]} /> : <Text style={[styles.value, { color: theme.onPrimary }]}>{record ?? '–'}</Text>}
            <Text style={[styles.key, { color: withAlpha(theme.onPrimary, 0.6) }]}>RECORD</Text>
          </View>
          <View style={[styles.stat, { borderLeftWidth: 1, borderLeftColor: withAlpha(theme.onPrimary, 0.35) }]}>
            {loading ? (
              <Skeleton width={52} height={17} radius={5} style={[styles.valueSkeleton, { backgroundColor: withAlpha(theme.onPrimary, 0.2) }]} />
            ) : (
              <Text style={[styles.value, { color: theme.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                {standing ?? '–'}
              </Text>
            )}
            <Text style={[styles.key, { color: withAlpha(theme.onPrimary, 0.6) }]}>PLACE</Text>
          </View>
        </StatsRow>
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { borderColor: withAlpha(theme.edge, 0.5) }]} />
    </Pressable>
    </Animated.View>
  );
}

/** The empty seat of a comparison: an outlined card that says what to do. */
export function MiniCardEmpty({ width, color, title, hint, onPress }: { width: number; color: string; title: string; hint: string; onPress: () => void }) {
  const height = Math.round(width * MINI_CARD_RATIO);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.empty, { width, height, borderColor: withAlpha(color, 0.6) }, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.plus, { color: withAlpha(color, 0.9) }]}>+</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: MINI_RADIUS, overflow: 'hidden', justifyContent: 'flex-end' },
  logo: { position: 'absolute' },
  footer: { paddingHorizontal: 12, paddingBottom: 10 },
  stripe: { width: 22, height: 3, borderRadius: 2, marginBottom: 4 },
  location: { fontFamily: fonts.bodySemi, fontSize: 12 },
  name: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, marginBottom: 6 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  value: { fontFamily: fonts.display, fontSize: 18, lineHeight: 20 },
  valueSkeleton: { marginVertical: 2 },
  key: { fontFamily: fonts.bodySemi, fontSize: 9, letterSpacing: 0.7 },
  edge: { borderRadius: MINI_RADIUS, borderWidth: 1.5 },
  empty: { borderRadius: MINI_RADIUS, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  plus: { fontFamily: fonts.display, fontSize: 54, lineHeight: 58 },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: palette.chalk },
  emptyHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
});
