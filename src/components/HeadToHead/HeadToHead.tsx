import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Expandable } from '../Expandable';
import { useHeadToHead } from '@/hooks';
import type { HeadToHeadGame } from '@/lib/espn';
import { summarizeHeadToHead } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { COLLAPSED } from './constants';

export type H2HTeam = { id: string; abbr: string; logo: string; color: string };

/** Last meetings between two teams. Loads its own data; `a` is the team whose side the results are read from. */
export function HeadToHead({ a, b, delay = 100 }: { a: H2HTeam; b: H2HTeam; delay?: number }) {
  const { data, isPending, error } = useHeadToHead(a.id, b.id);
  return (
    <Animated.View style={styles.wrap}>
      <Text style={styles.title}>Head to head</Text>
      {isPending ? (
        <View style={[styles.card, styles.center]}>
          <ActivityIndicator color={palette.muted} />
        </View>
      ) : error ? (
        <View style={[styles.card, styles.center]}>
          <Text style={styles.empty}>Couldn’t load the meeting history.</Text>
        </View>
      ) : (
        <HeadToHeadCard a={a} b={b} games={data ?? []} />
      )}
    </Animated.View>
  );
}

/** The card itself: record, scoring, and the list of meetings (newest first, from `a`'s side). */
export function HeadToHeadCard({ a, b, games }: { a: H2HTeam; b: H2HTeam; games: HeadToHeadGame[] }) {
  const [all, setAll] = useState(false);
  if (games.length === 0) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.empty}>No recent meetings between these teams.</Text>
      </View>
    );
  }

  const s = summarizeHeadToHead(games);
  const leader = s.wins === s.losses ? null : s.wins > s.losses ? a : b;
  const first = games.slice(0, COLLAPSED);
  const rest = games.slice(COLLAPSED);
  const streakTeam = s.streak ? (s.streak.result === 'W' ? a : b) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.sub}>
        Last {s.played} meeting{s.played === 1 ? '' : 's'}
      </Text>
      <View style={styles.record}>
        <Image source={a.logo} style={styles.logo} contentFit="contain" />
        <Text style={[styles.wins, { color: a.color }]}>{s.wins}</Text>
        <Text style={styles.dash}>–</Text>
        <Text style={[styles.wins, { color: b.color }]}>{s.losses}</Text>
        <Image source={b.logo} style={styles.logo} contentFit="contain" />
      </View>
      <View style={styles.bar}>
        <View style={{ flex: Math.max(s.wins, 0.0001), backgroundColor: a.color }} />
        <View style={{ flex: Math.max(s.losses, 0.0001), backgroundColor: b.color }} />
      </View>
      <Text style={styles.headline}>
        {leader ? `${leader.abbr} leads the series` : 'Series is level'}
        {streakTeam && s.streak && s.streak.count > 1 ? ` · ${streakTeam.abbr} won ${s.streak.count} straight` : ''}
      </Text>
      <Text style={styles.avg}>
        Average score {a.abbr} {s.avgFor.toFixed(1)} · {b.abbr} {s.avgAgainst.toFixed(1)}
      </Text>

      <View style={styles.list}>
        {first.map((g) => (
          <MeetingRow key={g.id} g={g} a={a} b={b} />
        ))}
        {rest.length > 0 && (
          <Expandable open={all}>
            {rest.map((g) => (
              <MeetingRow key={g.id} g={g} a={a} b={b} />
            ))}
          </Expandable>
        )}
      </View>

      {games.length > COLLAPSED && (
        <Pressable onPress={() => setAll((v) => !v)} accessibilityRole="button" hitSlop={8} style={styles.toggle}>
          <Text style={styles.toggleText}>{all ? 'Show fewer' : `Show all ${games.length}`}</Text>
        </Pressable>
      )}
    </View>
  );
}

function MeetingRow({ g, a, b }: { g: HeadToHeadGame; a: H2HTeam; b: H2HTeam }) {
  const winner = g.result === 'W' ? a : b;
  const when = new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: g.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${winner.abbr} won ${Math.max(g.teamScore, g.opponentScore)} to ${Math.min(g.teamScore, g.opponentScore)}, ${when}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Text style={styles.date}>{when}</Text>
      <Text style={styles.place}>{g.home ? `${a.abbr} home` : `${b.abbr} home`}</Text>
      <Text style={[styles.score, { color: winner.color }]}>
        {winner.abbr} {Math.max(g.teamScore, g.opponentScore)}–{Math.min(g.teamScore, g.opponentScore)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), padding: 14, gap: 8 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 72 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: palette.muted },
  sub: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted, textAlign: 'center' },
  record: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logo: { width: 40, height: 40 },
  wins: { fontFamily: fonts.display, fontSize: 44, minWidth: 40, textAlign: 'center' },
  dash: { fontFamily: fonts.display, fontSize: 30, color: palette.muted },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  headline: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk, textAlign: 'center', marginTop: 4 },
  avg: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, textAlign: 'center' },
  list: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  date: { width: 104, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  place: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  score: { fontFamily: fonts.bodyBold, fontSize: 14 },
  toggle: { alignSelf: 'center', paddingVertical: 4 },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
});
