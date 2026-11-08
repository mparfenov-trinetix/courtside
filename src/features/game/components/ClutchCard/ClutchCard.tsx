import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BoxScorePlayer, Play } from '@/lib/espn';
import { CLUTCH_MARGIN, CLUTCH_SECONDS, clutchLines } from '@/lib/game';
import { fonts, palette, withAlpha, surfaces, textStyle } from '@/lib/theme';
import { openDetail } from '@/navigation';

import { SHOWN } from './constants';

type Side = { teamId: string; abbr: string; color: string; players: BoxScorePlayer[] };

/**
 * Who scored when it was close: the last five minutes of the fourth quarter and overtime, with the game within five points
 * before the shot, rebuilt from the play-by-play. Hidden until a game gets there.
 */
export function ClutchCard({ plays, away, home }: { plays: Play[]; away: Side; home: Side }) {
  const lines = clutchLines(plays);
  if (lines.length === 0) return null;

  const sides = [away, home];
  const rows = lines
    .filter((l) => l.pts > 0)
    .sort((a, b) => b.pts - a.pts || b.fgm - a.fgm)
    .slice(0, SHOWN)
    .map((l) => {
      const side = sides.find((s) => s.teamId === l.teamId);
      const player = side?.players.find((p) => p.id === l.playerId);
      return { l, side, player };
    })
    .filter((r) => r.side && r.player);
  if (rows.length === 0) return null;

  // Each team's points in clutch time, side by side.
  const total = (teamId: string) => lines.filter((l) => l.teamId === teamId).reduce((t, l) => t + l.pts, 0);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Clutch time</Text>
      <View style={styles.card}>
        <View style={styles.totals}>
          {sides.map((s) => (
            <View key={s.teamId} style={styles.total}>
              <Text style={[styles.totalValue, { color: s.color }]}>{total(s.teamId)}</Text>
              <Text style={styles.totalLabel}>{s.abbr} clutch pts</Text>
            </View>
          ))}
        </View>
        {rows.map(({ l, side, player }) => (
          <Pressable
            key={l.playerId}
            onPress={() => openDetail({ pathname: '/player/[id]', params: { id: l.playerId, teamId: l.teamId } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={[styles.face, { backgroundColor: withAlpha(side!.color, 0.25) }]}>
              {player!.headshot ? <Image source={player!.headshot} style={styles.headshot} contentFit="cover" transition={100} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {player!.shortName || player!.name}
              </Text>
              <Text style={styles.line}>
                {side!.abbr} · {l.fgm}-{l.fga} FG{l.fta > 0 ? ` · ${l.ftm}-${l.fta} FT` : ''}
              </Text>
            </View>
            <Text style={[styles.pts, { color: side!.color }]}>{l.pts}</Text>
          </Pressable>
        ))}
        <Text style={styles.note}>
          Last {CLUTCH_SECONDS / 60} minutes of the 4th or overtime, game within {CLUTCH_MARGIN}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 14 },
  title: { ...textStyle.sectionLabel, marginBottom: 8 },
  card: { borderRadius: 16, backgroundColor: surfaces.card, overflow: 'hidden', paddingBottom: 6 },
  totals: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  total: { flex: 1, alignItems: 'center' },
  totalValue: { fontFamily: fonts.display, fontSize: 34 },
  totalLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 14 },
  face: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  headshot: { width: 48, height: 40 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  line: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  pts: { fontFamily: fonts.display, fontSize: 26 },
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, textAlign: 'center', paddingTop: 6, paddingBottom: 6 },
});
