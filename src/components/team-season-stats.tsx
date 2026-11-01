import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTeamSeasonStats } from '@/hooks/queries';
import type { RankedStat } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export function TeamSeasonStats({ teamId, accent }: { teamId: string; accent: string }) {
  const { data } = useTeamSeasonStats(teamId);
  if (!data) return null;

  const tiles = [
    { key: 'PPG', v: data.ppg },
    { key: 'RPG', v: data.rpg },
    { key: 'APG', v: data.apg },
    { key: 'SPG', v: data.spg },
    { key: 'BPG', v: data.bpg },
    { key: 'TOV', v: data.tov },
  ].filter((t) => t.v != null);

  const rates: { label: string; s?: RankedStat }[] = [
    { label: 'Field goal %', s: data.fgPct },
    { label: '3-point %', s: data.threePct },
    { label: 'Free throw %', s: data.ftPct },
    { label: 'Effective FG %', s: data.efgPct },
  ];
  const shownRates = rates.filter((r) => r.s);
  if (tiles.length === 0 && shownRates.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(90).duration(300)} style={styles.wrap}>
      <Text style={styles.title}>Team season</Text>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <View key={t.key} style={styles.tile}>
            <Text style={[styles.tileValue, { color: accent }]}>{t.v!.toFixed(1)}</Text>
            <Text style={styles.tileLabel}>{t.key}</Text>
          </View>
        ))}
      </View>
      {shownRates.length > 0 && (
        <View style={styles.card}>
          {shownRates.map((r, i) => (
            <View key={r.label} style={[styles.rateRow, i < shownRates.length - 1 && styles.rateBorder]}>
              <Text style={styles.rateLabel}>{r.label}</Text>
              <Text style={styles.rateValue}>{r.s!.value.toFixed(1)}%</Text>
              {r.s!.rank != null && (
                <View
                  style={[
                    styles.rank,
                    r.s!.rank <= 10
                      ? { backgroundColor: withAlpha('#34D399', 0.16) }
                      : r.s!.rank > 20
                        ? { backgroundColor: withAlpha('#F87171', 0.16) }
                        : { backgroundColor: withAlpha(palette.chalk, 0.08) },
                  ]}>
                  <Text
                    style={[
                      styles.rankText,
                      { color: r.s!.rank <= 10 ? '#34D399' : r.s!.rank > 20 ? '#F87171' : palette.muted },
                    ]}>
                    {ordinal(r.s!.rank)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
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
  card: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), overflow: 'hidden' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  rateBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  rateLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.muted },
  rateValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  rank: { minWidth: 42, alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  rankText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
