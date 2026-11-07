import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, CompareIcon, GlassButton, StarIcon } from '@/components';
import type { PlayerSeasonStats } from '@/lib/espn';
import { fonts, palette, withAlpha, type TeamTheme } from '@/lib/theme';

/**
 * The player page's bar: back, star and compare as glass buttons, and between them a compact "who is this" (his photo, name and
 * season line) that fades in as the card scrolls away, so the page never loses its subject once the card is gone. `progress` runs
 * from 0 (card on screen) to 1 (card gone).
 */
export function PlayerTopBar({
  theme,
  name,
  headshot,
  stats,
  statsLabel,
  progress,
  watched,
  onBack,
  onWatch,
  onCompare,
}: {
  theme: TeamTheme;
  name: string;
  headshot?: string;
  stats?: PlayerSeasonStats | null;
  /** "Career" when the numbers are not this season's. */
  statsLabel?: string;
  progress: SharedValue<number>;
  watched: boolean;
  onBack: () => void;
  onWatch: () => void;
  onCompare: () => void;
}) {
  const insets = useSafeAreaInsets();
  const compact = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [8, 0], Extrapolation.CLAMP) }],
  }));
  const tint = withAlpha(theme.primary, 0.5);
  const fill = withAlpha(theme.primary, 0.18);
  const line = [stats?.ppg != null ? `${stats.ppg.toFixed(1)} PPG` : null, stats?.rpg != null ? `${stats.rpg.toFixed(1)} RPG` : null, stats?.apg != null ? `${stats.apg.toFixed(1)} APG` : null]
    .filter(Boolean)
    .join(' · ');
  const subtitle = line && statsLabel ? `${statsLabel} · ${line}` : line;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <GlassButton onPress={onBack} label="Go back" hitSlop={14} tint={tint} fallbackColor={fill}>
        <ArrowLeftIcon color={theme.accent} size={20} />
      </GlassButton>

      <Animated.View pointerEvents="none" style={[styles.compact, compact]}>
        <View style={[styles.face, { backgroundColor: withAlpha(theme.primary, 0.5) }]}>
          {headshot ? <Image source={headshot} style={styles.faceImage} contentFit="cover" contentPosition="top" /> : null}
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text style={styles.line} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <GlassButton
        onPress={onWatch}
        label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        selected={watched}
        hitSlop={10}
        tint={tint}
        fallbackColor={fill}>
        <StarIcon color={theme.accent} size={20} filled={watched} />
      </GlassButton>
      <GlassButton onPress={onCompare} label="Compare this player" hitSlop={10} tint={tint} fallbackColor={fill}>
        <CompareIcon color={theme.accent} size={20} />
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  compact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  face: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  faceImage: { width: 32, height: 32 },
  text: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  line: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
});
