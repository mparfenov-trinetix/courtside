import { StyleSheet, Text, View } from 'react-native';

import Animated from 'react-native-reanimated';

import { ARRIVE, Card, SectionLabel } from '@/components';
import { useFutures } from '@/hooks';
import { marketLabel, type FuturesMarket, type MarketKey } from '@/lib/espn';
import { ordinal } from '@/lib/league';
import { fontSize, fonts, palette, radius, space } from '@/lib/theme';

const ROWS: MarketKey[] = ['title', 'east', 'west'];

/**
 * What the sportsbook thinks of the team: its odds to win the title and its conference, the chance those odds imply and where the team
 * ranks among the favorites. It is the book's opinion, not ESPN's. Hidden when the team is not in the markets (there are none in the offseason).
 */
export function TitleOdds({ teamId, accent }: { teamId: string; accent: string }) {
  // Only the team markets: the award candidates' records are forty requests this card has no use for.
  const { data } = useFutures(false);
  const rows = (data ?? []).flatMap((market) => {
    if (!ROWS.includes(market.key)) return [];
    const at = market.entries.findIndex((e) => e.kind === 'team' && e.id === teamId);
    return at < 0 ? [] : [{ market, entry: market.entries[at], rank: at + 1 }];
  });
  if (rows.length === 0) return null;
  return (
    <Animated.View entering={ARRIVE} style={styles.wrap}>
      <SectionLabel>Odds</SectionLabel>
      <Card padded={false}>
        {rows.map(({ market, entry, rank }, i) => (
          <OddsRow key={market.key} market={market} line={entry.line} chance={entry.chance} rank={rank} accent={accent} last={i === rows.length - 1} />
        ))}
      </Card>
      <Text style={styles.note}>Sportsbook odds (DraftKings, via ESPN), as a chance with the margin removed.</Text>
    </Animated.View>
  );
}

function OddsRow({ market, line, chance, rank, accent, last }: { market: FuturesMarket; line: string; chance: number; rank: number; accent: string; last: boolean }) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{marketLabel(market.key)}</Text>
        <Text style={styles.sub}>{rank === 1 ? 'Favorite' : `${ordinal(rank)} favorite`}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, chance * 100))}%`, backgroundColor: accent }]} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.chance, { color: accent }]}>{chance >= 0.1 ? Math.round(chance * 100) : (chance * 100).toFixed(1)}%</Text>
        <Text style={styles.line}>{line}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.md },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted, marginBottom: space.sm },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill },
  right: { alignItems: 'flex-end', minWidth: 64 },
  chance: { fontFamily: fonts.display, fontSize: fontSize.display },
  line: { fontFamily: fonts.bodySemi, fontSize: fontSize.small, color: palette.muted },
  note: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted },
});
