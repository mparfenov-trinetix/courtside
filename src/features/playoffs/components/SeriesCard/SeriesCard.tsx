import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSpotlight } from '@/components';
import { ROUND_NAMES, type Series, type SeriesTeam } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';

const GOLD = '#FBBF24';

/** What to show next to each team: games won for a series, the score for a single game. */
export function sideScores(s: Series): { top?: number; bottom?: number; played: boolean } {
  const g = s.games[0];
  if (s.bestOf === 1) {
    if (!g?.completed || g.home.score == null || g.away.score == null) return { played: false };
    const topHome = g.home.teamId === s.top.teamId;
    return { top: topHome ? g.home.score : g.away.score, bottom: topHome ? g.away.score : g.home.score, played: true };
  }
  return { top: s.topWins, bottom: s.bottomWins, played: s.topWins + s.bottomWins > 0 };
}

function TeamLine({ team, score, won, lost, mine, big }: { team: SeriesTeam; score?: number; won: boolean; lost: boolean; mine: boolean; big?: boolean }) {
  return (
    <View style={[styles.line, big && styles.lineBig]}>
      <Text style={styles.seed}>{team.seed ?? ''}</Text>
      {team.logo ? <Image source={team.logo} style={[styles.logo, big && styles.logoBig, lost && { opacity: 0.45 }]} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={[styles.abbr, big && styles.abbrBig, won && { color: palette.chalk }, lost && { color: withAlpha(palette.chalk, 0.45) }]} numberOfLines={1}>
        {team.abbr}{mine ? ' ★' : ''}
      </Text>
      <Text style={[styles.score, big && styles.scoreBig, won && { color: palette.chalk }, lost && { color: withAlpha(palette.chalk, 0.4) }]}>{score ?? ''}</Text>
    </View>
  );
}

/** Full-width card for the Rounds view: both teams, the series score and where it stands. */
export function SeriesCard({ series, favoriteTeamId, onPress }: { series: Series; favoriteTeamId?: string | null; onPress: () => void }) {
  const sc = sideScores(series);
  const lit = useSpotlight();
  // The series of the game you came from: both its teams are in the spotlight.
  const spot = lit(series.top.teamId) && lit(series.bottom.teamId);
  const mine = series.top.teamId === favoriteTeamId || series.bottom.teamId === favoriteTeamId;
  const done = !!series.winnerId;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${series.top.abbr} versus ${series.bottom.abbr}. ${series.status}`}
      style={({ pressed }) => [styles.card, mine && { borderColor: withAlpha(palette.chalk, 0.4) }, spot && styles.spot, pressed && { opacity: 0.75 }]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{series.title ?? (series.conference ? (series.conference === 'east' ? 'East' : 'West') : ROUND_NAMES[series.round])}</Text>
        <Text style={[styles.status, done && { color: GOLD }]}>{series.status}</Text>
      </View>
      <TeamLine big team={series.top} score={sc.top} won={done && series.winnerId === series.top.teamId} lost={done && series.winnerId !== series.top.teamId} mine={series.top.teamId === favoriteTeamId} />
      <TeamLine big team={series.bottom} score={sc.bottom} won={done && series.winnerId === series.bottom.teamId} lost={done && series.winnerId !== series.bottom.teamId} mine={series.bottom.teamId === favoriteTeamId} />
      <Text style={styles.more}>{series.games.length} game{series.games.length === 1 ? '' : 's'} · tap for results</Text>
    </Pressable>
  );
}

export const MINI_W = 148;
export const MINI_H = 62;

/** Compact card for the drawn bracket. */
export function MiniSeries({ series, favoriteTeamId, onPress, style }: { series: Series; favoriteTeamId?: string | null; onPress: () => void; style?: object }) {
  const sc = sideScores(series);
  const lit = useSpotlight();
  const spot = lit(series.top.teamId) && lit(series.bottom.teamId);
  const done = !!series.winnerId;
  const mine = series.top.teamId === favoriteTeamId || series.bottom.teamId === favoriteTeamId;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${series.top.abbr} versus ${series.bottom.abbr}. ${series.status}`}
      style={({ pressed }) => [styles.mini, mine && { borderColor: withAlpha(palette.chalk, 0.45) }, spot && styles.spot, pressed && { opacity: 0.75 }, style]}>
      <TeamLine team={series.top} score={sc.top} won={done && series.winnerId === series.top.teamId} lost={done && series.winnerId !== series.top.teamId} mine={series.top.teamId === favoriteTeamId} />
      <View style={styles.sep} />
      <TeamLine team={series.bottom} score={sc.bottom} won={done && series.winnerId === series.bottom.teamId} lost={done && series.winnerId !== series.bottom.teamId} mine={series.bottom.teamId === favoriteTeamId} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.05), borderWidth: 1, borderColor: 'transparent', marginBottom: 10, gap: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.muted },
  status: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  more: { fontFamily: fonts.body, fontSize: 11, color: withAlpha(palette.chalk, 0.4), marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 28 },
  lineBig: { height: 40, gap: 10 },
  seed: { width: 14, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  logo: { width: 20, height: 20 },
  logoBig: { width: 30, height: 30 },
  abbr: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: withAlpha(palette.chalk, 0.85) },
  abbrBig: { fontSize: 17 },
  score: { fontFamily: fonts.display, fontSize: 18, color: withAlpha(palette.chalk, 0.75), minWidth: 22, textAlign: 'right' },
  scoreBig: { fontSize: 30, minWidth: 40 },
  mini: { width: MINI_W, height: MINI_H, paddingHorizontal: 8, borderRadius: 12, backgroundColor: withAlpha('#FFFFFF', 0.07), borderWidth: 1, borderColor: 'transparent', justifyContent: 'center' },
  spot: { borderColor: withAlpha(palette.chalk, 0.9), backgroundColor: withAlpha('#FFFFFF', 0.14) },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(palette.chalk, 0.12) },
});
