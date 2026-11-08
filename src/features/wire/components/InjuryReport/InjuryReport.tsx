import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, EmptyState, ErrorState, ListSkeleton, Pill } from '@/components';
import { useInjuries, useRefresh, useTeams } from '@/hooks';
import type { InjuredPlayer, Team } from '@/lib/espn';
import { fontSize, fonts, palette, space, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

type Filter = 'all' | 'out' | 'dtd';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'out', label: 'Out' },
  { key: 'dtd', label: 'Day-to-day' },
];

const matches = (p: InjuredPlayer, f: Filter) => f === 'all' || (f === 'out' ? p.status === 'Out' : p.status !== 'Out');
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

type Item = { key: string; team: { id: string; name: string } } | { key: string; teamId: string; player: InjuredPlayer };

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
      return [{ key: `team-${g.teamId}`, team: { id: g.teamId, name: g.teamName } } as Item, ...players.map((player): Item => ({ key: `${g.teamId}-${player.id}`, teamId: g.teamId, player }))];
    });
  }, [data, filter, favoriteTeamId]);

  const total = (data ?? []).reduce((n, g) => n + g.injuries.length, 0);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.key} size="md" active={filter === f.key} label={f.label} onPress={() => setFilter(f.key)} role="radio" />
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
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.sm }}
          renderItem={({ item }) =>
            'player' in item ? (
              <PlayerRow player={item.player} teamId={item.teamId} />
            ) : (
              <TeamHeader team={teams?.find((t) => t.id === item.team.id)} name={item.team.name} mine={item.team.id === favoriteTeamId} />
            )
          }
        />
      )}
    </View>
  );
}

function TeamHeader({ team, name, mine }: { team?: Team; name: string; mine: boolean }) {
  return (
    <Pressable
      onPress={() => team && openDetail(`/team/${team.id}` as never)}
      disabled={!team}
      accessibilityRole="button"
      style={styles.team}>
      {team ? <Image source={team.logoDark || team.logo} style={styles.teamLogo} contentFit="contain" /> : <View style={styles.teamLogo} />}
      <Text style={styles.teamName}>{name}</Text>
      {mine ? <Pill tone="gold">YOUR TEAM</Pill> : null}
    </Pressable>
  );
}

function PlayerRow({ player, teamId }: { player: InjuredPlayer; teamId: string }) {
  const out = player.status === 'Out';
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId } })}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${player.status}${player.detail ? `, ${player.detail}` : ''}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Card padded={false} style={styles.row}>
        <View style={styles.avatar}>
          {player.headshot ? <Image source={player.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.top}>
            <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
            <Pill tone={out ? 'loss' : 'gold'}>{out ? 'OUT' : 'DAY-TO-DAY'}</Pill>
          </View>
          {player.detail ? <Text style={styles.detail} numberOfLines={1}>{player.detail}{player.position ? ` · ${player.position}` : ''}</Text> : null}
          {player.note ? <Text style={styles.note} numberOfLines={2}>{player.note}</Text> : null}
          <Text style={styles.when}>{player.returnDate ? `Expected back ${dayLabel(`${player.returnDate}T12:00:00`)} · ` : ''}Updated {dayLabel(player.updated)}</Text>
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.md },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: surfaces.raised },
  headshot: { width: 44, height: 44 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { flex: 1, fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  detail: { fontFamily: fonts.bodySemi, fontSize: fontSize.small, color: palette.chalk },
  note: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  when: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted, marginTop: 2 },
});
