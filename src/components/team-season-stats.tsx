import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useLeagueTeamStats } from '@/hooks/queries';
import { formatMetric, metricByKey, ordinal, rankOf, type TeamMetric } from '@/lib/team-stats';
import { fonts, palette, withAlpha } from '@/lib/theme';

const TILES: TeamMetric['key'][] = ['ppg', 'rpg', 'apg', 'spg', 'bpg', 'tov'];
const RATES: TeamMetric['key'][] = ['fgPct', 'threePct', 'ftPct', 'efgPct'];

const openLeaders = (stat: TeamMetric['key']) => router.navigate({ pathname: '/team-leaders', params: { stat } });

const rankColor = (rank: number) => (rank <= 10 ? '#34D399' : rank > 20 ? '#F87171' : palette.muted);

export function TeamSeasonStats({ teamId, accent }: { teamId: string; accent: string }) {
  const { data: rows } = useLeagueTeamStats();
  const me = rows?.find((r) => r.teamId === teamId);
  if (!rows || !me || me.gp === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(90).duration(300)} style={styles.wrap}>
      <Text style={styles.title}>Team season · league rank · tap to see the league</Text>
      <View style={styles.grid}>
        {TILES.map((key) => {
          const m = metricByKey(key);
          const rank = rankOf(rows, teamId, m)!;
          return (
            <Pressable key={key} onPress={() => openLeaders(key)} accessibilityRole="button" style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.tileValue, { color: accent }]}>{me[key].toFixed(1)}</Text>
              <Text style={styles.tileLabel}>{m.short}</Text>
              <Text style={[styles.tileRank, { color: rankColor(rank) }]}>{ordinal(rank)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.card}>
        {RATES.map((key, i) => {
          const m = metricByKey(key);
          const rank = rankOf(rows, teamId, m)!;
          return (
            <Pressable
              key={key}
              onPress={() => openLeaders(key)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.rateRow, i < RATES.length - 1 && styles.rateBorder, pressed && { opacity: 0.7 }]}>
              <Text style={styles.rateLabel}>{m.label}</Text>
              <Text style={styles.rateValue}>{formatMetric(m, me[key])}</Text>
              <View style={[styles.rank, { backgroundColor: rank > 10 && rank <= 20 ? withAlpha(palette.chalk, 0.08) : withAlpha(rankColor(rank), 0.16) }]}>
                <Text style={[styles.rankText, { color: rankColor(rank) }]}>{ordinal(rank)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tile: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: withAlpha('#FFFFFF', 0.06),
  },
  tileValue: { fontFamily: fonts.display, fontSize: 26 },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.5 },
  tileRank: { fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 2 },
  card: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), overflow: 'hidden' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  rateBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  rateLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.muted },
  rateValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  rank: { minWidth: 42, alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  rankText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
