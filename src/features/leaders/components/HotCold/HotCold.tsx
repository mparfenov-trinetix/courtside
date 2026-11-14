import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSkeleton } from '@/components';
import { usePlayerGameLogs } from '@/hooks';
import type { LeaderEntry, Team } from '@/lib/espn';
import { rankByForm, type FormEntry } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

import { PlayerLine } from '../PlayerLine';
import { useLeaderPool } from '../../utils';

import { SHOWN } from './constants';
import { READABLE } from '@/lib/layout';

const HOT = palette.win;
const COLD = '#60A5FA';

/**
 * Who is playing above or below his own level: the last five games against the games before them in the season, from the
 * same game logs the player page uses.
 */
export function HotCold({ teams }: { teams?: Team[] }) {
  const insets = useSafeAreaInsets();
  const { pool, pending } = useLeaderPool();
  const logs = usePlayerGameLogs(pool.map((p) => p.athleteId));
  const loading = logs.filter((q) => q.isPending).length;

  if (pending || loading === pool.length) return <ListSkeleton count={8} />;

  const ranked = rankByForm(pool.map((who, i) => ({ who, log: logs[i].data })));
  const hot = ranked.filter((r) => r.form.delta > 0).slice(0, SHOWN);
  const cold = ranked
    .filter((r) => r.form.delta < 0)
    .slice(-SHOWN)
    .reverse();

  return (
    <ScrollView contentContainerStyle={[READABLE, { paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.note}>
        His last 5 games (3 while the season is young) against the rest of his season, by impact: points, rebounds, assists, steals and
        blocks, less turnovers. Among the league&apos;s top scorers, rebounders and passers.
      </Text>
      <Section title="Hot" color={HOT} rows={hot} teams={teams} />
      <Section title="Cold" color={COLD} rows={cold} teams={teams} />
      {loading > 0 && <Text style={styles.footer}>Checking {loading} more…</Text>}
    </ScrollView>
  );
}

function Section({
  title,
  color,
  rows,
  teams,
}: {
  title: string;
  color: string;
  rows: FormEntry<LeaderEntry>[];
  teams?: Team[];
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={styles.list}>
        {rows.map(({ who, form }) => (
          <Pressable
            key={who.athleteId}
            onPress={() => openDetail({ pathname: '/player/[id]', params: { id: who.athleteId, teamId: who.teamId } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={styles.headshotWrap}>
              {who.headshot ? <Image source={who.headshot} style={styles.headshot} contentFit="cover" transition={100} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {who.name}
              </Text>
              <PlayerLine team={teams?.find((t) => t.id === who.teamId)}>
                last {form.window} · {form.pts.toFixed(1)} pts · {form.reb.toFixed(1)} reb · {form.ast.toFixed(1)} ast
              </PlayerLine>
            </View>
            <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.16) }]}>
              <Text style={[styles.pillText, { color }]}>
                {form.delta > 0 ? '+' : '−'}
                {Math.abs(form.delta).toFixed(1)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.muted, marginTop: 4, marginBottom: 6 },
  section: { marginTop: 14 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 22, marginBottom: 8 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: surfaces.card,
  },
  headshotWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  headshot: { width: 52, height: 44 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  pill: { minWidth: 52, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pillText: { fontFamily: fonts.displayBold, fontSize: 18 },
  footer: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, textAlign: 'center', paddingVertical: 14 },
});
