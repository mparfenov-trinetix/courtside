import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useLeagueTeamStats } from '@/hooks';
import { formatMetric, metricByKey, ordinal, rankOf } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { TILES, RATES } from './constants';

const rankColor = (rank: number) => (rank <= 10 ? palette.win : rank > 20 ? palette.loss : palette.muted);

export function TeamSeasonStats({ teamId, accent }: { teamId: string; accent: string }) {
  const { data: rows } = useLeagueTeamStats();
  const me = rows?.find((r) => r.teamId === teamId);
  if (!rows || !me || me.gp === 0) return null;

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Team season · league rank</Text>
      <View style={styles.grid}>
        {TILES.map((key) => {
          const m = metricByKey(key);
          const rank = rankOf(rows, teamId, m)!;
          return (
            <View key={key} style={styles.tile}>
              <Text style={[styles.tileValue, { color: accent }]}>{me[key].toFixed(1)}</Text>
              <Text style={styles.tileLabel}>{m.short}</Text>
              <Text style={[styles.tileRank, { color: rankColor(rank) }]}>{ordinal(rank)}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.card}>
        {RATES.map((key, i) => {
          const m = metricByKey(key);
          const rank = rankOf(rows, teamId, m)!;
          return (
            <View key={key} style={[styles.rateRow, i < RATES.length - 1 && styles.rateBorder]}>
              <Text style={styles.rateLabel}>{m.label}</Text>
              <Text style={styles.rateValue}>{formatMetric(m, me[key])}</Text>
              <View style={[styles.rank, { backgroundColor: rank > 10 && rank <= 20 ? withAlpha(palette.chalk, 0.08) : withAlpha(rankColor(rank), 0.16) }]}>
                <Text style={[styles.rankText, { color: rankColor(rank) }]}>{ordinal(rank)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, paddingHorizontal: 16 },
  title: { ...textStyle.sectionLabel, marginBottom: 8, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tile: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: surfaces.card,
  },
  tileValue: { fontFamily: fonts.display, fontSize: 26 },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5 },
  tileRank: { fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 2 },
  card: { borderRadius: 16, backgroundColor: surfaces.card, overflow: 'hidden' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  rateBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  rateLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.muted },
  rateValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  rank: { minWidth: 42, alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  rankText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
