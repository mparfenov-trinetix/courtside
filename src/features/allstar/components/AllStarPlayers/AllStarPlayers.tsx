import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components';
import type { AllStarGame, AllStarPlayer } from '@/lib/espn';
import { fontSize, fonts, palette, space, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { groupByTeam } from '../../utils/format';

/** Who played, grouped by side, with his points, rebounds and assists over the weekend. A tap opens his page. */
export function AllStarPlayers({ players, games }: { players: AllStarPlayer[]; games: AllStarGame[] }) {
  if (players.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {groupByTeam(players, games).map((group) => (
        <View key={group.team} style={{ gap: space.sm }}>
          <SectionLabel style={styles.label}>{group.team}</SectionLabel>
          <Card padded={false}>
            {group.players.map((p, i) => (
              <PlayerRow key={p.id} player={p} first={i === 0} />
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

function PlayerRow({ player, first }: { player: AllStarPlayer; first: boolean }) {
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId: '' } })}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${player.pts} points, ${player.reb} rebounds, ${player.ast} assists`}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: surfaces.raised }]}>
      <View style={styles.photo}>
        {player.headshot ? <Image source={player.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.meta}>{[player.starter == null ? '' : player.starter ? 'Starter' : 'Reserve', player.min ? `${player.min} min` : ''].filter(Boolean).join(' · ')}</Text>
      </View>
      <Stat value={player.pts} label="PTS" strong />
      <Stat value={player.reb} label="REB" />
      <Stat value={player.ast} label="AST" />
    </Pressable>
  );
}

function Stat({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, strong && { color: palette.chalk }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.lg },
  label: { paddingHorizontal: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  photo: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: surfaces.raised },
  headshot: { width: 44, height: 44 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  meta: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  stat: { width: 34, alignItems: 'center' },
  statValue: { fontFamily: fonts.display, fontSize: fontSize.title, color: palette.muted },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: fontSize.micro, color: palette.muted, letterSpacing: 0.4 },
});
