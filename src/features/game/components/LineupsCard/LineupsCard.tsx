import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Collapsible } from '@/components';
import type { BoxScorePlayer } from '@/lib/espn';
import { sumLineups, type QuarterStats } from '@/lib/game';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { WIN, LOSS } from './constants';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** The five-man groups that played the most, with the score while they were on the floor. */
export function LineupsCard({
  derived,
  teamId,
  players,
  periods,
}: {
  derived: QuarterStats;
  teamId: string;
  players: BoxScorePlayer[];
  periods: number[] | null;
}) {
  const byId = new Map(players.map((p) => [p.id, p]));
  // Ignore cameo groups: under a minute together says nothing.
  const lineups = sumLineups(derived, periods, teamId)
    .filter((l) => l.sec >= 60)
    .slice(0, 6);
  if (lineups.length === 0) return null;

  return (
    <Collapsible title="Lineups" hint={`${lineups.length} most-used five-man groups`}>
      <View style={styles.list}>
        {lineups.map((l) => {
          const net = l.pf - l.pa;
          return (
            <Animated.View key={l.ids.join('|')} style={styles.row}>
              <View style={styles.faces}>
                {l.ids.map((id, k) => {
                  const p = byId.get(id);
                  return (
                    <View key={id} style={[styles.face, { marginLeft: k === 0 ? 0 : -8 }]}>
                      {p?.headshot ? (
                        <Image source={p.headshot} style={styles.faceImg} contentFit="cover" />
                      ) : (
                        <Text style={styles.initial}>{(p?.shortName ?? '?').charAt(0)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.names}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {l.ids.map((id) => (byId.get(id)?.shortName ?? '?').split(' ').pop()).join(' · ')}
                </Text>
                <Text style={styles.sub}>
                  {mmss(l.sec)} together · {l.pf}–{l.pa}
                </Text>
              </View>
              <Text style={[styles.net, { color: net > 0 ? WIN : net < 0 ? LOSS : palette.muted }]}>
                {net > 0 ? '+' : ''}
                {net}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 14, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  faces: { flexDirection: 'row', width: 5 * 24 - 4 * 8 + 4 },
  face: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: withAlpha(palette.chalk, 0.12),
    // A faint light edge where the faces overlap; a dark ring (the page color) read as a black outline on the card.
    borderWidth: 1,
    borderColor: withAlpha(palette.chalk, 0.28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceImg: { width: 32, height: 28 },
  initial: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  names: { flex: 1, marginLeft: 12 },
  nameText: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  net: { fontFamily: fonts.display, fontSize: 22, minWidth: 40, textAlign: 'right' },
});
