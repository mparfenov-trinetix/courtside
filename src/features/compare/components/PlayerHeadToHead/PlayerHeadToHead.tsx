import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Skeleton, SkeletonGroup } from '@/components';
import { usePlayerSeasonLogs } from '@/hooks';
import { seasonLabel } from '@/lib/espn';
import { meetingsSummary, playerHeadToHead, type PlayerMeeting } from '@/lib/league';
import { fonts, palette, radius, surfaces, textStyle, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

type Who = { id: string; name: string };

/** How many of their latest meetings are listed. */
const SHOWN = 5;

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const last = (name: string) => name.trim().split(/\s+/).slice(-1)[0];

/**
 * The two players against each other: their last games in which both played for opposite teams (over the last three seasons, or the three that end at `season`, regular
 * season and playoffs, All-Star Games left out), each with the two players' points, rebounds and assists and the game's score, the higher scorer lit. A line on top says who
 * won more of them and what each averaged. Nothing to list is said in words, not hidden: it is an answer too.
 */
export function PlayerHeadToHead({ a, b, aColor, bColor, season }: { a: Who; b: Who; aColor: string; bColor: string; /** A past season the comparison is about: the three seasons end there, not now. */ season?: number }) {
  const logsA = usePlayerSeasonLogs(a.id, 3, season);
  const logsB = usePlayerSeasonLogs(b.id, 3, season);
  const window = season ? `the three seasons to ${seasonLabel(season)}` : 'the last three seasons';
  const loading = [...logsA, ...logsB].some((q) => q.isLoading);
  const all = playerHeadToHead(
    logsA.flatMap((q) => q.data ?? []),
    logsB.flatMap((q) => q.data ?? []),
  );
  const shown = all.slice(0, SHOWN);
  const sum = meetingsSummary(all);

  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Head to head</Text>
      <View style={styles.card}>
        {loading ? (
          <SkeletonGroup>
            <Skeleton height={16} width={160} style={{ marginBottom: 14 }} />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={48} radius={radius.md} style={{ marginBottom: 8 }} />
            ))}
          </SkeletonGroup>
        ) : shown.length === 0 ? (
          <Text style={styles.empty}>They have not played against each other in {window}.</Text>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={[styles.record, styles.recordLeft, { color: aColor }]}>{sum.winsA}</Text>
              <View style={styles.summaryMid}>
                <Text style={styles.summaryLabel}>{sum.games === 1 ? 'meeting' : `last ${sum.games} meetings`}</Text>
                <Text style={styles.avg}>
                  {sum.a.pts.toFixed(1)} · {sum.b.pts.toFixed(1)} points
                </Text>
              </View>
              <Text style={[styles.record, styles.recordRight, { color: bColor }]}>{sum.winsB}</Text>
            </View>
            {shown.map((m, i) => (
              <Meeting key={m.gameId} m={m} aColor={aColor} bColor={bColor} aName={last(a.name)} bName={last(b.name)} first={i === 0} />
            ))}
            {all.length > SHOWN && <Text style={styles.more}>Latest {SHOWN} of {all.length} games in {window}</Text>}
          </>
        )}
      </View>
    </Animated.View>
  );
}

function Meeting({ m, aColor, bColor, aName, bName, first }: { m: PlayerMeeting; aColor: string; bColor: string; aName: string; bName: string; first: boolean }) {
  const aWon = m.scoreA > m.scoreB;
  const aMore = m.a.pts > m.b.pts;
  const bMore = m.b.pts > m.a.pts;
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: m.gameId } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !first && styles.border, pressed && { opacity: 0.7 }]}
      accessibilityLabel={`${day(m.date)}. ${aName} ${m.a.pts} points, ${m.a.reb} rebounds, ${m.a.ast} assists. ${bName} ${m.b.pts} points, ${m.b.reb} rebounds, ${m.b.ast} assists. ${m.teamA} ${m.scoreA}, ${m.teamB} ${m.scoreB}.`}>
      <View style={styles.side}>
        <Text style={[styles.pts, { color: aMore ? aColor : withAlpha(palette.chalk, 0.55) }]}>{m.a.pts}</Text>
        <Text style={styles.sub}>
          {m.a.reb} reb · {m.a.ast} ast
        </Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.date}>
          {day(m.date)}
          {m.playoffs ? ' · Playoffs' : ''}
        </Text>
        <Text style={styles.score}>
          <Text style={aWon ? styles.winner : styles.loser}>{m.teamA} {m.scoreA}</Text>
          <Text style={styles.dash}> – </Text>
          <Text style={aWon ? styles.loser : styles.winner}>{m.scoreB} {m.teamB}</Text>
        </Text>
      </View>
      <View style={[styles.side, styles.sideRight]}>
        <Text style={[styles.pts, { color: bMore ? bColor : withAlpha(palette.chalk, 0.55) }]}>{m.b.pts}</Text>
        <Text style={styles.sub}>
          {m.b.reb} reb · {m.b.ast} ast
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { ...textStyle.sectionLabel, paddingHorizontal: 20, marginBottom: 8 },
  card: { marginHorizontal: 16, borderRadius: 22, padding: 16, backgroundColor: surfaces.card },
  empty: { fontFamily: fonts.body, fontSize: 14, color: palette.muted, textAlign: 'center', paddingVertical: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  // The two big numbers sit on the card's own edges, in line with the points under them.
  record: { fontFamily: fonts.display, fontSize: 40, minWidth: 84 },
  recordLeft: { textAlign: 'left' },
  recordRight: { textAlign: 'right' },
  summaryMid: { alignItems: 'center' },
  summaryLabel: { ...textStyle.sectionLabel },
  avg: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  side: { width: 84 },
  sideRight: { alignItems: 'flex-end' },
  pts: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28 },
  sub: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  mid: { flex: 1, alignItems: 'center', gap: 2 },
  date: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  score: { fontFamily: fonts.bodyBold, fontSize: 13 },
  winner: { color: palette.chalk },
  loser: { color: withAlpha(palette.chalk, 0.5), fontFamily: fonts.bodySemi },
  dash: { color: palette.muted },
  more: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, textAlign: 'center', marginTop: 6 },
});
