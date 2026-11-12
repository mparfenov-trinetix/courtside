import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EmptyState, ListSkeleton, SectionLabel } from '@/components';
import { useFutures, useTeams } from '@/hooks';
import { marketLabel, type FuturesEntry, type FuturesMarket, type Team } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

/** How many names each market lists: the favorites, the rest are long shots. */
const SHOWN = 5;
/** The order the markets come in: the player awards (the title odds are a page of Team Leaders). */
const ORDER = ['mvp', 'roy', 'dpoy', 'mip', 'sixth', 'clutch', 'coach'];

/**
 * The sportsbook's odds for the awards, favorites first: a chance (the odds with the book's margin removed) and the
 * American line. A tap opens the player's page or the team. The book's opinion, not ESPN's, so it moves with the news.
 */
export function AwardOdds() {
  const insets = useSafeAreaInsets();
  const { data, isPending } = useFutures();
  const { data: teams } = useTeams();
  if (isPending) return <ListSkeleton count={6} />;
  const markets = ORDER.flatMap((key) => data?.find((m) => m.key === key) ?? []);
  if (markets.length === 0) {
    return <EmptyState title="No award odds right now" text="ESPN lists no player award markets at the moment (the sportsbook opens and closes them, and the MVP market was there earlier today). They appear here as soon as ESPN lists them again." placement="center" />;
  }
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.lg }}>
      {markets.map((market) => (
        <Market key={market.key} market={market} teams={teams ?? []} />
      ))}
      <Text style={styles.note}>Sportsbook odds (DraftKings, via ESPN), shown as a chance with the margin removed. Not advice. The title odds are on Team Leaders.</Text>
      {markets.length < ORDER.length && (
        <Text style={styles.note}>ESPN lists only the awards the sportsbook has opened so far. The rest appear here as they are posted.</Text>
      )}
    </ScrollView>
  );
}

function Market({ market, teams }: { market: FuturesMarket; teams: Team[] }) {
  return (
    <View style={{ gap: space.sm }}>
      <SectionLabel style={{ paddingHorizontal: space.xs }}>{marketLabel(market.key)}</SectionLabel>
      <Card padded={false}>
        {market.entries.slice(0, SHOWN).map((entry, i) => (
          <Row key={entry.id} entry={entry} team={entry.kind === 'team' ? teams.find((t) => t.id === entry.id) : teams.find((t) => t.id === entry.teamId)} first={i === 0} lead={market.entries[0].chance} />
        ))}
      </Card>
    </View>
  );
}

function Row({ entry, team, first, lead }: { entry: FuturesEntry; team?: Team; first: boolean; lead: number }) {
  const isTeam = entry.kind === 'team';
  const name = isTeam ? team?.displayName : entry.name;
  // A coach's id is not a player's: his row does not open a page.
  const canOpen = isTeam ? !!team : !!entry.headshot;
  const onPress = () => {
    if (isTeam && team) openDetail(`/team/${team.id}` as never);
    else if (!isTeam) openDetail({ pathname: '/player/[id]', params: { id: entry.id, teamId: entry.teamId ?? '' } });
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={!canOpen}
      accessibilityRole="button"
      accessibilityLabel={`${name ?? 'Unknown'}, ${Math.round(entry.chance * 100)} percent, ${entry.line}`}
      style={({ pressed }) => [styles.row, !first && styles.border, pressed && { backgroundColor: surfaces.raised }]}>
      <View style={styles.avatar}>
        {isTeam ? (
          team ? <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" /> : null
        ) : entry.headshot ? (
          <Image source={entry.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name ?? '—'}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(3, (entry.chance / lead) * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.chance}>{entry.chance >= 0.1 ? Math.round(entry.chance * 100) : (entry.chance * 100).toFixed(1)}%</Text>
        <Text style={styles.line}>{entry.line}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  headshot: { width: 44, height: 44 },
  logo: { width: 30, height: 30 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  track: { height: 4, borderRadius: radius.pill, backgroundColor: withAlpha(palette.chalk, 0.08), marginTop: space.xs, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: palette.gold },
  right: { alignItems: 'flex-end', minWidth: 56 },
  chance: { fontFamily: fonts.display, fontSize: fontSize.title, color: palette.chalk },
  line: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted },
  note: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted, textAlign: 'center' },
});
