import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSkeleton } from '@/components';
import { usePlayerGameLogs } from '@/hooks';
import { efficiencyOf } from '@/lib/league';
import { fonts, palette, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

import { useLeaderPool } from '../../utils';

/**
 * Efficiency per game (points, rebounds, assists, steals and blocks, less missed shots, missed free throws and turnovers), worked
 * out from each player's game log. ESPN's own PER is not usable here (it has no minutes qualifier), so this covers the league's top
 * scorers, rebounders and passers.
 */
export function Efficiency({ abbrOf }: { abbrOf: (teamId: string) => string | undefined }) {
  const insets = useSafeAreaInsets();
  const { pool, pending } = useLeaderPool();
  const logs = usePlayerGameLogs(pool.map((p) => p.athleteId));
  const loading = logs.filter((q) => q.isPending).length;
  if (pending || loading === pool.length) return <ListSkeleton count={8} />;

  const rows = pool
    .flatMap((who, i) => {
      const value = logs[i].data ? efficiencyOf(logs[i].data) : null;
      return value === null ? [] : [{ who, value }];
    })
    .sort((a, b) => b.value - a.value);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8 }}>
      <Text style={styles.note}>
        Efficiency per game: points + rebounds + assists + steals + blocks, less missed shots, missed free throws and turnovers. Among the
        league&apos;s top scorers, rebounders and passers.
      </Text>
      {rows.map(({ who, value }, i) => (
        <Pressable
          key={who.athleteId}
          onPress={() => openDetail({ pathname: '/player/[id]', params: { id: who.athleteId, teamId: who.teamId } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
          <View style={styles.headshotWrap}>
            {who.headshot ? <Image source={who.headshot} style={styles.headshot} contentFit="cover" transition={100} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {who.name}
            </Text>
            <Text style={styles.team}>{abbrOf(who.teamId) ?? who.teamAbbr}</Text>
          </View>
          <Text style={[styles.value, i === 0 && { color: palette.chalk }]}>{value.toFixed(1)}</Text>
        </Pressable>
      ))}
      {loading > 0 && <Text style={styles.footer}>Checking {loading} more…</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.muted, marginTop: 4, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: surfaces.card,
  },
  rank: { width: 22, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted, textAlign: 'center' },
  rankTop: { color: palette.chalk, fontFamily: fonts.bodyBold },
  headshotWrap: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  headshot: { width: 56, height: 48 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  team: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: 1 },
  value: { fontFamily: fonts.display, fontSize: 28, color: palette.muted },
  footer: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, textAlign: 'center', paddingVertical: 14 },
});
