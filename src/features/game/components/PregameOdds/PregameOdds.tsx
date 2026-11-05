import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Pregame, SideOdds } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { ODDS_NOTE } from './constants';

type Side = { abbr: string; logo: string; color: string };

const american = (n?: number) => (n == null ? '' : n > 0 ? `+${n}` : String(n));

/** Before tip-off: ESPN's win chance for each side and, when a book has posted a line, its prices. */
export function PregameOdds({ away, home, pregame }: { away: Side; home: Side; pregame: Pick<Pregame, 'winProb' | 'odds'> }) {
  const { winProb, odds } = pregame;
  if (!winProb && !odds) return null;
  // Rounded so the two always add up to 100.
  const awayPct = winProb ? Math.round(winProb.away) : 0;
  const homePct = 100 - awayPct;

  return (
    <Animated.View style={styles.wrap}>
      {winProb && (
        <>
          <Text style={styles.title}>Win probability</Text>
          <View style={styles.card}>
            <View style={styles.labels}>
              <Text style={[styles.pct, { color: away.color }]}>
                {away.abbr} {awayPct}%
              </Text>
              <Text style={[styles.pct, { color: home.color }]}>
                {homePct}% {home.abbr}
              </Text>
            </View>
            <View style={styles.bar}>
              <View style={{ flex: Math.max(winProb.away, 1), backgroundColor: away.color }} />
              <View style={{ flex: Math.max(winProb.home, 1), backgroundColor: home.color }} />
            </View>
            <Text style={styles.note}>ESPN matchup predictor</Text>
          </View>
        </>
      )}

      {odds && (
        <>
          <Text style={[styles.title, winProb && { marginTop: 18 }]}>Odds · {odds.provider}</Text>
          <View style={styles.card}>
            <View style={styles.prices}>
              <Price side={away} odds={odds.away} />
              <View style={styles.middle}>
                {odds.details ? <Line label="Spread" value={odds.details} /> : null}
                {odds.overUnder != null ? <Line label="Total" value={String(odds.overUnder)} /> : null}
              </View>
              <Price side={home} odds={odds.home} />
            </View>
            <Text style={styles.note}>{ODDS_NOTE}</Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

function Price({ side, odds }: { side: Side; odds: SideOdds }) {
  return (
    <View style={styles.price}>
      <Image source={side.logo} style={styles.logo} contentFit="contain" />
      <Text style={[styles.decimal, { color: odds.favorite ? palette.chalk : withAlpha(palette.chalk, 0.75) }]}>
        {odds.decimal != null ? odds.decimal.toFixed(2) : '–'}
      </Text>
      <Text style={styles.moneyline}>{american(odds.moneyLine) || side.abbr}</Text>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), padding: 14, gap: 10 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  pct: { fontFamily: fonts.display, fontSize: 28 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  prices: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { alignItems: 'center', gap: 2, minWidth: 80 },
  logo: { width: 30, height: 30 },
  decimal: { fontFamily: fonts.display, fontSize: 32 },
  moneyline: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  middle: { flex: 1, alignItems: 'center', gap: 6 },
  line: { alignItems: 'center' },
  lineLabel: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  lineValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
});
