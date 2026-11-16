import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ARRIVE, Card, LarryOBrienIcon, Pill } from '@/components';
import type { SeasonResult } from '@/lib/league';
import { fonts, fontSize, palette, radius, space, surfaces, withAlpha, type TeamTheme } from '@/lib/theme';

/** The four rounds of the playoffs, in the order a team goes through them. */
const ROUNDS = ['R1', 'R2', 'CF', 'FINALS'];

/**
 * How the season ended, the way a bracket says it: "Missed the playoffs", "Lost in the play-in", "Lost in the second round", the conference
 * finals, the Finals or "NBA champions" (gold, with the trophy). Under it the last series, and a path of the four rounds with the ones the team
 * played lit and where it stopped marked: red for the series it lost, gold for the title. `place` is where it finished in its conference,
 * said instead of a series for a team that never played one.
 */
export function SeasonResultCard({
  result,
  theme,
  place,
  onOpenSeries,
  onOpenPlayIn,
}: {
  result: SeasonResult;
  theme: TeamTheme;
  place?: string;
  /** Opens the series the season ended in; given only when the team played one. */
  onOpenSeries?: () => void;
  /** Opens the play-in bracket; given only when the team played in it. */
  onOpenPlayIn?: () => void;
}) {
  const champion = result.stage === 'champions';
  const made = result.rounds > 0;
  const tone = champion ? palette.gold : made ? theme.accent : palette.muted;
  return (
    <Animated.View entering={ARRIVE} style={styles.wrap}>
      <Card style={[styles.card, champion && { borderColor: withAlpha(palette.gold, 0.6) }]}>
        <View style={styles.top}>
          <Pill tone={champion ? 'gold' : 'muted'}>SEASON RESULT</Pill>
          {/* The ways on sit in the card's top corner, so they cost no row of their own. */}
          <View style={styles.links}>
            {onOpenPlayIn ? <Link label="Play-in" color={theme.accent} onPress={onOpenPlayIn} /> : null}
            {onOpenSeries ? <Link label={champion ? 'Finals series' : 'Last series'} color={theme.accent} onPress={onOpenSeries} /> : null}
            {champion ? <LarryOBrienIcon size={30} color={palette.gold} /> : null}
          </View>
        </View>
        <Text style={[styles.label, { color: champion ? palette.gold : palette.chalk }]}>{result.label}</Text>
        {result.detail || place ? <Text style={styles.detail}>{made ? result.detail : place}</Text> : null}
        <View style={styles.path}>
          {ROUNDS.map((round, i) => {
            const played = i < result.rounds;
            // The round the season ended in: red for a series lost, gold for the title.
            const last = played && i === result.rounds - 1;
            const color = last ? (champion ? palette.gold : palette.loss) : played ? tone : surfaces.raised;
            return (
              <View key={round} style={styles.step}>
                <View style={[styles.bar, { backgroundColor: color }]} />
                <Text style={[styles.round, played && { color: palette.chalk }]}>{round}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Animated.View>
  );
}

function Link({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <Text style={[styles.link, { color }]}>{label} ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginTop: space.lg },
  card: { gap: space.sm, borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.xl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.display, fontSize: fontSize.display - 2, lineHeight: 36 },
  detail: { fontFamily: fonts.bodySemi, fontSize: fontSize.body, color: palette.muted },
  path: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  links: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  link: { fontFamily: fonts.bodySemi, fontSize: fontSize.body },
  step: { flex: 1, gap: space.xs },
  bar: { height: 6, borderRadius: 3 },
  round: { fontFamily: fonts.bodySemi, fontSize: fontSize.caption, letterSpacing: 0.6, color: palette.muted },
});
