import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Expandable, Pill, SectionLabel } from '@/components';
import { useInjuries } from '@/hooks';
import type { InjuredPlayer } from '@/lib/espn';
import { fonts, palette, withAlpha, type TeamTheme } from '@/lib/theme';

const isOut = (status: string) => /^out/i.test(status.trim());

/** "Back ~Nov 14": the day ESPN expects him, when it says one. */
const backLine = (returnDate?: string) => {
  if (!returnDate) return undefined;
  const d = new Date(returnDate);
  return Number.isNaN(d.getTime()) ? undefined : `Back ~${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

/**
 * Who of this team is on the league's injury report, from the same cached read as Injuries and moves: out ones first, then day-to-day, each with
 * what is wrong and the day he is expected back. Nothing at all while the report loads or when no one is hurt (a healthy team needs no card). When the
 * report turns up after the page is open the card opens by animating its height (`Expandable`), so what is under it moves down with it frame by frame.
 */
export function RosterAvailability({ teamId, theme, onOpen }: { teamId: string; theme: TeamTheme; onOpen: (playerId: string) => void }) {
  const { data } = useInjuries();
  const hurt = [...(data?.find((t) => t.teamId === teamId)?.injuries ?? [])].sort((a, b) => Number(isOut(b.status)) - Number(isOut(a.status)));

  return (
    <Expandable open={hurt.length > 0}>
      <View style={styles.wrap}>
      <View style={styles.head}>
        <SectionLabel>Availability</SectionLabel>
        <Text style={styles.count}>{hurt.filter((p) => isOut(p.status)).length} out · {hurt.filter((p) => !isOut(p.status)).length} day-to-day</Text>
      </View>
      <Card style={styles.card}>
        {hurt.map((p, i) => (
          <Row key={p.id} player={p} theme={theme} last={i === hurt.length - 1} onPress={() => onOpen(p.id)} />
        ))}
      </Card>
      </View>
    </Expandable>
  );
}

function Row({ player, theme, last, onPress }: { player: InjuredPlayer; theme: TeamTheme; last: boolean; onPress: () => void }) {
  const out = isOut(player.status);
  const back = backLine(player.returnDate);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${player.name}, ${out ? 'out' : 'day to day'}`} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { opacity: 0.7 }]}>
      <View style={[styles.face, { backgroundColor: withAlpha(theme.primary, 0.7) }]}>
        {player.headshot ? <Image source={player.headshot} style={styles.photo} contentFit="cover" /> : null}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {[player.detail, back].filter(Boolean).join(' · ') || 'No details yet'}
        </Text>
      </View>
      <Pill tone={out ? 'loss' : 'gold'}>{out ? 'OUT' : 'DTD'}</Pill>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The gap under the card is inside the Expandable, so a closed one leaves no hole between its neighbours.
  wrap: { paddingBottom: 18 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  count: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  card: { padding: 0, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.12) },
  face: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: 48, height: 38 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk },
  detail: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
});
