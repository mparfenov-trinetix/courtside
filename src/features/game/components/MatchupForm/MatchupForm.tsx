import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FormChips } from '@/components';
import type { FormGame } from '@/lib/espn';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';

type Side = { id: string; abbr: string; logo: string; color: string };

/** Both teams' last five results, so you can see who arrives in form. */
export function MatchupForm({ away, home, form }: { away: Side; home: Side; form: Record<string, FormGame[]> }) {
  const sides = [away, home].filter((t) => (form[t.id]?.length ?? 0) > 0);
  if (sides.length === 0) return null;

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Recent form · last 5</Text>
      <View style={styles.card}>
        {sides.map((t, i) => {
          const games = form[t.id];
          const wins = games.filter((g) => g.result === 'W').length;
          return (
            <View key={t.id} style={[styles.team, i > 0 && styles.divider]}>
              <View style={styles.head}>
                <Image source={t.logo} style={styles.logo} contentFit="contain" />
                <Text style={[styles.abbr, { color: t.color }]}>{t.abbr}</Text>
                <Text style={styles.record}>
                  {wins}–{games.length - wins}
                </Text>
              </View>
              <FormChips games={games} />
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 4 },
  card: { borderRadius: 16, backgroundColor: surfaces.card, padding: 14, gap: 14 },
  team: { gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), paddingTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 26, height: 26 },
  abbr: { fontFamily: fonts.displayBold, fontSize: 22 },
  record: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
});
