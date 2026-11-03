import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { BoxScoreTeam, Play } from '@/lib/espn';
import { periodLabel, type Flow, type Run } from '@/lib/game';
import { fonts, palette, withAlpha } from '@/lib/theme';

const when = (play: Play) => `${periodLabel(play.period)} ${play.clockText}`;

function runWindow(run: Run) {
  const a = run.start;
  const b = run.end;
  return a.period === b.period
    ? `${periodLabel(a.period)} ${a.clockText}–${b.clockText}`
    : `${periodLabel(a.period)} ${a.clockText} – ${periodLabel(b.period)} ${b.clockText}`;
}

type Tile = { key: string; label: string; value: string; sub?: string; color: string; wide?: boolean };

/** The story of the game in a handful of tiles: runs, biggest leads, how often it swung. */
export function KeyMoments({
  flow,
  away,
  home,
  awayColor,
  homeColor,
}: {
  flow: Flow;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  awayColor: string;
  homeColor: string;
}) {
  const tiles: Tile[] = [];
  const awayAbbr = away.team.abbreviation;
  const homeAbbr = home.team.abbreviation;

  if (flow.bestAwayRun && flow.bestAwayRun.points >= 6) {
    tiles.push({ key: 'runA', label: `${awayAbbr} best run`, value: `${flow.bestAwayRun.points}–0`, sub: runWindow(flow.bestAwayRun), color: awayColor });
  }
  if (flow.bestHomeRun && flow.bestHomeRun.points >= 6) {
    tiles.push({ key: 'runH', label: `${homeAbbr} best run`, value: `${flow.bestHomeRun.points}–0`, sub: runWindow(flow.bestHomeRun), color: homeColor });
  }
  if (flow.largestAway) {
    tiles.push({ key: 'leadA', label: `${awayAbbr} biggest lead`, value: `+${flow.largestAway.margin}`, sub: when(flow.largestAway.play), color: awayColor });
  }
  if (flow.largestHome) {
    tiles.push({ key: 'leadH', label: `${homeAbbr} biggest lead`, value: `+${flow.largestHome.margin}`, sub: when(flow.largestHome.play), color: homeColor });
  }
  const oneSided = flow.leadChanges === 0 && flow.ties === 0 && (!flow.largestHome !== !flow.largestAway);
  if (oneSided) {
    // Nobody ever trailed the other side: one line says it better than two zeros.
    const homeLed = !!flow.largestHome;
    tiles.push({
      key: 'wire',
      label: 'Wire to wire',
      value: `${(homeLed ? home : away).team.abbreviation} never trailed`,
      color: homeLed ? homeColor : awayColor,
      wide: true,
    });
  } else {
    tiles.push({ key: 'lc', label: 'Lead changes', value: String(flow.leadChanges), color: palette.chalk });
    tiles.push({ key: 'ties', label: 'Times tied', value: String(flow.ties), color: palette.chalk });
  }

  const last = flow.lastLeadChange;
  if (tiles.length <= 2 && !last) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Key moments</Text>
      <View style={styles.grid}>
        {tiles.map((t, i) => (
          <Animated.View key={t.key} entering={FadeInDown.delay(i * 40).duration(240)} style={[styles.tile, t.wide && styles.tileWide]}>
            <Text style={styles.label}>{t.label}</Text>
            <Text style={[styles.value, t.wide && styles.valueWide, { color: t.color }]}>{t.value}</Text>
            {t.sub ? <Text style={styles.sub}>{t.sub}</Text> : null}
          </Animated.View>
        ))}
      </View>
      {last && (
        <Animated.View entering={FadeInDown.delay(tiles.length * 40).duration(240)} style={styles.last}>
          <Text style={styles.label}>Last lead change · {when(last)}</Text>
          <Text style={styles.lastText} numberOfLines={2}>
            {last.text.replace(/\s*\n\s*/g, ' ').trim()}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 14 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.6%', flexGrow: 1, padding: 12, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.05), gap: 1 },
  tileWide: { width: '100%' },
  valueWide: { fontSize: 24 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  value: { fontFamily: fonts.display, fontSize: 30 },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  last: { marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.05), gap: 4 },
  lastText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
});
