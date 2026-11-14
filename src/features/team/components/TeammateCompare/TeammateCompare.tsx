import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, PageSheet, SectionLabel } from '@/components';
import type { Player, PlayerSeasonStats } from '@/lib/espn';
import { barShare, compareTeammates, formatCategory, lastNameOf, type CompareRow, type RosterCategoryKey } from '@/lib/league';
import { fonts, palette, radius, withAlpha, type TeamTheme } from '@/lib/theme';

/** The rows of the comparison, in three short blocks instead of one list of thirteen. */
const GROUPS: { title: string; keys: RosterCategoryKey[] }[] = [
  { title: 'Production', keys: ['ppg', 'rpg', 'apg', 'spg', 'bpg', 'mpg'] },
  { title: 'Shooting', keys: ['fgPct', 'threePct', 'ftPct'] },
  { title: 'Profile', keys: ['age', 'experience', 'height', 'weight'] },
];

const hasSeason = (stats?: PlayerSeasonStats) => stats?.ppg != null || (stats?.gamesPlayed ?? 0) > 0;

/**
 * Two teammates side by side. The two players are big, at the top: a tap on one opens a list of the roster to change him. Under them who leads
 * more rows, then the rows in three blocks (production, shooting, profile), each with both numbers, the leader lit and the bars growing from the
 * middle. A player with no games this season (an injured one) says so once instead of showing a column of dashes, and the other player's numbers
 * stay lit.
 */
