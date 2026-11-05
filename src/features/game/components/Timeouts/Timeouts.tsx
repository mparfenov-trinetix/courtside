import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { FlashOverlay, Tick } from '@/components';
import type { BoxScoreTeam, Play } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

/** NBA teams get seven timeouts per game. */
const TOTAL = 7;

const isTimeout = (p: Play) => !!p.teamId && /timeout/i.test(p.typeText);
const periodShort = (n: number) => (n <= 4 ? `Q${n}` : `OT${n - 4}`);

/**
 * Timeouts per team. Live: how many each side has left (plus foul and bonus state).
 * Final: how many were used, and in which period. Counts come from the play-by-play,
 * since ESPN only reports "remaining" while a game is in progress.
 */
export function Timeouts({
  away,
  home,
  plays,
  live,
  awayColor,
  homeColor,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  plays: Play[];
  live: boolean;
  awayColor: string;
  homeColor: string;
}) {
  const used = (teamId: string) => plays.filter((p) => isTimeout(p) && p.teamId === teamId);
  const awayUsed = used(away.team.id);
  const homeUsed = used(home.team.id);
  if (plays.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Timeouts</Text>
        <Text style={styles.sub}>{live ? 'Remaining' : 'Used'}</Text>
      </View>
      <View style={styles.card}>
        <TeamRow team={away} color={awayColor} timeouts={awayUsed} live={live} />
        <View style={styles.divider} />
        <TeamRow team={home} color={homeColor} timeouts={homeUsed} live={live} />
      </View>
    </View>
  );
}

function TeamRow({
  team,
  color,
  timeouts,
  live,
}: {
  team: BoxScoreTeam;
  color: string;
  timeouts: Play[];
  live: boolean;
}) {
  const count = timeouts.length;
  const total = Math.max(TOTAL, count);
  // ESPN's live "remaining" is authoritative when present; otherwise infer it from what was used.
  const remaining = live ? Math.max(0, team.timeoutsRemaining ?? total - count) : total - count;

  const byPeriod = new Map<number, number>();
  for (const p of timeouts) byPeriod.set(p.period, (byPeriod.get(p.period) ?? 0) + 1);
  const periods = [...byPeriod.entries()].sort((a, b) => a[0] - b[0]);
  const periodCount = Math.max(4, team.linescores.length);

  return (
    <View style={styles.row}>
      <FlashOverlay radius={14} signature={`${count}-${remaining}-${team.fouls?.team ?? ''}`} />
      <View style={styles.top}>
        <Text style={[styles.abbr, { color }]}>{team.team.abbreviation}</Text>
        <View style={styles.pips}>
          {Array.from({ length: total }, (_, i) => {
            // Live: the first `remaining` pips are lit. Final: the first `count` pips are lit.
            const lit = live ? i < remaining : i < count;
            return (
              <Animated.View
                key={i}
                entering={ZoomIn.delay(i * 40).duration(220)}
                style={[styles.pip, lit ? { backgroundColor: color, borderColor: color } : { borderColor: withAlpha(palette.chalk, 0.25) }]}
              />
            );
          })}
        </View>
        <View style={styles.count}>
          <Tick style={styles.countNum} value={live ? remaining : count} />
          <Text style={styles.countOf}>/ {total}</Text>
        </View>
      </View>

      {!live && (
        <Animated.View style={styles.periods}>
          {Array.from({ length: periodCount }, (_, i) => i + 1).map((n) => (
            <Text key={n} style={[styles.period, byPeriod.has(n) && { color: palette.chalk }]}>
              {periodShort(n)} <Text style={styles.periodNum}>{byPeriod.get(n) ?? 0}</Text>
            </Text>
          ))}
          {periods.length === 0 && <Text style={styles.period}>None called</Text>}
        </Animated.View>
      )}

      {live && team.fouls && (
        <Animated.View style={styles.periods}>
          <Text style={[styles.period, { color: palette.chalk }]}>
            Fouls this period <Text style={styles.periodNum}>{team.fouls.period}</Text>
          </Text>
          {team.fouls.bonus ? (
            <Text style={styles.bonus}>BONUS</Text>
          ) : (
            <Text style={styles.period}>{team.fouls.toGive} to bonus</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  card: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(palette.chalk, 0.1) },
  row: { padding: 14, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  abbr: { width: 44, fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.4 },
  pips: { flex: 1, flexDirection: 'row', gap: 7 },
  pip: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 3, minWidth: 44, justifyContent: 'flex-end' },
  countNum: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  countOf: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  periods: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 56 },
  period: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  periodNum: { fontFamily: fonts.bodyBold },
  bonus: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#FBBF24',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: withAlpha('#FBBF24', 0.16),
  },
});
