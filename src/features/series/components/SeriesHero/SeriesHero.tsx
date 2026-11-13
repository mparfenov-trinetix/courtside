import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { ROUND_NAMES, type Series } from '@/lib/league';
import { fonts, fontSize, palette, space, textStyle } from '@/lib/theme';

/** The matchup at the top of a series screen (it scrolls away; the top bar then carries the logos and the score): the round, both teams with their seeds, the series score, and where it stands. */
export function SeriesHero({ series, top, bottom }: { series: Series; top: { score?: number }; bottom: { score?: number } }) {
  const round = `${ROUND_NAMES[series.round]}${series.conference ? ` · ${series.conference === 'east' ? 'East' : 'West'}` : ''}`;
  return (
    <View style={styles.wrap}>
      <Text style={styles.round}>{round}</Text>
      <View style={styles.versus}>
        <Team team={series.top} />
        <Text style={styles.big}>
          {top.score ?? 0}
          <Text style={{ color: palette.muted }}> – </Text>
          {bottom.score ?? 0}
        </Text>
        <Team team={series.bottom} right />
      </View>
      <Text style={[styles.status, series.winnerId ? { color: palette.gold } : null]}>{series.status}</Text>
    </View>
  );
}

function Team({ team, right }: { team: Series['top']; right?: boolean }) {
  return (
    <View style={[styles.team, right && { alignItems: 'flex-end' }]}>
      {team.logo ? <Image source={team.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={styles.abbr}>{team.abbr}</Text>
      {team.seed ? <Text style={styles.seed}>#{team.seed} seed</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg, gap: space.sm },
  round: { ...textStyle.sectionLabel },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { alignItems: 'flex-start', gap: 2, width: 96 },
  logo: { width: 64, height: 64 },
  abbr: { fontFamily: fonts.display, fontSize: fontSize.heading, color: palette.chalk },
  seed: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted },
  big: { fontFamily: fonts.display, fontSize: 56, color: palette.chalk },
  status: { fontFamily: fonts.display, fontSize: fontSize.display - 4, color: palette.chalk, textAlign: 'center' },
});