export function TeammateCompare({
  players,
  statsOf,
  theme,
}: {
  players: Player[];
  statsOf: (id: string) => PlayerSeasonStats | undefined;
  theme: TeamTheme;
}) {
  const [aId, setA] = useState(players[0]?.id);
  const [bId, setB] = useState(players[1]?.id);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const a = players.find((p) => p.id === aId) ?? players[0];
  const b = players.find((p) => p.id === bId) ?? players[1];
  if (!a || !b) return null;
  const aStats = statsOf(a.id);
  const bStats = statsOf(b.id);
  const rows = compareTeammates({ player: a, stats: aStats }, { player: b, stats: bStats });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const bothPlayed = hasSeason(aStats) && hasSeason(bStats);
  const aLeads = rows.filter((r) => r.leader === 'a').length;
  const bLeads = rows.filter((r) => r.leader === 'b').length;
  const decided = aLeads + bLeads;
  const idle = [!hasSeason(aStats) && a, !hasSeason(bStats) && b].filter((p): p is Player => !!p);
  // Only once both players' numbers are in: until then every row would look like a lead for the other side.
  const loaded = !!aStats && !!bStats;

  return (
    <View>
      <SectionLabel style={styles.label}>Compare teammates</SectionLabel>
      <Card style={styles.card}>
        <View style={styles.heads}>
          <Head player={a} theme={theme} tone={theme.accent} onPress={() => setPicking('a')} />
          <Text style={styles.vs}>VS</Text>
          <Head player={b} theme={theme} tone={palette.chalk} onPress={() => setPicking('b')} right />
        </View>

        {loaded && bothPlayed && decided > 0 ? (
          <Text style={styles.tally}>
            {aLeads === bLeads ? 'Level' : `${lastNameOf((aLeads > bLeads ? a : b).name)} leads`}
            <Text style={styles.tallyOf}>
              {'  '}
              {aLeads} – {bLeads}
            </Text>
          </Text>
        ) : null}
        {loaded && idle.length > 0 ? (
          <Text style={styles.note}>{idle.map((p) => lastNameOf(p.name)).join(' and ')} {idle.length === 1 ? 'has' : 'have'} no games this season yet, so only the profile compares.</Text>
        ) : null}

        {GROUPS.map((g) => {
          const shown = g.keys.map((k) => byKey.get(k)).filter((r): r is CompareRow => !!r && (r.a != null || r.b != null));
          // A season block with no numbers on either side has nothing to say.
          if (shown.length === 0) return null;
          return (
            <View key={g.title} style={styles.block}>
              <Text style={styles.blockTitle}>{g.title}</Text>
              {shown.map((r) => (
                <Row key={r.key} row={r} theme={theme} />
              ))}
            </View>
          );
        })}
      </Card>

      <PageSheet visible={picking != null} onClose={() => setPicking(null)}>
        <PlayerList
          players={players}
          selected={picking === 'a' ? a.id : b.id}
          other={picking === 'a' ? b.id : a.id}
          theme={theme}
          onPick={(id) => {
            if (picking === 'a') setA(id);
            else setB(id);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      </PageSheet>
    </View>
  );
}

/** Rows that can have a leader (the production and shooting ones). */
const COMPARED = new Set<RosterCategoryKey>(['ppg', 'rpg', 'apg', 'spg', 'bpg', 'mpg', 'fgPct', 'threePct', 'ftPct']);

function Head({ player, theme, tone, onPress, right }: { player: Player; theme: TeamTheme; tone: string; onPress: () => void; right?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${player.name}. Change player`} style={({ pressed }) => [styles.head, right && { alignItems: 'flex-end' }, pressed && { opacity: 0.75 }]}>
      <View style={[styles.face, { backgroundColor: withAlpha(theme.primary, 0.7), borderColor: tone }]}>
        {player.headshot ? <Image source={player.headshot} style={styles.photo} contentFit="cover" /> : <Text style={styles.initial}>{player.name.charAt(0)}</Text>}
      </View>
      <Text style={[styles.name, right && { textAlign: 'right' }]} numberOfLines={1} adjustsFontSizeToFit>
        {lastNameOf(player.name)}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {[player.jersey ? `#${player.jersey}` : null, player.position].filter(Boolean).join(' · ') || ' '}
        <Text style={{ color: tone }}>  ⌄</Text>
      </Text>
    </Pressable>
  );
}

function Row({ row, theme }: { row: CompareRow; theme: TeamTheme }) {
  const max = Math.max(row.a ?? 0, row.b ?? 0);
  const compared = COMPARED.has(row.key);
  // On a row that has a leader the other side dims. Where only one side has a number, that number is lit; on a profile row (age, height) nobody leads, so both are.
  const lit = (side: 'a' | 'b') => {
    const mine = side === 'a' ? row.a : row.b;
    const other = side === 'a' ? row.b : row.a;
    if (mine == null) return false;
    if (!compared) return true;
    return row.leader === side || (other == null && row.leader == null);
  };
  const text = (v?: number) => (v == null ? '–' : formatCategory(row.key, v));
  return (
    <View style={styles.row}>
      <View style={styles.line}>
        <Text style={[styles.value, lit('a') ? styles.on : styles.dim]}>{text(row.a)}</Text>
        <Text style={styles.rowLabel}>{LABELS[row.key] ?? row.label}</Text>
        <Text style={[styles.value, { textAlign: 'right' }, lit('b') ? styles.on : styles.dim]}>{text(row.b)}</Text>
      </View>
      <View style={styles.bars}>
        <View style={styles.half}>
          {row.a != null ? <View style={[styles.fill, { flex: barShare(row.a, max), alignSelf: 'flex-end', backgroundColor: lit('a') ? theme.brand : withAlpha(theme.brand, 0.4) }]} /> : null}
        </View>
        <View style={styles.half}>
          {row.b != null ? <View style={[styles.fill, { flex: barShare(row.b, max), backgroundColor: lit('b') ? palette.chalk : withAlpha(palette.chalk, 0.3) }]} /> : null}
        </View>
      </View>
    </View>
  );
}

const LABELS: Partial<Record<RosterCategoryKey, string>> = { experience: 'Seasons in the league' };

/** The roster as a list to choose from; the other side's player is dimmed and cannot be chosen twice. */
function PlayerList({
  players,
  selected,
  other,
  theme,
  onPick,
  onClose,
}: {
  players: Player[];
  selected: string;
  other: string;
  theme: TeamTheme;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHead}>
        <Text style={styles.sheetTitle}>Choose a player</Text>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
          <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
        </Pressable>
      </View>
      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 6 }}
        renderItem={({ item }) => {
          const taken = item.id === other;
          const on = item.id === selected;
          return (
            <Pressable
              onPress={() => !taken && onPick(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: taken }}
              style={({ pressed }) => [styles.pick, on && { backgroundColor: withAlpha(theme.primary, 0.5) }, taken && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}>
              <View style={[styles.pickFace, { backgroundColor: withAlpha(theme.primary, 0.7) }]}>
                {item.headshot ? <Image source={item.headshot} style={styles.pickPhoto} contentFit="cover" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.pickSub} numberOfLines={1}>
                  {taken ? 'Already picked' : [item.jersey ? `#${item.jersey}` : null, item.positionName ?? item.position, item.age != null ? `${item.age} yrs` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {on ? <Text style={[styles.check, { color: theme.accent }]}>✓</Text> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, paddingHorizontal: 4 },
  card: { gap: 12, padding: 14 },
  heads: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  head: { flex: 1, gap: 4 },
  vs: { fontFamily: fonts.display, fontSize: 16, color: palette.muted, marginTop: 22 },
  face: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  photo: { width: 78, height: 60 },
  initial: { fontFamily: fonts.bodyBold, fontSize: 20, color: palette.chalk },
  name: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: palette.chalk },
  sub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  tally: { textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  tallyOf: { fontFamily: fonts.bodySemi, color: palette.muted },
  note: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  block: { gap: 10 },
  blockTitle: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.muted, paddingTop: 4 },
  row: { gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: palette.muted },
  value: { width: 84, fontFamily: fonts.display, fontSize: 20 },
  on: { color: palette.chalk },
  dim: { color: withAlpha(palette.chalk, 0.45) },
  bars: { flexDirection: 'row', gap: 4 },
  half: { flex: 1, height: 6, flexDirection: 'row', borderRadius: 3, backgroundColor: withAlpha(palette.chalk, 0.06), overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  sheet: { flex: 1, backgroundColor: palette.arena },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 26, color: palette.chalk },
  done: { fontFamily: fonts.bodyBold, fontSize: 16 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md },
  pickFace: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pickPhoto: { width: 60, height: 46 },
  pickName: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  pickSub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  check: { fontFamily: fonts.bodyBold, fontSize: 18 },
});
