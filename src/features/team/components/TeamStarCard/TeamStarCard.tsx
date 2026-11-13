import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ARRIVE, Card, Pill } from '@/components';
import { useTeamStar } from '@/hooks';
import { fontSize, fonts, radius, space, withAlpha, type TeamTheme } from '@/lib/theme';
import { openDetail } from '@/navigation';

/**
 * The team's best player by ESPN's own rating (this season's, or that of a past `season`), the same one the Team form widget shows: his photo, name and per-game points, rebounds and
 * assists, on the team's color. A tap opens his page. Nothing shows before anyone is rated (the first days of a season).
 */
export function TeamStarCard({ teamId, theme, season }: { teamId: string; theme: TeamTheme; /** A past season: that year's best player. */ season?: number }) {
  const { data: star } = useTeamStar(teamId, season);
  if (!star) return null;
  const text = theme.onPrimary;
  return (
    <Animated.View entering={ARRIVE} style={styles.wrap}>
      <Pressable
        onPress={() => openDetail({ pathname: '/player/[id]', params: { id: star.athleteId, teamId } })}
        accessibilityRole="button"
        accessibilityLabel={`Best player ${star.name}, ${star.ppg} points, ${star.rpg} rebounds, ${star.apg} assists`}
        style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card team={theme} radius={radius.xl} style={styles.card}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Pill on={text} style={{ alignSelf: 'flex-start' }}>BEST PLAYER</Pill>
            <Text style={[styles.name, { color: text }]} numberOfLines={2}>{star.name}</Text>
            <View style={styles.stats}>
              <Stat value={star.ppg} label="PPG" color={text} />
              <Stat value={star.rpg} label="RPG" color={text} />
              <Stat value={star.apg} label="APG" color={text} />
            </View>
          </View>
          <View style={[styles.photo, { backgroundColor: withAlpha(text, 0.14) }]}>
            {star.headshot ? <Image source={star.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View>
      <Text style={[styles.value, { color }]}>{value || '–'}</Text>
      <Text style={[styles.label, { color: withAlpha(color, 0.75) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginTop: space.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontFamily: fonts.displayBold, fontSize: fontSize.heading + 2, lineHeight: 28 },
  stats: { flexDirection: 'row', gap: space.xl, marginTop: space.sm },
  value: { fontFamily: fonts.display, fontSize: fontSize.display - 4 },
  label: { fontFamily: fonts.bodySemi, fontSize: fontSize.caption, letterSpacing: 0.5 },
  photo: { width: 104, height: 104, borderRadius: 52, overflow: 'hidden' },
  headshot: { width: 104, height: 104 },
});
