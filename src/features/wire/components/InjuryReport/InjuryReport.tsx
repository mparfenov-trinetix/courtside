import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, EmptyState, ErrorState, ListSkeleton, Pill } from '@/components';
import { useInjuries, useRefresh, useTeams } from '@/hooks';
import type { InjuredPlayer, Team } from '@/lib/espn';
import { fontSize, fonts, palette, space, surfaces, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { READABLE } from '@/lib/layout';

type Filter = 'all' | 'out' | 'dtd';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'out', label: 'Out' },
  { key: 'dtd', label: 'Day-to-day' },
];

const matches = (p: InjuredPlayer, f: Filter) => f === 'all' || (f === 'out' ? p.status === 'Out' : p.status !== 'Out');
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

type Item = { key: string; team: { id: string; name: string; count: number } } | { key: string; teamId: string; player: InjuredPlayer };

/** Every team's injury report, your team first, with a filter for who is out and who is day-to-day. A tap opens the player. */
export function InjuryReport({ favoriteTeamId }: { favoriteTeamId: string | null }) {
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = useInjuries();
  const { data: teams } = useTeams();
  const refreshControl = useRefresh([['injuries']]);
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo<Item[]>(() => {
    const groups = [...(data ?? [])].sort((a, b) => Number(b.teamId === favoriteTeamId) - Number(a.teamId === favoriteTeamId));
    return groups.flatMap((g) => {
      const players = g.injuries.filter((p) => matches(p, filter));
      if (players.length === 0) return [];
      return [{ key: `team-${g.teamId}`, team: { id: g.teamId, name: g.teamName, count: players.length } } as Item, ...players.map((player): Item => ({ key: `${g.teamId}-${player.id}`, teamId: g.teamId, player }))];
    });
  }, [data, filter, favoriteTeamId]);

  const all = (data ?? []).flatMap((g) => g.injuries);
  const total = all.length;
  const counts: Record<Filter, number> = { all: total, out: all.filter((p) => matches(p, 'out')).length, dtd: all.filter((p) => matches(p, 'dtd')).length };
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.key} size="md" active={filter === f.key} label={total ? `${f.label} · ${counts[f.key]}` : f.label} onPress={() => setFilter(f.key)} role="radio" />
        ))}
      </View>
      {isPending ? (
        <ListSkeleton count={7} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="Nobody listed" text={total === 0 ? 'No injuries are reported right now.' : 'No one matches this filter.'} placement="center" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={7}
          contentContainerStyle={[READABLE, { paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.sm }]}
          renderItem={({ item }) =>
            'player' in item ? (
              <PlayerRow player={item.player} teamId={item.teamId} />
            ) : (
              <TeamHeader team={teams?.find((t) => t.id === item.team.id)} name={item.team.name} mine={item.team.id === favoriteTeamId} count={item.team.count} />
            )
          }
        />
      )}
    </View>
  );
}

function TeamHeader({ team, name, mine, count }: { team?: Team; name: string; mine: boolean; count: number }) {
  return (
    <Pressable
      onPress={() => team && openDetail(`/team/${team.id}` as never)}
      disabled={!team}
      accessibilityRole="button"
      style={styles.team}>
      {team ? <Image source={team.logoDark || team.logo} style={styles.teamLogo} contentFit="contain" /> : <View style={styles.teamLogo} />}
      <Text style={styles.teamName} numberOfLines={1}>{name}</Text>
      {mine ? <Pill tone="gold">YOUR TEAM</Pill> : null}
      <Text style={styles.count}>{count}</Text>
    </Pressable>
  );
}

function PlayerRow({ player, teamId }: { player: InjuredPlayer; teamId: string }) {
  const out = player.status === 'Out';
  const tint = out ? palette.loss : palette.gold;
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId } })}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${player.status}${player.detail ? `, ${player.detail}` : ''}${player.returnDate ? `, expected back ${dayLabel(`${player.returnDate}T12:00:00`)}` : ''}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {/* A bar down the left edge in the status color, so a screenful scans as out (red) and day-to-day (gold) before any word is read. */}
      <Card padded={false} style={[styles.row, { borderLeftWidth: 3, borderLeftColor: withAlpha(tint, 0.7) }]}>
        <View style={styles.avatar}>
          {player.headshot ? <Image source={player.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.top}>
            <Text style={styles.name} numberOfLines={1}>
              {player.name}
              {player.position ? <Text style={styles.position}>{`  ${player.position}`}</Text> : null}
            </Text>
            <Pill tone={out ? 'loss' : 'gold'}>{out ? 'OUT' : 'DAY-TO-DAY'}</Pill>
          </View>
          <View style={styles.top}>
            <Text style={styles.detail} numberOfLines={1}>{player.detail ?? player.note ?? ''}</Text>
            {player.returnDate ? <Text style={styles.back}>Back {dayLabel(`${player.returnDate}T12:00:00`)}</Text> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  team: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md, paddingHorizontal: space.xs },
  teamLogo: { width: 26, height: 26 },
  teamName: { flex: 1, fontFamily: fonts.displayBold, fontSize: fontSize.title, color: palette.chalk },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingRight: space.md, paddingLeft: space.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: surfaces.raised },
  headshot: { width: 40, height: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { flex: 1, fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  position: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted },
  detail: { flex: 1, fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  back: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.chalk },
  count: { fontFamily: fonts.bodySemi, fontSize: fontSize.small, color: palette.muted },
});
