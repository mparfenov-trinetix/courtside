import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ErrorState, ListSkeleton } from '@/components';
import { useRefresh, useTeams, useTransactions } from '@/hooks';
import type { Transaction } from '@/lib/espn';
import { fontSize, fonts, palette, space, textStyle } from '@/lib/theme';
import { openDetail } from '@/navigation';

const PAGE = 40;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

type Item = { key: string; day: string } | { key: string; move: Transaction };

/** The season's signings, waivers and trades, newest first, by day. A tap on a move opens the team. */
export function TransactionList() {
  const insets = useSafeAreaInsets();
  const [limit, setLimit] = useState(PAGE);
  const { data, isPending, error, refetch, isFetching } = useTransactions(limit);
  const { data: teams } = useTeams();
  const refreshControl = useRefresh([['transactions']]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let day = '';
    for (const move of data?.items ?? []) {
      const d = dayLabel(move.date);
      if (d !== day) {
        day = d;
        out.push({ key: `day-${move.date}-${out.length}`, day });
      }
      out.push({ key: move.id, move });
    }
    return out;
  }, [data]);

  if (isPending) return <ListSkeleton count={7} avatar="round" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (items.length === 0) return <EmptyState title="No moves yet" text="Signings, waivers and trades appear here as teams make them." placement="center" />;
  const more = (data?.items.length ?? 0) < (data?.total ?? 0);
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.key}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      windowSize={7}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.sm }}
      ListFooterComponent={
        more ? <Button tone="secondary" label={isFetching ? 'Loading…' : 'Show earlier moves'} onPress={() => setLimit((n) => n + PAGE)} style={{ marginTop: space.md }} /> : undefined
      }
      renderItem={({ item }) => {
        if ('day' in item) return <Text style={styles.day}>{item.day}</Text>;
        const team = teams?.find((t) => t.id === item.move.teamId);
        return (
          <Pressable
            onPress={() => team && openDetail(`/team/${team.id}` as never)}
            disabled={!team}
            accessibilityRole="button"
            accessibilityLabel={`${item.move.teamName}: ${item.move.text}`}>
            <Card padded={false} style={styles.row}>
              {team ? <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.team}>{team?.abbreviation ?? item.move.teamName}</Text>
                <Text style={styles.text}>{item.move.text}</Text>
              </View>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  day: { ...textStyle.sectionLabel, paddingTop: space.md, paddingHorizontal: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  logo: { width: 34, height: 34 },
  team: { fontFamily: fonts.bodyBold, fontSize: fontSize.label, color: palette.muted, letterSpacing: 0.4 },
  text: { fontFamily: fonts.body, fontSize: fontSize.body, color: palette.chalk, lineHeight: 20 },
});
